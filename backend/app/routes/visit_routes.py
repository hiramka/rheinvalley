from flask import Blueprint, request, jsonify, g
from datetime import datetime
from app.models import db, Visit, Patient, User, Bill, BillItem
from app.decorators import jwt_required, role_required
from app.utils import log_audit

visit_bp = Blueprint('visits', __name__)

def generate_visit_number():
    date_str = datetime.utcnow().strftime('%Y%m%d')
    count = Visit.query.count() + 1
    return f"VST-{date_str}-{count:04d}"

def generate_bill_number():
    date_str = datetime.utcnow().strftime('%Y%m%d')
    count = Bill.query.count() + 1
    return f"INV-{date_str}-{count:04d}"

@visit_bp.route('', methods=['GET'])
@jwt_required
def get_visits():
    status = request.args.get('status', '').strip()
    doctor_id = request.args.get('doctor_id', type=int)
    patient_id = request.args.get('patient_id', type=int)

    query = Visit.query

    if status:
        query = query.filter_by(status=status)
    if doctor_id:
        query = query.filter_by(doctor_id=doctor_id)
    if patient_id:
        query = query.filter_by(patient_id=patient_id)

    visits = query.order_by(Visit.id.desc()).all()
    return jsonify({'visits': [v.to_dict() for v in visits]}), 200

@visit_bp.route('/<int:visit_id>', methods=['GET'])
@jwt_required
def get_visit(visit_id):
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'error': 'Visit not found'}), 404

    log_audit(g.current_user, 'VIEW', 'Visit', entity_id=visit.id, details=f"Viewed visit details {visit.visit_number}")
    return jsonify({'visit': visit.to_dict()}), 200

@visit_bp.route('', methods=['POST'])
@jwt_required
@role_required('Receptionist', 'Admin')
def create_visit():
    data = request.get_json() or {}

    patient_id = data.get('patient_id')
    doctor_id = data.get('doctor_id')
    consultation_fee = data.get('consultation_fee', 1000.00)

    if not patient_id:
        return jsonify({'error': 'Patient ID is required'}), 400

    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({'error': 'Patient does not exist'}), 404

    if doctor_id:
        doctor = User.query.filter_by(id=doctor_id, role='Doctor').first()
        if not doctor:
            return jsonify({'error': 'Selected doctor is invalid or not registered as a Doctor'}), 400

    try:
        consultation_fee = float(consultation_fee)
        if consultation_fee < 0:
            return jsonify({'error': 'Consultation fee cannot be negative'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid consultation fee amount'}), 400

    # Create Visit
    visit_number = generate_visit_number()
    visit = Visit(
        visit_number=visit_number,
        patient_id=patient.id,
        doctor_id=doctor_id,
        receptionist_id=g.current_user.id,
        consultation_fee=consultation_fee,
        status='Active'
    )
    db.session.add(visit)
    db.session.flush() # get visit.id

    # Create associated running Bill
    bill_number = generate_bill_number()
    bill = Bill(
        bill_number=bill_number,
        visit_id=visit.id,
        total_amount=consultation_fee,
        status='Unpaid'
    )
    db.session.add(bill)
    db.session.flush()

    # Add consultation fee line item
    consultation_item = BillItem(
        bill_id=bill.id,
        item_type='Consultation',
        item_name=f"Doctor Consultation Fee ({visit.doctor.full_name if visit.doctor else 'Outpatient'})",
        quantity=1,
        unit_price=consultation_fee,
        total_price=consultation_fee
    )
    db.session.add(consultation_item)
    db.session.commit()

    log_audit(
        g.current_user,
        'CREATE',
        'Visit',
        entity_id=visit.id,
        details=f"Created outpatient visit {visit.visit_number} for {patient.name}. Fee: KSh {consultation_fee:,.2f}"
    )

    return jsonify({
        'message': 'Visit created successfully',
        'visit': visit.to_dict(),
        'bill': bill.to_dict()
    }), 201

@visit_bp.route('/<int:visit_id>/status', methods=['PUT'])
@jwt_required
def update_visit_status(visit_id):
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'error': 'Visit not found'}), 404

    data = request.get_json() or {}
    new_status = data.get('status')
    if new_status not in ['Active', 'Completed', 'Cancelled']:
        return jsonify({'error': 'Invalid status. Choose Active, Completed, or Cancelled'}), 400

    visit.status = new_status
    db.session.commit()

    log_audit(g.current_user, 'EDIT', 'Visit', entity_id=visit.id, details=f"Updated status of visit {visit.visit_number} to {new_status}")
    return jsonify({'message': 'Visit status updated', 'visit': visit.to_dict()}), 200
