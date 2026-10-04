import sys
import os
from datetime import datetime, date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import db, User, Staff, Patient, Visit, ConsultationNote, Drug, StockMovement, Bill, BillItem, Payment, AuditLog

app = create_app()

def seed_database():
    with app.app_context():
        print("Re-initializing database schema...")
        db.drop_all()
        db.create_all()

        print("Seeding default users with staff profiles...")
        # 1. Users & Staff profiles
        users_data = [
            {'username': 'admin', 'full_name': 'Dr. Daniel Kiprop', 'role': 'Admin', 'pass': 'admin123', 'emp': 'EMP-0001', 'dept': 'Administration', 'lic': 'ADMIN/2026/001'},
            {'username': 'reception', 'full_name': 'Grace Muthoni', 'role': 'Receptionist', 'pass': 'reception123', 'emp': 'EMP-0002', 'dept': 'Reception', 'lic': None},
            {'username': 'doctor', 'full_name': 'Dr. James Mwangi', 'role': 'Doctor', 'pass': 'doctor123', 'emp': 'EMP-0003', 'dept': 'Clinical Services', 'lic': 'KMPDC/2026/4102'},
            {'username': 'doctor2', 'full_name': 'Dr. Sarah Otieno', 'role': 'Doctor', 'pass': 'doctor123', 'emp': 'EMP-0004', 'dept': 'Clinical Services', 'lic': 'KMPDC/2026/8819'},
            {'username': 'pharmacy', 'full_name': 'Brian Ochieng', 'role': 'Pharmacist', 'pass': 'pharmacy123', 'emp': 'EMP-0005', 'dept': 'Pharmacy', 'lic': 'PPB/2026/9021'},
            {'username': 'cashier', 'full_name': 'Faith Wanjiru', 'role': 'Cashier', 'pass': 'cashier123', 'emp': 'EMP-0006', 'dept': 'Accounts', 'lic': None}
        ]

        users = {}
        for udata in users_data:
            u = User(username=udata['username'], full_name=udata['full_name'], role=udata['role'])
            u.set_password(udata['pass'])
            db.session.add(u)
            db.session.flush()

            st = Staff(
                user_id=u.id,
                employee_number=udata['emp'],
                license_number=udata['lic'],
                department=udata['dept'],
                status='Active'
            )
            db.session.add(st)
            users[udata['username']] = u

        db.session.flush()

        print("Seeding sample patients...")
        # 2. Patients
        p1 = Patient(
            patient_number='PAT-202610-0001',
            name='John Kamau Njoroge',
            dob=date(1990, 4, 15),
            gender='Male',
            phone='0712 345678',
            national_id='12345678',
            next_of_kin_name='Mary Wanjiku Njoroge',
            next_of_kin_phone='0712 987654'
        )

        p2 = Patient(
            patient_number='PAT-202610-0002',
            name='Mary Wambui Mwangi',
            dob=date(1985, 8, 22),
            gender='Female',
            phone='0722 987654',
            national_id='23456789',
            next_of_kin_name='Peter Mwangi Maina',
            next_of_kin_phone='0722 111222'
        )

        db.session.add_all([p1, p2])
        db.session.flush()

        print("Seeding pharmacy inventory with FEFO expiry sorting & exact stock movements demo...")
        # 3. Drug Paracetamol with exact stock breakdown requested by user:
        # Opening stock: 100, Received: 50, Dispensed: 20, Damaged: 5, Adjusted: -2 -> Current stock: 123!
        today = date.today()

        d1 = Drug(
            code='PAR500',
            name='Paracetamol 500mg Tablets',
            batch_number='BCH-PAR-01',
            expiry_date=today + timedelta(days=15), # FEFO: Expires first in 15 days!
            quantity=123,
            reorder_level=20,
            unit_price=50.00
        )

        # FEFO Batch 2 of Paracetamol with later expiry date
        d1_batch2 = Drug(
            code='PAR500',
            name='Paracetamol 500mg Tablets',
            batch_number='BCH-PAR-02',
            expiry_date=today + timedelta(days=200), # FEFO: Expires later in 200 days!
            quantity=100,
            reorder_level=20,
            unit_price=50.00
        )

        d2 = Drug(
            code='AMX500',
            name='Amoxicillin 500mg Capsules',
            batch_number='BCH-AMX-01',
            expiry_date=today + timedelta(days=180),
            quantity=5, # Low stock alert
            reorder_level=15,
            unit_price=80.00
        )

        d3 = Drug(
            code='CIP500',
            name='Ciprofloxacin 500mg Tablets',
            batch_number='BCH-CIP-01',
            expiry_date=today + timedelta(days=7), # Near expiry alert
            quantity=20,
            reorder_level=10,
            unit_price=120.00
        )

        db.session.add_all([d1, d1_batch2, d2, d3])
        db.session.flush()

        # Seed exact stock movements for Paracetamol d1:
        # Opening stock: 100, Received: 50, Dispensed: 20, Damaged: 5, Adjusted: -2 -> Current stock: 123
        m1 = StockMovement(drug_id=d1.id, batch_number='BCH-PAR-01', movement_type='Opening Stock', quantity=100, reference='Initial Warehouse Setup', performed_by_id=users['pharmacy'].id)
        m2 = StockMovement(drug_id=d1.id, batch_number='BCH-PAR-01', movement_type='Receipt', quantity=50, reference='MEDS Kenya Supplier Inv #892', performed_by_id=users['pharmacy'].id)
        m3 = StockMovement(drug_id=d1.id, batch_number='BCH-PAR-01', movement_type='Dispensed', quantity=-20, reference='Outpatient Prescriptions', performed_by_id=users['pharmacy'].id)
        m4 = StockMovement(drug_id=d1.id, batch_number='BCH-PAR-01', movement_type='Damaged', quantity=-5, reference='Water Damage Write-off', performed_by_id=users['pharmacy'].id)
        m5 = StockMovement(drug_id=d1.id, batch_number='BCH-PAR-01', movement_type='Adjustment', quantity=-2, reference='Routine Stock Count Adjustment', performed_by_id=users['pharmacy'].id)

        # Batch 2 opening stock
        m_b2 = StockMovement(drug_id=d1_batch2.id, batch_number='BCH-PAR-02', movement_type='Opening Stock', quantity=100, reference='Batch 2 Opening Stock', performed_by_id=users['pharmacy'].id)

        db.session.add_all([m1, m2, m3, m4, m5, m_b2])

        print("Seeding visits, consultation notes, bills...")
        v1 = Visit(
            visit_number='VST-20261004-0001',
            patient_id=p1.id,
            doctor_id=users['doctor'].id,
            receptionist_id=users['reception'].id,
            consultation_fee=1000.00,
            status='Active'
        )
        db.session.add(v1)
        db.session.flush()

        note1 = ConsultationNote(
            visit_id=v1.id,
            doctor_id=users['doctor'].id,
            notes='Patient presents with high fever, mild headache, and general malaise. Prescribed Paracetamol 500mg and Full Blood Count lab test.'
        )
        db.session.add(note1)

        b1 = Bill(
            bill_number='INV-20261004-0001',
            visit_id=v1.id,
            total_amount=2000.00,
            status='Unpaid'
        )
        db.session.add(b1)
        db.session.flush()

        item1 = BillItem(
            bill_id=b1.id,
            item_type='Consultation',
            item_name='Doctor Consultation Fee (Dr. James Mwangi)',
            quantity=1,
            unit_price=1000.00,
            total_price=1000.00
        )
        item2 = BillItem(
            bill_id=b1.id,
            item_type='Drug',
            item_name='Paracetamol 500mg Tablets (FEFO Batch: BCH-PAR-01 - Exp: ' + d1.expiry_date.strftime('%Y-%m-%d') + ')',
            drug_id=d1.id,
            quantity=20,
            unit_price=50.00,
            total_price=1000.00,
            dispensed_by_id=users['pharmacy'].id
        )
        db.session.add_all([item1, item2])

        db.session.commit()
        print("Database re-seeded with Staff profiles, FEFO sorting, and exact Stock Movements breakdown!")

if __name__ == '__main__':
    seed_database()
