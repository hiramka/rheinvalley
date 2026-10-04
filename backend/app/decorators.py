from functools import wraps
from flask import request, jsonify, g, current_app
import jwt
from app.models import User

def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Authorization header is missing'}), 401
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'error': 'Invalid Authorization header format. Expected Bearer <token>'}), 401
        
        token = parts[1]
        try:
            payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            user = User.query.get(payload['sub'])
            if not user:
                return jsonify({'error': 'User associated with token no longer exists'}), 401
            g.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired. Please log in again.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token. Authorization denied.'}), 401
            
        return f(*args, **kwargs)
    return decorated

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(g, 'current_user') or g.current_user is None:
                return jsonify({'error': 'Authentication required'}), 401
            
            # Admin role overrides all role checks
            if g.current_user.role not in allowed_roles and g.current_user.role != 'Admin':
                return jsonify({
                    'error': f'Forbidden: Role "{g.current_user.role}" does not have access to this resource.'
                }), 403
                
            return f(*args, **kwargs)
        return decorated
    return decorator
