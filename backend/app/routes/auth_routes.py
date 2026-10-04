from flask import Blueprint, request, jsonify, current_app, g
import jwt
from datetime import datetime, timedelta
from app.models import db, User
from app.decorators import jwt_required
from app.utils import log_audit

auth_bp = Blueprint('auth', __name__)

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

@auth_bp.route('/me', methods=['GET'])
@jwt_required
def me():
    return jsonify({'user': g.current_user.to_dict()}), 200
