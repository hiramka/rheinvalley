from flask import Blueprint, request, jsonify, g
from app.models import db, Visit, ConsultationNote
from app.decorators import jwt_required, role_required
from app.utils import log_audit

consultation_bp = Blueprint('consultations', __name__)

@consultation_bp.route('/visit/<int:visit_id>/notes', methods=['GET'])
@jwt_required
def get_notes(visit_id):
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'error': 'Visit not found'}), 404

    notes = ConsultationNote.query.filter_by(visit_id=visit_id).order_by(ConsultationNote.id.desc()).all()
    log_audit(g.current_user, 'VIEW', 'ConsultationNote', entity_id=visit_id, details=f"Viewed consultation notes for visit {visit.visit_number}")
    
    return jsonify({'notes': [n.to_dict() for n in notes]}), 200

@consultation_bp.route('/visit/<int:visit_id>/notes', methods=['POST'])
@jwt_required
@role_required('Doctor', 'Admin')
def add_note(visit_id):
    visit = Visit.query.get(visit_id)
    if not visit:
        return jsonify({'error': 'Visit not found'}), 404

    data = request.get_json() or {}
    notes_text = data.get('notes', '').strip()

    if not notes_text:
        return jsonify({'error': 'Consultation note text cannot be empty'}), 400

    note = ConsultationNote(
        visit_id=visit.id,
        doctor_id=g.current_user.id,
        notes=notes_text
    )

    db.session.add(note)
    db.session.commit()

    log_audit(
        g.current_user,
        'CREATE',
        'ConsultationNote',
        entity_id=note.id,
        details=f"Doctor {g.current_user.full_name} added consultation note for visit {visit.visit_number}"
    )

    return jsonify({
        'message': 'Consultation note recorded successfully',
        'note': note.to_dict()
    }), 201
