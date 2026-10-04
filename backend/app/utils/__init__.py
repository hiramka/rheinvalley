from app.models import db, AuditLog

def log_audit(user, action, entity, entity_id=None, details=None):
    """
    Utility function to record audit logs for patient records, billing, dispensing, and system actions.
    """
    try:
        user_id = user.get('id') if isinstance(user, dict) else (user.id if hasattr(user, 'id') else None)
        username = user.get('username') if isinstance(user, dict) else (user.username if hasattr(user, 'username') else 'System')
        user_role = user.get('role') if isinstance(user, dict) else (user.role if hasattr(user, 'role') else 'Unknown')

        log_entry = AuditLog(
            user_id=user_id,
            username=username,
            user_role=user_role,
            action=action,
            entity=entity,
            entity_id=str(entity_id) if entity_id is not None else None,
            details=details
        )
        db.session.add(log_entry)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error writing audit log: {e}")
