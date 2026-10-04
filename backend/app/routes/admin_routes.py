from flask import Blueprint, request, jsonify, g
from datetime import datetime, date
from app.models import db, User, Staff, Patient, Visit, Bill, Drug, Payment, AuditLog, RoleEnum
from app.decorators import jwt_required, role_required
from app.utils import log_audit

admin_bp = Blueprint('admin', __name__)

def generate_employee_number():
    count = Staff.query.count() + 1
    return f"EMP-{count:04d}"

@admin_bp.route('/users', methods=['GET'])
@jwt_required
@role_required('Admin')
def get_users():
    users = User.query.order_by(User.id.asc()).all()
    return jsonify({'users': [u.to_dict() for u in users]}), 200

@admin_bp.route('/users', methods=['POST'])
@jwt_required
@role_required('Admin')
def create_user():
    data = request.get_json() or {}

    username = data.get('username', '').strip()
    full_name = data.get('full_name', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', '').strip()
    
    # Optional staff details
    license_number = data.get('license_number', '').strip()
    department = data.get('department', '').strip() or 'Clinical Services'
    employee_number = data.get('employee_number', '').strip() or generate_employee_number()

    if not username or not full_name or not password or not role:
        return jsonify({'error': 'username, full_name, password, and role are required'}), 400

    if role not in RoleEnum.ALL_ROLES:
        return jsonify({'error': f"Invalid role. Allowed roles: {', '.join(RoleEnum.ALL_ROLES)}"}), 400

    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({'error': f"Username '{username}' is already taken"}), 400

    user = User(
        username=username,
        full_name=full_name,
        role=role
    )
    user.set_password(password)

    db.session.add(user)
    db.session.flush()

    # Create linked Staff Profile
    staff = Staff(
        user_id=user.id,
        employee_number=employee_number,
        license_number=license_number if license_number else None,
        department=department,
        status='Active'
    )
    db.session.add(staff)
    db.session.commit()

    log_audit(
        g.current_user,
        'CREATE',
        'Staff',
        entity_id=user.id,
        details=f"Created staff account '{user.username}' ({user.role}) - Emp No: {employee_number}, Dept: {department}"
    )

    return jsonify({
        'message': 'User and Staff Profile created successfully',
        'user': user.to_dict()
    }), 201

@admin_bp.route('/audit-logs', methods=['GET'])
@jwt_required
@role_required('Admin')
def get_audit_logs():
    action = request.args.get('action', '').strip()
    entity = request.args.get('entity', '').strip()
    username = request.args.get('username', '').strip()

    query = AuditLog.query

    if action:
        query = query.filter_by(action=action)
    if entity:
        query = query.filter_by(entity=entity)
    if username:
        query = query.filter_by(username=username)

    logs = query.order_by(AuditLog.timestamp.desc()).limit(200).all()
    return jsonify({'audit_logs': [l.to_dict() for l in logs]}), 200

@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required
def get_dashboard_metrics():
    today = date.today()

    total_patients = Patient.query.count()
    todays_visits = Visit.query.filter(db.func.date(Visit.created_at) == today).count()
    active_visits = Visit.query.filter_by(status='Active').count()

    todays_payments = db.session.query(db.func.sum(Payment.amount_paid)).filter(
        db.func.date(Payment.payment_date) == today
    ).scalar() or 0.0

    total_revenue = db.session.query(db.func.sum(Payment.amount_paid)).scalar() or 0.0

    drugs = Drug.query.all()
    low_stock_count = sum(1 for d in drugs if d.is_low_stock())
    near_expiry_count = sum(1 for d in drugs if d.is_near_expiry())

    pending_bills_count = Bill.query.filter(Bill.status != 'Paid').count()

    doctors = User.query.filter_by(role='Doctor').all()

    return jsonify({
        'metrics': {
            'total_patients': total_patients,
            'todays_visits': todays_visits,
            'active_visits': active_visits,
            'todays_revenue': float(todays_payments),
            'total_revenue': float(total_revenue),
            'low_stock_count': low_stock_count,
            'near_expiry_count': near_expiry_count,
            'pending_bills_count': pending_bills_count
        },
        'available_doctors': [d.to_dict() for d in doctors]
    }), 200
