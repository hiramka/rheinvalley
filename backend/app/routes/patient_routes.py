from flask import Blueprint, request, jsonify, g
from datetime import datetime
import re
from app.models import db, Patient
from app.decorators import jwt_required, role_required
from app.utils import log_audit

patient_bp = Blueprint('patients', __name__)

def generate_patient_number():
    date_str = datetime.utcnow().strftime('%Y%m')
    count = Patient.query.count() + 1
    return f"PAT-{date_str}-{count:04d}"

@patient_bp.route('', methods=['GET'])
@jwt_required
def get_patients():
    search = request.args.get('search', '').strip()
    include_archived = request.args.get('include_archived', 'false').lower() == 'true'

    query = Patient.query

    if not include_archived:
        query = query.filter(Patient.status != 'Archived')

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Patient.name.ilike(search_filter)) |
            (Patient.national_id.ilike(search_filter)) |
            (Patient.phone.ilike(search_filter)) |
            (Patient.patient_number.ilike(search_filter))
        )

    patients = query.order_by(Patient.id.desc()).all()
    
    log_audit(g.current_user, 'VIEW', 'Patient', details=f"Retrieved {len(patients)} patient records (search: '{search}')")

    return jsonify({'patients': [p.to_dict() for p in patients]}), 200

@patient_bp.route('/<int:patient_id>', methods=['GET'])
@jwt_required
def get_patient(patient_id):
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    log_audit(g.current_user, 'VIEW', 'Patient', entity_id=patient.id, details=f"Viewed patient profile: {patient.name} ({patient.patient_number})")
    
    patient_data = patient.to_dict()
    patient_data['visits'] = [v.to_dict() for v in patient.visits]

    return jsonify({'patient': patient_data}), 200

@patient_bp.route('', methods=['POST'])
@jwt_required
@role_required('Receptionist', 'Admin')
def create_patient():
    data = request.get_json() or {}

    name = data.get('name', '').strip()
    dob_str = data.get('dob', '').strip()
    gender = data.get('gender', '').strip()
    phone = data.get('phone', '').strip()
    national_id = data.get('national_id', '').strip()
    next_of_kin_name = data.get('next_of_kin_name', '').strip()
    next_of_kin_phone = data.get('next_of_kin_phone', '').strip()

    errors = {}
    if not name:
        errors['name'] = 'Full name is required'
    if not dob_str:
        errors['dob'] = 'Date of birth is required'
    if gender not in ['Male', 'Female', 'Other']:
        errors['gender'] = 'Valid gender is required (Male, Female, Other)'
    if not phone:
        errors['phone'] = 'Phone number is required'
    if not national_id:
        errors['national_id'] = 'National ID is required'
    if not next_of_kin_name:
        errors['next_of_kin_name'] = 'Next of kin name is required'
    if not next_of_kin_phone:
        errors['next_of_kin_phone'] = 'Next of kin phone is required'

    if errors:
        return jsonify({'error': 'Validation failed', 'details': errors}), 400

    try:
        dob = datetime.strptime(dob_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format for DOB. Use YYYY-MM-DD'}), 400

    existing_id = Patient.query.filter_by(national_id=national_id).first()
    if existing_id:
        return jsonify({'error': f'Patient with National ID {national_id} already exists'}), 400

    patient_number = generate_patient_number()

    patient = Patient(
        patient_number=patient_number,
        name=name,
        dob=dob,
        gender=gender,
        phone=phone,
        national_id=national_id,
        next_of_kin_name=next_of_kin_name,
        next_of_kin_phone=next_of_kin_phone,
        status='Active'
    )

    db.session.add(patient)
    db.session.commit()

    log_audit(
        g.current_user,
        'CREATE',
        'Patient',
        entity_id=patient.id,
        details=f"Registered patient {patient.name} ({patient.patient_number}, ID: {patient.national_id})"
    )

    return jsonify({
        'message': 'Patient registered successfully',
        'patient': patient.to_dict()
    }), 201

@patient_bp.route('/<int:patient_id>', methods=['PUT'])
@jwt_required
@role_required('Receptionist', 'Admin')
def update_patient(patient_id):
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    data = request.get_json() or {}
    
    if 'name' in data and data['name'].strip():
        patient.name = data['name'].strip()
    if 'gender' in data and data['gender'] in ['Male', 'Female', 'Other']:
        patient.gender = data['gender']
    if 'phone' in data and data['phone'].strip():
        patient.phone = data['phone'].strip()
    if 'next_of_kin_name' in data and data['next_of_kin_name'].strip():
        patient.next_of_kin_name = data['next_of_kin_name'].strip()
    if 'next_of_kin_phone' in data and data['next_of_kin_phone'].strip():
        patient.next_of_kin_phone = data['next_of_kin_phone'].strip()
    if 'dob' in data and data['dob'].strip():
        try:
            patient.dob = datetime.strptime(data['dob'].strip(), '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format for DOB'}), 400

    db.session.commit()

    log_audit(
        g.current_user,
        'EDIT',
        'Patient',
        entity_id=patient.id,
        details=f"Updated details for patient {patient.name} ({patient.patient_number})"
    )

    return jsonify({
        'message': 'Patient updated successfully',
        'patient': patient.to_dict()
    }), 200

@patient_bp.route('/<int:patient_id>', methods=['DELETE'])
@jwt_required
@role_required('Admin')
def soft_delete_patient(patient_id):
    """
    ODPC Compliant Soft Deletion / Archival for Patient Records.
    Ensures medical and financial audit history is preserved without hard deletion.
    """
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    patient.status = 'Archived'
    db.session.commit()

    log_audit(
        g.current_user,
        'DELETE',
        'Patient',
        entity_id=patient.id,
        details=f"Soft-deleted / Archived patient record {patient.name} ({patient.patient_number})"
    )

    return jsonify({
        'message': f"Patient {patient.name} has been archived successfully (ODPC Data Protection Compliant)",
        'patient': patient.to_dict()
    }), 200
