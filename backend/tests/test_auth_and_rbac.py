import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.models import db, User

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

    with app.test_client() as client:
        with app.app_context():
            db.drop_all()
            db.create_all()

            admin = User(username='admin_test', full_name='Admin Test', role='Admin')
            admin.set_password('pass123')

            doctor = User(username='doctor_test', full_name='Doctor Test', role='Doctor')
            doctor.set_password('pass123')

            db.session.add_all([admin, doctor])
            db.session.commit()

        yield client

        with app.app_context():
            db.session.remove()
            db.drop_all()

def test_login_success(client):
    res = client.post('/api/auth/login', json={'username': 'admin_test', 'password': 'pass123'})
    assert res.status_code == 200
    data = res.get_json()
    assert 'token' in data
    assert data['user']['role'] == 'Admin'

def test_login_invalid_password(client):
    res = client.post('/api/auth/login', json={'username': 'admin_test', 'password': 'wrongpassword'})
    assert res.status_code == 401

def test_rbac_doctor_cannot_create_patient(client):
    # Login as Doctor
    res_login = client.post('/api/auth/login', json={'username': 'doctor_test', 'password': 'pass123'})
    token = res_login.get_json()['token']

    # Doctor trying to create patient (Receptionist or Admin required)
    headers = {'Authorization': f'Bearer {token}'}
    res = client.post('/api/patients', json={
        'name': 'Unauthorized Patient',
        'dob': '1992-05-10',
        'gender': 'Male',
        'phone': '0711000111',
        'national_id': '99887766',
        'next_of_kin_name': 'Kin Test',
        'next_of_kin_phone': '0711222333'
    }, headers=headers)

    assert res.status_code == 403
