from flask import Blueprint, request, jsonify, current_app, g
import jwt
from datetime import datetime, timedelta
from app.models import db, User, Staff, RoleEnum
from app.decorators import jwt_required
from app.utils import log_audit

auth_bp = Blueprint('auth', __name__)

def generate_employee_number():
    count = Staff.query.count() + 1
    return f"EMP-{count:04d}"

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid username or password'}), 401

    # Generate JWT token
    payload = {
        'sub': user.id,
        'username': user.username,
        'role': user.role,
        'exp': datetime.utcnow() + current_app.config['JWT_ACCESS_TOKEN_EXPIRES']
    }
    token = jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

    log_audit(user, 'LOGIN', 'User', entity_id=user.id, details=f"User {user.username} logged in successfully")

    return jsonify({
        'token': token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    full_name = data.get('full_name', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', '').strip() or RoleEnum.RECEPTIONIST
    department = data.get('department', '').strip() or 'Clinical Services'

    if not username or not full_name or not password:
        return jsonify({'error': 'username, full_name, and password are required'}), 400

    if role not in RoleEnum.ALL_ROLES:
        return jsonify({'error': f"Invalid role. Allowed roles: {', '.join(RoleEnum.ALL_ROLES)}"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': f"Username '{username}' is already taken"}), 400

    user = User(
        username=username,
        full_name=full_name,
        role=role
    )
    user.set_password(password)

    db.session.add(user)
    db.session.flush()

    staff = Staff(
        user_id=user.id,
        employee_number=generate_employee_number(),
        department=department,
        status='Active'
    )
    db.session.add(staff)
    db.session.commit()

    log_audit(user, 'REGISTER', 'User', entity_id=user.id, details=f"User {user.username} registered as {user.role}")

    payload = {
        'sub': user.id,
        'username': user.username,
        'role': user.role,
        'exp': datetime.utcnow() + current_app.config['JWT_ACCESS_TOKEN_EXPIRES']
    }
    token = jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

    return jsonify({
        'token': token,
        'user': user.to_dict(),
        'message': 'User registered successfully'
    }), 201

@auth_bp.route('/me', methods=['GET'])
@jwt_required
def me():
    return jsonify({'user': g.current_user.to_dict()}), 200

