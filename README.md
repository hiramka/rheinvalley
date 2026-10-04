# CityCare Hospital POS & Billing System (Kenya) — Phase 1

A web-based Outpatient Point of Sale (POS) and Billing System built for small hospitals and medical centers in Kenya.

---

## 🚀 Tech Stack

- **Backend**: Python 3.9+ Flask, Flask-SQLAlchemy (MySQL & SQLite compatible), Flask-Migrate (Alembic), PyJWT, Flask-CORS, Werkzeug.
- **Frontend**: React (Vite), Lucide Icons, Custom Desktop-First Healthcare CSS Design System.
- **Authentication**: JWT-based stateless authentication with Role-Based Access Control (RBAC).

---

## 💊 Pharmacy Stock Movements & FEFO (First Expiry, First Out)

### 1. Stock Movements Breakdown Formula
Every drug batch maintains an audit log of stock movements (`stock_movements` table). Current stock is calculated dynamically:

$$\text{Current Stock} = \text{Opening Stock} + \text{Received} - \text{Dispensed} - \text{Damaged} \pm \text{Adjusted}$$

**Example Reconciliation (Paracetamol 500mg)**:
```text
Opening stock:       100
Received:             50
Dispensed:            20
Damaged:               5
Adjusted:             -2
------------------------
Current stock:       123
```

### 2. FEFO (First Expiry, First Out) Dispensing Strategy
- Medications are automatically dispensed from the earliest expiring batch first (`expiry_date ASC`).
- If a single batch has insufficient stock, FEFO dispenses across multiple batches starting from the nearest expiry date.

---

## 👥 Staff Profiles & Roles

Each user account is linked 1-to-1 with a `Staff` profile record (`staff` table):
- `employee_number` (e.g. `EMP-0001`)
- `license_number` (e.g. `KMPDC/2026/4102` or `PPB/2026/9021`)
- `department` (`Reception`, `Clinical Services`, `Pharmacy`, `Accounts`, `Administration`)
- `status` (`Active`, `On Leave`, `Suspended`, `Inactive`)

---

## 🔐 Security & Non-Negotiable Requirements

1. **Hashed Passwords**: Standard Werkzeug/bcrypt salted password hashing (`pbkdf2:sha256`).
2. **Server-Side Input Validation**: Strict validation for patient records, national IDs, dates, quantities, prices, and M-Pesa transaction reference codes.
3. **JWT & RBAC Middleware**: `@jwt_required` and `@role_required` decorators safeguard sensitive API routes.
4. **Pharmacy Inventory Alerts**: Real-time detection of low stock (`quantity <= reorder_level`) and near expiry (`expiry_date <= 30 days`).
5. **Audit Trail Logging**: Automatic recording of `CREATE`, `EDIT`, `VIEW`, `DELETE`, `LOGIN`, `DISPENSE`, `PAYMENT`, and `STOCK_ADJUSTMENT` actions.

---

## 🔑 Demo Login Credentials

| Role | Username | Password | Staff Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Emp No: `EMP-0001`, Dept: `Administration` |
| **Receptionist** | `reception` | `reception123` | Emp No: `EMP-0002`, Dept: `Reception` |
| **Doctor** | `doctor` | `doctor123` | Emp No: `EMP-0003`, Dept: `Clinical Services`, License: `KMPDC/2026/4102` |
| **Pharmacist** | `pharmacy` | `pharmacy123` | Emp No: `EMP-0005`, Dept: `Pharmacy`, License: `PPB/2026/9021` |
| **Cashier** | `cashier` | `cashier123` | Emp No: `EMP-0006`, Dept: `Accounts` |

---

## ⚡ How to Run Locally

### 1. Backend Setup & Migrations (Flask)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
py -m pip install -r requirements.txt

# Seed the database (creates database tables and sample test data)
py seed.py

# Database Migrations
py -m flask --app run.py db migrate -m "Schema update"
py -m flask --app run.py db upgrade

# Run Flask backend server (starts on http://127.0.0.1:5000)
py run.py
```

### 2. Frontend Setup (React + Vite)

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start Vite React dev server (starts on http://localhost:5173)
npx vite --host --port 5173
```

Access the application in your browser at: **`http://localhost:5173`**

---

## 🗄️ Database Schema Details

- **`users`**: `id`, `username`, `full_name`, `password_hash`, `role`, `created_at`
- **`staff`**: `id`, `user_id` (FK), `employee_number` (idx), `license_number`, `department`, `status` (idx), `created_at`
- **`patients`**: `id`, `patient_number` (idx), `name` (idx), `dob`, `gender`, `phone` (idx), `national_id` (idx), `next_of_kin_name`, `next_of_kin_phone`, `created_at`
- **`visits`**: `id`, `visit_number` (idx), `patient_id` (FK), `doctor_id` (FK), `receptionist_id` (FK), `consultation_fee`, `status` (idx: Active, Completed, Cancelled), `created_at`
- **`consultation_notes`**: `id`, `visit_id` (FK), `doctor_id` (FK), `notes`, `created_at`
- **`drugs`**: `id`, `code` (idx), `name` (idx), `batch_number`, `expiry_date` (idx: FEFO sorted), `quantity`, `reorder_level`, `unit_price`, `created_at`
- **`stock_movements`**: `id`, `drug_id` (FK), `batch_number`, `movement_type` (idx: Opening Stock, Receipt, Dispensed, Damaged, Adjustment, Return), `quantity`, `reference`, `performed_by_id` (FK), `created_at` (idx)
- **`bills`**: `id`, `bill_number` (idx), `visit_id` (FK), `total_amount`, `status` (idx: Unpaid, Paid, Insurance Pending), `created_at`
- **`bill_items`**: `id`, `bill_id` (FK), `item_type`, `item_name`, `drug_id` (FK), `quantity`, `unit_price`, `total_price`, `dispensed_by_id` (FK), `created_at`
- **`payments`**: `id`, `bill_id` (FK), `cashier_id` (FK), `payment_method` (Cash, M-Pesa, Insurance), `transaction_reference`, `amount_paid`, `payment_date`
- **`audit_logs`**: `id`, `user_id` (FK), `username`, `user_role`, `action` (idx), `entity` (idx), `entity_id`, `details`, `timestamp` (idx)
