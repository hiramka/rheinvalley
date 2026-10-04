import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Calendar, Phone, IdCard, HeartHandshake, Eye, PlusCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../api';

export default function PatientRegistrationPage({ user, onStartVisit }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gender: 'Male',
    phone: '',
    national_id: '',
    next_of_kin_name: '',
    next_of_kin_phone: ''
  });

  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const canRegister = ['Admin', 'Receptionist'].includes(user.role);

  useEffect(() => {
    loadPatients();
  }, [search]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const res = await api.getPatients(search);
      setPatients(res.patients);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canRegister) return;

    try {
      setFormLoading(true);
      setMessage({ type: '', text: '' });
      const res = await api.createPatient(formData);
      setMessage({ type: 'success', text: `Patient ${res.patient.name} registered successfully! Patient No: ${res.patient.patient_number}` });
      setFormData({
        name: '',
        dob: '',
        gender: 'Male',
        phone: '',
        national_id: '',
        next_of_kin_name: '',
        next_of_kin_phone: ''
      });
      setShowForm(false);
      loadPatients();
    } catch (err) {
      setMessage({ type: 'danger', text: err.message || 'Failed to register patient' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleViewPatient = async (id) => {
    try {
      const res = await api.getPatient(id);
      setSelectedPatient(res.patient);
    } catch (err) {
      alert(err.message || 'Error loading patient detail');
    }
  };

  return (
    <div>
      {/* Top Banner Actions */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
              Patient Registry & Records Management
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Register new patients, view history, and launch outpatient consultation visits.
            </p>
          </div>

          {canRegister && (
            <button
              onClick={() => setShowForm(!showForm)}
              className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'}`}
            >
              <UserPlus size={18} />
              {showForm ? 'Cancel Registration' : 'Register New Patient'}
            </button>
          )}
        </div>
      </div>

      {message.text && (
        <div className={`badge badge-${message.type}`} style={{ display: 'block', padding: '12px', marginBottom: '20px', fontSize: '14px' }}>
          {message.text}
        </div>
      )}

      {/* Registration Form Modal/Card */}
      {showForm && (
        <div className="card" style={{ borderLeft: '4px solid #0f766e' }}>
          <div className="card-header">
            <div className="card-title">
              <UserPlus className="text-teal-600" size={20} /> Patient Registration Form
            </div>
            <span className="badge badge-info">Role Authorized: {user.role}</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  placeholder="e.g. John Kamau Njoroge"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Date of Birth *</label>
                <input
                  type="date"
                  name="dob"
                  className="form-control"
                  value={formData.dob}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Gender *</label>
                <select
                  name="gender"
                  className="form-control"
                  value={formData.gender}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="text"
                  name="phone"
                  className="form-control"
                  placeholder="e.g. 0712 345678"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>National ID Number *</label>
                <input
                  type="text"
                  name="national_id"
                  className="form-control"
                  placeholder="e.g. 12345678"
                  value={formData.national_id}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Next of Kin Full Name *</label>
                <input
                  type="text"
                  name="next_of_kin_name"
                  className="form-control"
                  placeholder="e.g. Mary Wanjiku Njoroge"
                  value={formData.next_of_kin_name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Next of Kin Phone *</label>
                <input
                  type="text"
                  name="next_of_kin_phone"
                  className="form-control"
                  placeholder="e.g. 0712 987654"
                  value={formData.next_of_kin_phone}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={formLoading}>
                {formLoading ? 'Saving...' : 'Complete Registration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Patient Directory Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Users className="text-teal-600" size={20} /> Registered Patients Directory ({patients.length})
          </div>

          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, ID, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading patient registry...</div>
        ) : patients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            No patient records found. {search ? 'Try clearing your search query.' : 'Click "Register New Patient" to add one.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient No</th>
                  <th>Full Name</th>
                  <th>Gender / DOB</th>
                  <th>Phone Number</th>
                  <th>National ID</th>
                  <th>Next of Kin</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id}>
                    <td>
                      <span className="badge badge-info" style={{ fontFamily: 'monospace' }}>
                        {p.patient_number}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600', color: '#0f172a' }}>{p.name}</td>
                    <td>{p.gender} ({p.dob})</td>
                    <td>{p.phone}</td>
                    <td style={{ fontFamily: 'monospace' }}>{p.national_id}</td>
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>{p.next_of_kin_name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{p.next_of_kin_phone}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleViewPatient(p.id)}
                          className="btn btn-secondary btn-sm"
                          title="View Profile & Visits"
                        >
                          <Eye size={14} /> Profile
                        </button>

                        <button
                          onClick={() => onStartVisit(p)}
                          className="btn btn-primary btn-sm"
                          title="Create New Outpatient Visit"
                        >
                          <PlusCircle size={14} /> Create Visit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Patient Detail Modal */}
      {selectedPatient && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="card-title">
                <Users size={20} className="text-teal-600" /> Patient Profile: {selectedPatient.name}
              </h3>
              <button onClick={() => setSelectedPatient(null)} className="btn btn-secondary btn-sm">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid" style={{ marginBottom: '20px' }}>
                <div><strong>Patient Number:</strong> {selectedPatient.patient_number}</div>
                <div><strong>National ID:</strong> {selectedPatient.national_id}</div>
                <div><strong>Phone:</strong> {selectedPatient.phone}</div>
                <div><strong>Gender / DOB:</strong> {selectedPatient.gender} ({selectedPatient.dob})</div>
                <div><strong>Next of Kin:</strong> {selectedPatient.next_of_kin_name} ({selectedPatient.next_of_kin_phone})</div>
                <div><strong>Registration Date:</strong> {new Date(selectedPatient.created_at).toLocaleDateString()}</div>
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                Past Visit History ({selectedPatient.visits?.length || 0})
              </h4>

              {selectedPatient.visits && selectedPatient.visits.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Visit Ref</th>
                      <th>Date</th>
                      <th>Doctor</th>
                      <th>Fee</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPatient.visits.map(v => (
                      <tr key={v.id}>
                        <td>{v.visit_number}</td>
                        <td>{new Date(v.created_at).toLocaleDateString()}</td>
                        <td>{v.doctor_name}</td>
                        <td>KSh {v.consultation_fee.toLocaleString('en-KE')}</td>
                        <td>
                          <span className={`badge ${v.status === 'Active' ? 'badge-success' : 'badge-secondary'}`}>
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: '#64748b', fontSize: '13px' }}>No recorded visits for this patient yet.</p>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => {
                  const pt = selectedPatient;
                  setSelectedPatient(null);
                  onStartVisit(pt);
                }}
                className="btn btn-primary"
              >
                <PlusCircle size={16} /> Create Outpatient Visit
              </button>
              <button onClick={() => setSelectedPatient(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
