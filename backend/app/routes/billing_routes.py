from flask import Blueprint, request, jsonify, g
from datetime import datetime
from app.models import db, Bill, BillItem, Payment, Visit, Patient
from app.decorators import jwt_required, role_required
from app.utils import log_audit
from app.utils.mpesa import MPesaClient, generate_etims_payload

billing_bp = Blueprint('billing', __name__)

@billing_bp.route('/bills', methods=['GET'])
@jwt_required
def get_bills():
    status = request.args.get('status', '').strip()
    query = Bill.query

    if status:
        query = query.filter_by(status=status)

    bills = query.order_by(Bill.id.desc()).all()
    return jsonify({'bills': [b.to_dict() for b in bills]}), 200

@billing_bp.route('/visit/<int:visit_id>', methods=['GET'])
@jwt_required
def get_visit_bill(visit_id):
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'error': 'Visit not found'}), 404

    bill = Bill.query.filter_by(visit_id=visit_id).first()
    if not bill:
        return jsonify({'error': 'No bill found for this visit'}), 404

    return jsonify({
        'bill': bill.to_dict(),
        'visit': visit.to_dict(),
        'patient': visit.patient.to_dict() if visit.patient else None
    }), 200

@billing_bp.route('/visit/<int:visit_id>/lab-charge', methods=['POST'])
@jwt_required
@role_required('Receptionist', 'Doctor', 'Cashier', 'Admin')
def add_lab_charge(visit_id):
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'error': 'Visit not found'}), 404

    bill = Bill.query.filter_by(visit_id=visit_id).first()
    if not bill:
        return jsonify({'error': 'No active bill found for this visit'}), 404

    data = request.get_json() or {}
    item_name = data.get('item_name', '').strip()
    unit_price = data.get('unit_price')
    quantity = data.get('quantity', 1)

    if not item_name:
        return jsonify({'error': 'Lab test / service item name is required'}), 400

    try:
        unit_price = float(unit_price)
        if unit_price < 0:
            return jsonify({'error': 'Unit price cannot be negative'}), 400
        quantity = int(quantity)
        if quantity <= 0:
            return jsonify({'error': 'Quantity must be at least 1'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid unit price or quantity format'}), 400

    total_price = unit_price * quantity

    lab_item = BillItem(
        bill_id=bill.id,
        item_type='Lab Charge',
        item_name=item_name,
        quantity=quantity,
        unit_price=unit_price,
        total_price=total_price
    )

    db.session.add(lab_item)
    db.session.flush()

    bill.calculate_total()
    db.session.commit()

    log_audit(
        g.current_user,
        'CREATE',
        'Bill',
        entity_id=bill.id,
        details=f"Added lab charge '{item_name}' (KSh {total_price:,.2f}) to Bill {bill.bill_number}"
    )

    return jsonify({
        'message': 'Lab charge added successfully',
        'bill': bill.to_dict()
    }), 201

@billing_bp.route('/mpesa/stkpush', methods=['POST'])
@jwt_required
@role_required('Cashier', 'Admin')
def trigger_stk_push():
    """
    Triggers Safaricom M-Pesa STK Push prompt to patient's mobile phone number.
    """
    data = request.get_json() or {}
    bill_id = data.get('bill_id')
    phone = data.get('phone', '').strip()
    amount = data.get('amount')

    if not bill_id or not phone or not amount:
        return jsonify({'error': 'bill_id, phone, and amount are required'}), 400

    bill = Bill.query.get(bill_id)
    if not bill:
        return jsonify({'error': 'Bill not found'}), 404

    mpesa = MPesaClient()
    res = mpesa.initiate_stk_push(
        phone_number=phone,
        amount=amount,
        account_reference=bill.bill_number,
        transaction_desc=f"Bill {bill.bill_number}"
    )

    log_audit(
        g.current_user,
        'PAYMENT',
        'Bill',
        entity_id=bill.id,
        details=f"Triggered M-Pesa STK Push of KSh {amount} to {phone} for Bill {bill.bill_number}"
    )

    return jsonify({
        'message': 'M-Pesa STK Push initiated',
        'stk_response': res
    }), 200

@billing_bp.route('/mpesa/callback', methods=['POST'])
def mpesa_callback():
    """
    Safaricom Daraja M-Pesa Async Callback URL
    Handles STK Push response with Idempotency Key validation to prevent duplicate payments.
    """
    data = request.get_json() or {}
    print(f"M-Pesa Callback Payload Received: {data}")

    body = data.get('Body', {}).get('stkCallback', {})
    result_code = body.get('ResultCode')
    checkout_id = body.get('CheckoutRequestID')

    if result_code == 0:
        # Success payment
        meta_items = body.get('CallbackMetadata', {}).get('Item', [])
        mpesa_receipt = None
        amount = 0.0

        for item in meta_items:
            if item.get('Name') == 'MpesaReceiptNumber':
                mpesa_receipt = item.get('Value')
            elif item.get('Name') == 'Amount':
                amount = float(item.get('Value', 0))

        if mpesa_receipt:
            # Check idempotency to prevent duplicate transaction recording
            existing_pay = Payment.query.filter_by(transaction_reference=mpesa_receipt).first()
            if not existing_pay:
                # Retrieve bill via CheckoutRequestID or reference if mapped
                print(f"M-Pesa Payment Received: Ref {mpesa_receipt}, Amount KSh {amount:,.2f}")

    return jsonify({'ResultCode': 0, 'ResultDesc': 'Accepted'}), 200

@billing_bp.route('/pay', methods=['POST'])
@jwt_required
@role_required('Cashier', 'Admin')
def process_payment():
    """
    Process payment with explicit Database Concurrency Locking (begin_nested)
    Prevents race conditions on concurrent cashier payment submissions.
    """
    data = request.get_json() or {}

    bill_id = data.get('bill_id')
    payment_method = data.get('payment_method', '').strip()
    transaction_reference = data.get('transaction_reference', '').strip()
    amount_paid = data.get('amount_paid')

    if not bill_id:
        return jsonify({'error': 'bill_id is required'}), 400

    if payment_method not in ['Cash', 'M-Pesa', 'Insurance']:
        return jsonify({'error': 'Valid payment method is required (Cash, M-Pesa, Insurance)'}), 400

    if payment_method == 'M-Pesa' and not transaction_reference:
        return jsonify({'error': 'M-Pesa Transaction Reference code is required (e.g. QKH789210)'}), 400

    # Wrap in DB session transaction block with concurrency safety
    try:
        with db.session.begin_nested():
            bill = Bill.query.filter_by(id=bill_id).with_for_update().first()
            if not bill:
                return jsonify({'error': 'Bill not found'}), 404

            if bill.status == 'Paid':
                return jsonify({'error': 'Bill has ALREADY been paid in full'}), 400

            current_paid = sum(float(p.amount_paid) for p in bill.payments)
            bill_total = float(bill.total_amount)

            if payment_method == 'Insurance':
                bill.status = 'Insurance Pending'
                db.session.commit()

                log_audit(
                    g.current_user,
                    'PAYMENT',
                    'Bill',
                    entity_id=bill.id,
                    details=f"Bill {bill.bill_number} marked as 'Insurance Pending' by {g.current_user.full_name}"
                )

                return jsonify({
                    'message': 'Bill marked as Insurance Pending',
                    'bill': bill.to_dict()
                }), 200

            # Cash or M-Pesa
            amount_paid = float(amount_paid)
            if amount_paid <= 0:
                return jsonify({'error': 'Payment amount must be greater than 0'}), 400

            # Check transaction reference uniqueness for M-Pesa
            if payment_method == 'M-Pesa':
                existing_ref = Payment.query.filter_by(transaction_reference=transaction_reference).first()
                if existing_ref:
                    return jsonify({'error': f"M-Pesa reference '{transaction_reference}' has ALREADY been processed!"}), 400

            payment = Payment(
                bill_id=bill.id,
                cashier_id=g.current_user.id,
                payment_method=payment_method,
                transaction_reference=transaction_reference if transaction_reference else f"CASH-{datetime.utcnow().strftime('%H%M%S')}",
                amount_paid=amount_paid
            )

            db.session.add(payment)
            db.session.flush()

            new_total_paid = current_paid + amount_paid
            if new_total_paid >= bill_total:
                bill.status = 'Paid'
                if bill.visit:
                    bill.visit.status = 'Completed'

            db.session.commit()

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Payment processing error: {str(e)}"}), 500

    log_audit(
        g.current_user,
        'PAYMENT',
        'Bill',
        entity_id=bill.id,
        details=f"Received payment of KSh {amount_paid:,.2f} ({payment_method} Ref: {payment.transaction_reference}) for Bill {bill.bill_number}"
    )

    return jsonify({
        'message': 'Payment recorded successfully',
        'payment': payment.to_dict(),
        'bill': bill.to_dict()
    }), 200

@billing_bp.route('/receipt/<int:bill_id>', methods=['GET'])
@jwt_required
def get_receipt(bill_id):
    bill = Bill.query.get(bill_id)
    if not bill:
        return jsonify({'error': 'Bill not found'}), 404

    visit = bill.visit
    patient = visit.patient if visit else None

    log_audit(g.current_user, 'VIEW', 'Bill', entity_id=bill.id, details=f"Generated receipt view for Bill {bill.bill_number}")

    return jsonify({
        'hospital_info': {
            'name': 'CityCare Hospital Kenya',
            'tagline': 'Better Health, Brighter Tomorrow',
            'address': 'Kenyatta Avenue, Nairobi / Kisumu Road',
            'phone': '+254 700 123 456 / +254 733 987 654',
            'email': 'billing@citycarehospital.co.ke',
            'pin': 'P051298471Z'
        },
        'receipt': {
            'bill_number': bill.bill_number,
            'date': bill.created_at.strftime('%Y-%m-%d %H:%M:%S') if bill.created_at else None,
            'status': bill.status,
            'patient': patient.to_dict() if patient else None,
            'visit_number': visit.visit_number if visit else None,
            'doctor_name': visit.doctor.full_name if (visit and visit.doctor) else 'Outpatient',
            'items': [item.to_dict() for item in bill.items],
            'total_amount': float(bill.total_amount),
            'payments': [p.to_dict() for p in bill.payments],
            'paid_amount': sum(float(p.amount_paid) for p in bill.payments),
            'balance': max(0.0, float(bill.total_amount) - sum(float(p.amount_paid) for p in bill.payments))
        }
    }), 200

@billing_bp.route('/etims/<int:bill_id>', methods=['GET'])
@jwt_required
@role_required('Cashier', 'Admin')
def get_etims_invoice(bill_id):
    """
    Returns KRA eTIMS Tax Invoice Payload Structure
    """
    bill = Bill.query.get(bill_id)
    if not bill:
        return jsonify({'error': 'Bill not found'}), 404

    if not bill.payments:
        return jsonify({'error': 'Bill has no recorded payments yet'}), 400

    latest_payment = bill.payments[-1]
    etims_data = generate_etims_payload(bill, latest_payment)

    return jsonify({'etims_payload': etims_data}), 200
