from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class RoleEnum:
    RECEPTIONIST = 'Receptionist'
    DOCTOR = 'Doctor'
    PHARMACIST = 'Pharmacist'
    CASHIER = 'Cashier'
    ADMIN = 'Admin'

    ALL_ROLES = [RECEPTIONIST, DOCTOR, PHARMACIST, CASHIER, ADMIN]


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    staff_profile = db.relationship('Staff', backref='user', uselist=False, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'full_name': self.full_name,
            'role': self.role,
            'staff_profile': self.staff_profile.to_dict() if self.staff_profile else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Staff(db.Model):
    __tablename__ = 'staff'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False, index=True)
    employee_number = db.Column(db.String(30), unique=True, nullable=False, index=True)
    license_number = db.Column(db.String(50), nullable=True)
    department = db.Column(db.String(50), nullable=False, default='Clinical Services') # Reception, Clinical Services, Pharmacy, Accounts, Administration
    status = db.Column(db.String(20), nullable=False, default='Active', index=True) # Active, On Leave, Suspended, Inactive
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'employee_number': self.employee_number,
            'license_number': self.license_number,
            'department': self.department,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Patient(db.Model):
    __tablename__ = 'patients'

    id = db.Column(db.Integer, primary_key=True)
    patient_number = db.Column(db.String(30), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    dob = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(10), nullable=False)
    phone = db.Column(db.String(20), nullable=False, index=True)
    national_id = db.Column(db.String(30), unique=True, nullable=False, index=True)
    next_of_kin_name = db.Column(db.String(100), nullable=False)
    next_of_kin_phone = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), default='Active', nullable=False, index=True) # Active, Inactive, Archived
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    visits = db.relationship('Visit', backref='patient', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'patient_number': self.patient_number,
            'name': self.name,
            'dob': self.dob.strftime('%Y-%m-%d') if self.dob else None,
            'gender': self.gender,
            'phone': self.phone,
            'national_id': self.national_id,
            'next_of_kin_name': self.next_of_kin_name,
            'next_of_kin_phone': self.next_of_kin_phone,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Visit(db.Model):
    __tablename__ = 'visits'

    id = db.Column(db.Integer, primary_key=True)
    visit_number = db.Column(db.String(30), unique=True, nullable=False, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    receptionist_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    consultation_fee = db.Column(db.Numeric(10, 2), default=1000.00, nullable=False)
    status = db.Column(db.String(20), default='Active', nullable=False, index=True) # Active, Completed, Cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    doctor = db.relationship('User', foreign_keys=[doctor_id], backref='assigned_visits')
    receptionist = db.relationship('User', foreign_keys=[receptionist_id], backref='registered_visits')
    consultation_notes = db.relationship('ConsultationNote', backref='visit', lazy=True, cascade="all, delete-orphan")
    bills = db.relationship('Bill', backref='visit', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'visit_number': self.visit_number,
            'patient_id': self.patient_id,
            'patient': self.patient.to_dict() if self.patient else None,
            'doctor_id': self.doctor_id,
            'doctor_name': self.doctor.full_name if self.doctor else 'Unassigned',
            'receptionist_id': self.receptionist_id,
            'receptionist_name': self.receptionist.full_name if self.receptionist else None,
            'consultation_fee': float(self.consultation_fee) if self.consultation_fee else 0.0,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'notes_count': len(self.consultation_notes)
        }


class ConsultationNote(db.Model):
    __tablename__ = 'consultation_notes'

    id = db.Column(db.Integer, primary_key=True)
    visit_id = db.Column(db.Integer, db.ForeignKey('visits.id'), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    notes = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    doctor = db.relationship('User', foreign_keys=[doctor_id])

    def to_dict(self):
        return {
            'id': self.id,
            'visit_id': self.visit_id,
            'doctor_id': self.doctor_id,
            'doctor_name': self.doctor.full_name if self.doctor else 'Doctor',
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Drug(db.Model):
    __tablename__ = 'drugs'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(30), nullable=False, index=True) # Non-unique to allow multiple batch entries for FEFO
    name = db.Column(db.String(100), nullable=False, index=True)
    batch_number = db.Column(db.String(50), nullable=False)
    expiry_date = db.Column(db.Date, nullable=False, index=True) # Key sorting field for FEFO (First Expiry First Out)
    quantity = db.Column(db.Integer, default=0, nullable=False)
    reorder_level = db.Column(db.Integer, default=10, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    movements = db.relationship('StockMovement', backref='drug', lazy=True, cascade="all, delete-orphan")

    def is_low_stock(self):
        return self.quantity <= self.reorder_level

    def is_near_expiry(self, days=30):
        if not self.expiry_date:
            return False
        delta = (self.expiry_date - datetime.utcnow().date()).days
        return delta <= days

    def is_expired(self):
        if not self.expiry_date:
            return False
        return self.expiry_date < datetime.utcnow().date()

    def get_stock_movements_summary(self):
        """
        Calculates exact stock movements:
        Opening Stock, Received, Dispensed, Damaged, Adjusted, Current Stock
        """
        movements = StockMovement.query.filter_by(drug_id=self.id).all()

        opening_stock = sum(m.quantity for m in movements if m.movement_type == 'Opening Stock')
        received = sum(m.quantity for m in movements if m.movement_type == 'Receipt')
        dispensed = abs(sum(m.quantity for m in movements if m.movement_type == 'Dispensed'))
        damaged = abs(sum(m.quantity for m in movements if m.movement_type == 'Damaged'))
        adjusted = sum(m.quantity for m in movements if m.movement_type == 'Adjustment')

        current_stock = opening_stock + received - dispensed - damaged + adjusted

        return {
            'opening_stock': opening_stock,
            'received': received,
            'dispensed': dispensed,
            'damaged': damaged,
            'adjusted': adjusted,
            'current_stock': current_stock
        }

    def to_dict(self):
        days_to_expiry = (self.expiry_date - datetime.utcnow().date()).days if self.expiry_date else 999
        summary = self.get_stock_movements_summary()
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'batch_number': self.batch_number,
            'expiry_date': self.expiry_date.strftime('%Y-%m-%d') if self.expiry_date else None,
            'quantity': self.quantity,
            'reorder_level': self.reorder_level,
            'unit_price': float(self.unit_price) if self.unit_price else 0.0,
            'is_low_stock': self.is_low_stock(),
            'is_near_expiry': self.is_near_expiry(),
            'is_expired': self.is_expired(),
            'days_to_expiry': days_to_expiry,
            'stock_summary': summary,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class StockMovement(db.Model):
    __tablename__ = 'stock_movements'

    id = db.Column(db.Integer, primary_key=True)
    drug_id = db.Column(db.Integer, db.ForeignKey('drugs.id'), nullable=False, index=True)
    batch_number = db.Column(db.String(50), nullable=False)
    movement_type = db.Column(db.String(30), nullable=False, index=True) # Opening Stock, Receipt, Dispensed, Damaged, Adjustment, Return
    quantity = db.Column(db.Integer, nullable=False) # positive for additions (+50), negative for reductions (-20, -5, -2)
    reference = db.Column(db.String(100), nullable=True) # e.g. "Supplier Invoice #102", "Visit VST-20261004-0001", "Stock Adjustment"
    performed_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    performed_by = db.relationship('User', foreign_keys=[performed_by_id])

    def to_dict(self):
        return {
            'id': self.id,
            'drug_id': self.drug_id,
            'batch_number': self.batch_number,
            'movement_type': self.movement_type,
            'quantity': self.quantity,
            'reference': self.reference,
            'performed_by_name': self.performed_by.full_name if self.performed_by else 'System',
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Bill(db.Model):
    __tablename__ = 'bills'

    id = db.Column(db.Integer, primary_key=True)
    bill_number = db.Column(db.String(30), unique=True, nullable=False, index=True)
    visit_id = db.Column(db.Integer, db.ForeignKey('visits.id'), nullable=False, index=True)
    total_amount = db.Column(db.Numeric(10, 2), default=0.00, nullable=False)
    status = db.Column(db.String(30), default='Unpaid', nullable=False, index=True) # Unpaid, Paid, Insurance Pending
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = db.relationship('BillItem', backref='bill', lazy=True, cascade="all, delete-orphan")
    payments = db.relationship('Payment', backref='bill', lazy=True, cascade="all, delete-orphan")

    def calculate_total(self):
        total = sum(float(item.total_price) for item in self.items)
        self.total_amount = total
        return total

    def to_dict(self):
        paid_amount = sum(float(p.amount_paid) for p in self.payments)
        balance = max(0.0, float(self.total_amount) - paid_amount)
        return {
            'id': self.id,
            'bill_number': self.bill_number,
            'visit_id': self.visit_id,
            'total_amount': float(self.total_amount),
            'paid_amount': paid_amount,
            'balance': balance,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'items': [item.to_dict() for item in self.items],
            'payments': [p.to_dict() for p in self.payments]
        }


class BillItem(db.Model):
    __tablename__ = 'bill_items'

    id = db.Column(db.Integer, primary_key=True)
    bill_id = db.Column(db.Integer, db.ForeignKey('bills.id'), nullable=False, index=True)
    item_type = db.Column(db.String(30), nullable=False) # Consultation, Drug, Lab Charge, Other
    item_name = db.Column(db.String(100), nullable=False)
    drug_id = db.Column(db.Integer, db.ForeignKey('drugs.id'), nullable=True)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    total_price = db.Column(db.Numeric(10, 2), nullable=False)
    dispensed_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    dispensed_by = db.relationship('User', foreign_keys=[dispensed_by_id])
    drug = db.relationship('Drug', foreign_keys=[drug_id])

    def to_dict(self):
        return {
            'id': self.id,
            'bill_id': self.bill_id,
            'item_type': self.item_type,
            'item_name': self.item_name,
            'drug_id': self.drug_id,
            'quantity': self.quantity,
            'unit_price': float(self.unit_price),
            'total_price': float(self.total_price),
            'dispensed_by_name': self.dispensed_by.full_name if self.dispensed_by else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    bill_id = db.Column(db.Integer, db.ForeignKey('bills.id'), nullable=False, index=True)
    cashier_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    payment_method = db.Column(db.String(30), nullable=False) # Cash, M-Pesa, Insurance
    transaction_reference = db.Column(db.String(50), nullable=True)
    amount_paid = db.Column(db.Numeric(10, 2), nullable=False)
    payment_date = db.Column(db.DateTime, default=datetime.utcnow)

    cashier = db.relationship('User', foreign_keys=[cashier_id])

    def to_dict(self):
        return {
            'id': self.id,
            'bill_id': self.bill_id,
            'cashier_id': self.cashier_id,
            'cashier_name': self.cashier.full_name if self.cashier else 'Cashier',
            'payment_method': self.payment_method,
            'transaction_reference': self.transaction_reference,
            'amount_paid': float(self.amount_paid),
            'payment_date': self.payment_date.isoformat() if self.payment_date else None
        }


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    username = db.Column(db.String(50), nullable=False)
    user_role = db.Column(db.String(30), nullable=False)
    action = db.Column(db.String(50), nullable=False, index=True) # CREATE, EDIT, VIEW, DELETE, LOGIN, DISPENSE, PAYMENT, STOCK_ADJUSTMENT
    entity = db.Column(db.String(50), nullable=False, index=True) # Patient, Visit, Bill, Drug, ConsultationNote, StockMovement, Staff
    entity_id = db.Column(db.String(50), nullable=True)
    details = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.username,
            'user_role': self.user_role,
            'action': self.action,
            'entity': self.entity,
            'entity_id': self.entity_id,
            'details': self.details,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }
