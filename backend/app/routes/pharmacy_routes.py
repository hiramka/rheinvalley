from flask import Blueprint, request, jsonify, g
from datetime import datetime, date
from app.models import db, Drug, StockMovement, Visit, Bill, BillItem
from app.decorators import jwt_required, role_required
from app.utils import log_audit

pharmacy_bp = Blueprint('pharmacy', __name__)

@pharmacy_bp.route('/inventory', methods=['GET'])
@jwt_required
def get_inventory():
    search = request.args.get('search', '').strip()
    query = Drug.query

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Drug.name.ilike(search_filter)) |
            (Drug.code.ilike(search_filter)) |
            (Drug.batch_number.ilike(search_filter))
        )

    # FEFO Sorting default: Earliest expiry date first
    drugs = query.order_by(Drug.expiry_date.asc(), Drug.name.asc()).all()
    return jsonify({'drugs': [d.to_dict() for d in drugs]}), 200

@pharmacy_bp.route('/inventory', methods=['POST'])
@jwt_required
@role_required('Pharmacist', 'Admin')
def add_drug():
    """
    Add a new drug stock batch into inventory and record an 'Opening Stock' or 'Receipt' movement.
    """
    data = request.get_json() or {}

    name = data.get('name', '').strip()
    code = data.get('code', '').strip().upper()
    batch_number = data.get('batch_number', '').strip()
    expiry_date_str = data.get('expiry_date', '').strip()
    quantity = data.get('quantity')
    unit_price = data.get('unit_price')
    reorder_level = data.get('reorder_level', 10)
    movement_type = data.get('movement_type', 'Opening Stock')

    errors = {}
    if not name:
        errors['name'] = 'Drug name is required'
    if not code:
        errors['code'] = 'Drug code is required'
    if not batch_number:
        errors['batch_number'] = 'Batch number is required'
    if not expiry_date_str:
        errors['expiry_date'] = 'Expiry date is required'
    if quantity is None or int(quantity) < 0:
        errors['quantity'] = 'Valid non-negative quantity is required'
    if unit_price is None or float(unit_price) <= 0:
        errors['unit_price'] = 'Valid positive unit price is required'

    if errors:
        return jsonify({'error': 'Validation failed', 'details': errors}), 400

    try:
        expiry_date = datetime.strptime(expiry_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid expiry date format. Use YYYY-MM-DD'}), 400

    drug = Drug(
        code=code,
        name=name,
        batch_number=batch_number,
        expiry_date=expiry_date,
        quantity=int(quantity),
        unit_price=float(unit_price),
        reorder_level=int(reorder_level)
    )

    db.session.add(drug)
    db.session.flush()

    # Record initial StockMovement
    movement = StockMovement(
        drug_id=drug.id,
        batch_number=batch_number,
        movement_type=movement_type,
        quantity=int(quantity),
        reference=f"Initial Batch Setup ({movement_type})",
        performed_by_id=g.current_user.id
    )
    db.session.add(movement)
    db.session.commit()

    log_audit(
        g.current_user,
        'CREATE',
        'Drug',
        entity_id=drug.id,
        details=f"Added drug batch {drug.name} ({drug.code}) Batch {drug.batch_number}, Expiry: {drug.expiry_date}, Qty: {drug.quantity}"
    )

    return jsonify({
        'message': 'Drug batch added to inventory successfully',
        'drug': drug.to_dict()
    }), 201

@pharmacy_bp.route('/inventory/<int:drug_id>/movements', methods=['GET'])
@jwt_required
def get_drug_movements(drug_id):
    drug = Drug.query.get(drug_id)
    if not drug:
        return jsonify({'error': 'Drug not found'}), 404

    movements = StockMovement.query.filter_by(drug_id=drug_id).order_by(StockMovement.created_at.desc()).all()
    summary = drug.get_stock_movements_summary()

    return jsonify({
        'drug': drug.to_dict(),
        'stock_summary': summary,
        'movements': [m.to_dict() for m in movements]
    }), 200

@pharmacy_bp.route('/inventory/<int:drug_id>/movement', methods=['POST'])
@jwt_required
@role_required('Pharmacist', 'Admin')
def record_stock_movement(drug_id):
    """
    Record stock movement for damage, receipt, or inventory adjustment:
    Example inputs:
    - movement_type: 'Receipt', 'Damaged', 'Adjustment', 'Return'
    - quantity: integer (e.g. +50 for receipt, -5 for damaged, -2 for adjustment)
    """
    drug = Drug.query.get(drug_id)
    if not drug:
        return jsonify({'error': 'Drug not found'}), 404

    data = request.get_json() or {}
    movement_type = data.get('movement_type', '').strip()
    qty_change = data.get('quantity')
    reference = data.get('reference', '').strip()

    valid_types = ['Receipt', 'Damaged', 'Adjustment', 'Return', 'Opening Stock']
    if movement_type not in valid_types:
        return jsonify({'error': f"Invalid movement_type. Must be one of: {', '.join(valid_types)}"}), 400

    try:
        qty_change = int(qty_change)
    except (ValueError, TypeError):
        return jsonify({'error': 'Quantity must be an integer'}), 400

    # Calculate stock adjustment on Drug.quantity
    if movement_type in ['Receipt', 'Return', 'Opening Stock']:
        if qty_change <= 0:
            return jsonify({'error': f'Quantity for {movement_type} must be positive'}), 400
        drug.quantity += qty_change
        movement_qty = qty_change
    elif movement_type in ['Damaged']:
        if qty_change <= 0:
            qty_change = abs(qty_change)
        if drug.quantity < qty_change:
            return jsonify({'error': f'Cannot mark {qty_change} damaged. Current stock is only {drug.quantity}'}), 400
        drug.quantity -= qty_change
        movement_qty = -qty_change
    elif movement_type in ['Adjustment']:
        drug.quantity += qty_change
        movement_qty = qty_change

    movement = StockMovement(
        drug_id=drug.id,
        batch_number=drug.batch_number,
        movement_type=movement_type,
        quantity=movement_qty,
        reference=reference or f"Stock {movement_type}",
        performed_by_id=g.current_user.id
    )

    db.session.add(movement)
    db.session.commit()

    log_audit(
        g.current_user,
        'STOCK_ADJUSTMENT',
        'Drug',
        entity_id=drug.id,
        details=f"Stock movement '{movement_type}' ({movement_qty}) recorded for {drug.name} (Batch: {drug.batch_number}). New stock: {drug.quantity}"
    )

    return jsonify({
        'message': 'Stock movement recorded successfully',
        'drug': drug.to_dict(),
        'stock_summary': drug.get_stock_movements_summary()
    }), 200

@pharmacy_bp.route('/alerts', methods=['GET'])
@jwt_required
def get_alerts():
    all_drugs = Drug.query.order_by(Drug.expiry_date.asc()).all()
    low_stock = [d.to_dict() for d in all_drugs if d.is_low_stock()]
    expiring_soon = [d.to_dict() for d in all_drugs if d.is_near_expiry() and not d.is_expired()]
    expired = [d.to_dict() for d in all_drugs if d.is_expired()]

    return jsonify({
        'low_stock_count': len(low_stock),
        'expiring_soon_count': len(expiring_soon),
        'expired_count': len(expired),
        'low_stock': low_stock,
        'expiring_soon': expiring_soon,
        'expired': expired
    }), 200

@pharmacy_bp.route('/dispense', methods=['POST'])
@jwt_required
@role_required('Pharmacist', 'Admin')
def dispense_drug():
    """
    FEFO (First Expiry, First Out) Dispensing Strategy:
    1. Locates available non-expired drug batches for requested drug code/ID, sorted by expiry_date ASC.
    2. Automatically dispenses from the earliest expiring batch first.
    3. If requested quantity exceeds first batch stock, consumes first batch and continues to next earliest batch.
    4. Deducts stock quantity and records 'Dispensed' StockMovement.
    5. Adds BillItem line items to patient's active visit bill.
    6. Logs DISPENSE audit event.
    """
    data = request.get_json() or {}

    visit_id = data.get('visit_id')
    drug_id = data.get('drug_id')
    requested_qty = data.get('quantity', 1)

    if not visit_id or not drug_id:
        return jsonify({'error': 'both visit_id and drug_id are required'}), 400

    try:
        requested_qty = int(requested_qty)
        if requested_qty <= 0:
            return jsonify({'error': 'Quantity must be greater than 0'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid quantity specified'}), 400

    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'error': 'Visit not found'}), 404

    if visit.status != 'Active':
        return jsonify({'error': f'Cannot dispense drug for visit with status "{visit.status}". Visit must be Active'}), 400

    selected_drug = Drug.query.get(drug_id)
    if not selected_drug:
        return jsonify({'error': 'Drug not found in inventory'}), 404

    # Locate all batches of this drug sorted by FEFO (First Expiry, First Out)
    today = date.today()
    candidate_batches = Drug.query.filter(
        (Drug.code == selected_drug.code) | (Drug.id == selected_drug.id),
        Drug.quantity > 0,
        Drug.expiry_date >= today
    ).order_by(Drug.expiry_date.asc()).all()

    total_available = sum(b.quantity for b in candidate_batches)
    if total_available < requested_qty:
        return jsonify({
            'error': f'FEFO Stock Error: Insufficient unexpired stock for {selected_drug.name}. Requested: {requested_qty}, Total unexpired stock: {total_available}'
        }), 400

    bill = Bill.query.filter_by(visit_id=visit.id).first()
    if not bill:
        return jsonify({'error': 'No active bill found for this visit'}), 400

    remaining_needed = requested_qty
    dispensed_batches_info = []

    # Execute FEFO dispensing loop
    for batch in candidate_batches:
        if remaining_needed <= 0:
            break

        take_qty = min(batch.quantity, remaining_needed)
        batch.quantity -= take_qty
        remaining_needed -= take_qty

        unit_price = float(batch.unit_price)
        total_price = unit_price * take_qty

        # Record 'Dispensed' stock movement
        movement = StockMovement(
            drug_id=batch.id,
            batch_number=batch.batch_number,
            movement_type='Dispensed',
            quantity=-take_qty,
            reference=f"Dispensed for Visit {visit.visit_number} ({visit.patient.name if visit.patient else ''})",
            performed_by_id=g.current_user.id
        )
        db.session.add(movement)

        # Create BillItem
        bill_item = BillItem(
            bill_id=bill.id,
            item_type='Drug',
            item_name=f"{batch.name} (Code: {batch.code} - Batch: {batch.batch_number} - FEFO Exp: {batch.expiry_date})",
            drug_id=batch.id,
            quantity=take_qty,
            unit_price=unit_price,
            total_price=total_price,
            dispensed_by_id=g.current_user.id
        )
        db.session.add(bill_item)

        dispensed_batches_info.append(f"{take_qty}x Batch {batch.batch_number} (Exp: {batch.expiry_date})")

    db.session.flush()
    bill.calculate_total()
    db.session.commit()

    log_audit(
        g.current_user,
        'DISPENSE',
        'Drug',
        entity_id=selected_drug.id,
        details=f"FEFO Dispensed total {requested_qty}x {selected_drug.name} for Visit {visit.visit_number}. Batches: {', '.join(dispensed_batches_info)}"
    )

    return jsonify({
        'message': f"FEFO Dispensed {requested_qty}x {selected_drug.name} across batch(es): {', '.join(dispensed_batches_info)}",
        'bill': bill.to_dict(),
        'drug': selected_drug.to_dict(),
        'stock_summary': selected_drug.get_stock_movements_summary()
    }), 200
