import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Calendar, DollarSign, Pill, ShieldCheck, UserPlus, Search, AlertTriangle, Key, BadgeCheck } from 'lucide-react';
import { api } from '../api';

export default function AdminDashboardPage({ user }) {
  const [metrics, setMetrics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);

  // User & Staff Form State
  const [userForm, setUserForm] = useState({
    username: '',
    full_name: '',
    password: '',
    role: 'Receptionist',
    employee_number: '',
    license_number: '',
    department: 'Reception'
  });
  const [userLoading, setUserLoading] = useState(false);
  const [userMsg, setUserMsg] = useState({ type: '', text: '' });

  // Audit Log Filters
  const [auditFilter, setAuditFilter] = useState({ action: '', entity: '', username: '' });

  useEffect(() => {
    loadDashboardData();
  }, [auditFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashRes, auditRes, usersRes] = await Promise.all([
        api.getDashboardMetrics(),
        api.getAuditLogs(auditFilter),
        api.getUsers()
      ]);
      setMetrics(dashRes.metrics);
      setAuditLogs(auditRes.audit_logs);
      setUsersList(usersRes.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setUserLoading(true);
      setUserMsg({ type: '', text: '' });
      await api.createUser(userForm);
      setUserMsg({ type: 'success', text: `Staff account '${userForm.username}' created with Staff Profile!` });
      setUserForm({
        username: '',
        full_name: '',
        password: '',
        role: 'Receptionist',
        employee_number: '',
        license_number: '',
        department: 'Reception'
      });
      setShowUserModal(false);
      loadDashboardData();
    } catch (err) {
      setUserMsg({ type: 'danger', text: err.message || 'Failed to create user' });
    } finally {
      setUserLoading(false);
    }
  };

  return (
    <div>
      {/* Top Banner */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
              Hospital Executive Overview & System Administration
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Real-time analytics, staff directory & profiles, and security audit trail monitoring.
            </p>
          </div>

          <button onClick={() => setShowUserModal(true)} className="btn btn-primary">
            <UserPlus size={18} /> Register Staff User Account
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      {metrics && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon primary">
              <Users size={24} />
            </div>
            <div>
              <div className="stat-value">{metrics.total_patients}</div>
              <div className="stat-label">Total Patients Registered</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon secondary">
              <Calendar size={24} />
            </div>
            <div>
              <div className="stat-value">{metrics.todays_visits}</div>
              <div className="stat-label">Today's Visits ({metrics.active_visits} Active)</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon success">
              <DollarSign size={24} />
            </div>
            <div>
              <div className="stat-value">KSh {metrics.todays_revenue.toLocaleString('en-KE')}</div>
              <div className="stat-label">Today's Revenue Collected</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon warning">
              <Pill size={24} />
            </div>
            <div>
              <div className="stat-value">{metrics.low_stock_count}</div>
              <div className="stat-label">Low Stock Inventory Alerts</div>
            </div>
          </div>
        </div>
      )}

      {/* Staff User Accounts Table with Staff Profiles */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title">
            <BadgeCheck className="text-teal-600" size={20} /> Hospital Staff Members & Profile Directory ({usersList.length})
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Emp No</th>
                <th>Full Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Department</th>
                <th>License No</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map(u => {
                const sp = u.staff_profile || {};
                return (
                  <tr key={u.id}>
                    <td>
                      <span className="badge badge-info" style={{ fontFamily: 'monospace' }}>
                        {sp.employee_number || `EMP-000${u.id}`}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600', color: '#0f172a' }}>{u.full_name}</td>
                    <td style={{ fontFamily: 'monospace' }}>{u.username}</td>
                    <td>
                      <span className="badge badge-info">{u.role}</span>
                    </td>
                    <td>{sp.department || 'General'}</td>
                    <td style={{ fontSize: '13px', color: '#64748b' }}>{sp.license_number || 'N/A'}</td>
                    <td>
                      <span className={`badge ${sp.status === 'Active' ? 'badge-success' : 'badge-secondary'}`}>
                        {sp.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Audit Log Trail */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ShieldCheck className="text-teal-600" size={20} /> System Security & Audit Log History ({auditLogs.length})
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <select
            className="form-control"
            style={{ width: '180px' }}
            value={auditFilter.action}
            onChange={(e) => setAuditFilter({ ...auditFilter, action: e.target.value })}
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="EDIT">EDIT</option>
            <option value="VIEW">VIEW</option>
            <option value="LOGIN">LOGIN</option>
            <option value="DISPENSE">DISPENSE</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="STOCK_ADJUSTMENT">STOCK_ADJUSTMENT</option>
          </select>

          <select
            className="form-control"
            style={{ width: '180px' }}
            value={auditFilter.entity}
            onChange={(e) => setAuditFilter({ ...auditFilter, entity: e.target.value })}
          >
            <option value="">All Entities</option>
            <option value="Patient">Patient</option>
            <option value="Visit">Visit</option>
            <option value="Bill">Bill</option>
            <option value="Drug">Drug</option>
            <option value="StockMovement">StockMovement</option>
            <option value="Staff">Staff</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>Loading audit logs...</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: '600' }}>{l.username}</td>
                    <td><span className="badge badge-info">{l.user_role}</span></td>
                    <td>
                      <span className={`badge ${
                        l.action === 'CREATE' ? 'badge-success' :
                        l.action === 'DISPENSE' ? 'badge-info' :
                        l.action === 'PAYMENT' ? 'badge-success' :
                        l.action === 'EDIT' ? 'badge-warning' : 'badge-secondary'
                      }`}>
                        {l.action}
                      </span>
                    </td>
                    <td>{l.entity} #{l.entity_id || ''}</td>
                    <td style={{ fontSize: '13px' }}>{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Account & Staff Profile Modal */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="card-title">
                <UserPlus size={20} className="text-teal-600" /> Register Staff Member & Staff Profile
              </h3>
              <button onClick={() => setShowUserModal(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-grid" style={{ marginBottom: '16px' }}>
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Dr. Jane Kibaki"
                      value={userForm.full_name}
                      onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Username *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. jkibaki"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Password *</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter account password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Role Assignment *</label>
                    <select
                      className="form-control"
                      value={userForm.role}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        let defaultDept = 'Clinical Services';
                        if (newRole === 'Receptionist') defaultDept = 'Reception';
                        else if (newRole === 'Pharmacist') defaultDept = 'Pharmacy';
                        else if (newRole === 'Cashier') defaultDept = 'Accounts';
                        else if (newRole === 'Admin') defaultDept = 'Administration';

                        setUserForm({ ...userForm, role: newRole, department: defaultDept });
                      }}
                      required
                    >
                      <option value="Receptionist">Receptionist</option>
                      <option value="Doctor">Doctor</option>
                      <option value="Pharmacist">Pharmacist</option>
                      <option value="Cashier">Cashier</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Employee Number (Auto-generated if empty)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. EMP-0007"
                      value={userForm.employee_number}
                      onChange={(e) => setUserForm({ ...userForm, employee_number: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Department *</label>
                    <select
                      className="form-control"
                      value={userForm.department}
                      onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                      required
                    >
                      <option value="Reception">Reception</option>
                      <option value="Clinical Services">Clinical Services</option>
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Accounts">Accounts</option>
                      <option value="Administration">Administration</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>License Number (e.g. KMPDC / Board License)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. KMPDC/2026/9981"
                      value={userForm.license_number}
                      onChange={(e) => setUserForm({ ...userForm, license_number: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowUserModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={userLoading}>
                  {userLoading ? 'Creating...' : 'Create Staff Member Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
