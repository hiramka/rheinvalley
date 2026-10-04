import React, { useState, useEffect } from 'react';
import { Stethoscope, Plus, FileText, DollarSign, UserCheck, Calendar, Activity, CheckCircle, PlusCircle, Printer } from 'lucide-react';
import { api } from '../api';
import ReceiptModal from '../components/ReceiptModal';

export default function VisitBillingPage({ user, preselectedPatient, onGoToBilling, onGoToPharmacy }) {
  const [visits, setVisits] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(!!preselectedPatient);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  
  // Lab Charge state
  const [showLabModal, setShowLabModal] = useState(false);
  const [labForm, setLabForm] = useState({ item_name: '', unit_price: '', quantity: 1 });
  const [labLoading, setLabLoading] = useState(false);

  // Bill Receipt modal state
  const [receiptBillId, setReceiptBillId] = useState(null);

  // New Visit Form state
  const [visitForm, setVisitForm] = useState({
    patient_id: preselectedPatient ? preselectedPatient.id : '',
    doctor_id: '',
    consultation_fee: 1000.00
  });

  const [patients, setPatients] = useState([]);
  const [visitMsg, setVisitMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (preselectedPatient) {
      setVisitForm(prev => ({ ...prev, patient_id: preselectedPatient.id }));
      setShowCreateModal(true);
    }
  }, [preselectedPatient]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vRes, dashRes, pRes] = await Promise.all([
        api.getVisits(),
        api.getDashboardMetrics(),
        api.getPatients()
      ]);
      setVisits(vRes.visits);
      setDoctors(dashRes.available_doctors || []);
      setPatients(pRes.patients || []);
      if (vRes.visits.length > 0 && !selectedVisit) {
        handleSelectVisit(vRes.visits[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVisit = async (visitId) => {
    try {
      const vRes = await api.getVisit(visitId);
      setSelectedVisit(vRes.visit);
      const nRes = await api.getNotes(visitId);
      setNotes(nRes.notes);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateVisit = async (e) => {
    e.preventDefault();
    if (!visitForm.patient_id) {
      setVisitMsg({ type: 'danger', text: 'Please select a patient' });
      return;
    }

    try {
      setVisitMsg({ type: '', text: '' });
      const res = await api.createVisit({
        patient_id: parseInt(visitForm.patient_id),
        doctor_id: visitForm.doctor_id ? parseInt(visitForm.doctor_id) : null,
        consultation_fee: parseFloat(visitForm.consultation_fee)
      });
      setVisitMsg({ type: 'success', text: `Outpatient visit ${res.visit.visit_number} created successfully!` });
      setShowCreateModal(false);
      loadData();
      handleSelectVisit(res.visit.id);
    } catch (err) {
      setVisitMsg({ type: 'danger', text: err.message || 'Failed to create visit' });
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!selectedVisit || !newNoteText.trim()) return;

    try {
      setNoteLoading(true);
      await api.addNote(selectedVisit.id, newNoteText.trim());
      setNewNoteText('');
      const nRes = await api.getNotes(selectedVisit.id);
      setNotes(nRes.notes);
    } catch (err) {
      alert(err.message || 'Failed to record consultation note');
    } finally {
      setNoteLoading(false);
    }
  };

  const handleAddLabCharge = async (e) => {
    e.preventDefault();
    if (!selectedVisit || !labForm.item_name || !labForm.unit_price) return;

    try {
      setLabLoading(true);
      await api.addLabCharge(selectedVisit.id, {
        item_name: labForm.item_name,
        unit_price: parseFloat(labForm.unit_price),
        quantity: parseInt(labForm.quantity)
      });
      setShowLabModal(false);
      setLabForm({ item_name: '', unit_price: '', quantity: 1 });
      handleSelectVisit(selectedVisit.id);
    } catch (err) {
      alert(err.message || 'Failed to add lab charge');
    } finally {
      setLabLoading(false);
    }
  };

  return (
    <div>
      {/* Top Header Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
              Outpatient Visits & Doctor Consultations
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Manage outpatient consultations, clinical text notes, lab charges, and active bills.
            </p>
          </div>

          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <PlusCircle size={18} /> Create Outpatient Visit
          </button>
        </div>
      </div>

      {visitMsg.text && (
        <div className={`badge badge-${visitMsg.type}`} style={{ display: 'block', padding: '12px', marginBottom: '20px', fontSize: '14px' }}>
          {visitMsg.text}
        </div>
      )}

      {/* Main Split Grid Layout: Visits List (Left) & Visit Details / Notes (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
        
        {/* Left Side: Active Visits List */}
        <div className="card" style={{ padding: '16px' }}>
          <div className="card-header" style={{ marginBottom: '12px' }}>
            <div className="card-title" style={{ fontSize: '15px' }}>
              <Stethoscope size={18} className="text-teal-600" /> Active Visits ({visits.length})
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>Loading visits...</div>
          ) : visits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
              No outpatient visits registered today.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '650px', overflowY: 'auto' }}>
              {visits.map(v => {
                const isSelected = selectedVisit?.id === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => handleSelectVisit(v.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #0f766e' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>{v.patient?.name}</span>
                      <span className={`badge ${v.status === 'Active' ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '10px' }}>
                        {v.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Ref: <strong>{v.visit_number}</strong></span>
                      <span>Doctor: {v.doctor_name.split(' ')[1] || v.doctor_name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Selected Visit Details, Notes & Running Bill */}
        <div>
          {selectedVisit ? (
            <div>
              {/* Visit Banner Summary */}
              <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #0f766e' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                        {selectedVisit.patient?.name}
                      </h3>
                      <span className="badge badge-info">{selectedVisit.patient?.patient_number}</span>
                      <span className={`badge ${selectedVisit.status === 'Active' ? 'badge-success' : 'badge-secondary'}`}>
                        Visit Status: {selectedVisit.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', display: 'flex', gap: '20px' }}>
                      <span>National ID: <strong>{selectedVisit.patient?.national_id}</strong></span>
                      <span>Phone: <strong>{selectedVisit.patient?.phone}</strong></span>
                      <span>Gender: <strong>{selectedVisit.patient?.gender}</strong></span>
                      <span>Attending Doctor: <strong>{selectedVisit.doctor_name}</strong></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => onGoToPharmacy(selectedVisit.id)} className="btn btn-secondary btn-sm">
                      💊 Dispense Meds
                    </button>
                    <button onClick={() => onGoToBilling(selectedVisit.id)} className="btn btn-success btn-sm">
                      💵 Process Payment
                    </button>
                  </div>
                </div>
              </div>

              {/* Consultation Text Notes Section */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-header">
                  <div className="card-title">
                    <FileText className="text-teal-600" size={18} /> Clinical Consultation Notes ({notes.length})
                  </div>
                  {['Doctor', 'Admin'].includes(user.role) && (
                    <span className="badge badge-info">Doctor Access Granted</span>
                  )}
                </div>

                {['Doctor', 'Admin'].includes(user.role) && selectedVisit.status === 'Active' && (
                  <form onSubmit={handleAddNote} style={{ marginBottom: '20px' }}>
                    <div className="form-group">
                      <label>Record Clinical Notes / Diagnoses</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Enter clinical examination details, symptoms, diagnoses, or prescriptions..."
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        required
                      />
                    </div>
                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={noteLoading}>
                        {noteLoading ? 'Saving...' : 'Save Consultation Note'}
                      </button>
                    </div>
                  </form>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {notes.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>
                      No clinical notes added for this visit yet.
                    </p>
                  ) : (
                    notes.map(n => (
                      <div key={n.id} style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                          <span>Attending Doctor: <strong>{n.doctor_name}</strong></span>
                          <span>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                        <p style={{ fontSize: '14px', color: '#1e293b', whitespace: 'pre-wrap' }}>{n.notes}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Lab Charges & Running Bill Quick View */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <DollarSign className="text-teal-600" size={18} /> Lab Charges & Visit Charges
                  </div>
                  <button onClick={() => setShowLabModal(true)} className="btn btn-secondary btn-sm">
                    <Plus size={14} /> Add Manual Lab Charge
                  </button>
                </div>

                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                  Add laboratory tests (e.g. Full Blood Count, Malaria Screen, Urinalysis) directly to this patient's running bill.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button onClick={() => onGoToBilling(selectedVisit.id)} className="btn btn-primary btn-sm">
                    View & Pay Running Bill
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              Select an outpatient visit from the list to view notes and billing.
            </div>
          )}
        </div>
      </div>

      {/* Create Outpatient Visit Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="card-title">
                <Stethoscope size={20} className="text-teal-600" /> Create Outpatient Visit
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>
            <form onSubmit={handleCreateVisit}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label>Select Registered Patient *</label>
                  <select
                    className="form-control"
                    value={visitForm.patient_id}
                    onChange={(e) => setVisitForm({ ...visitForm, patient_id: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (No: {p.patient_number} - ID: {p.national_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label>Assign Doctor *</label>
                  <select
                    className="form-control"
                    value={visitForm.doctor_id}
                    onChange={(e) => setVisitForm({ ...visitForm, doctor_id: e.target.value })}
                  >
                    <option value="">-- Unassigned / General Outpatient --</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.full_name} ({d.username})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Consultation Fee (KSh) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={visitForm.consultation_fee}
                    onChange={(e) => setVisitForm({ ...visitForm, consultation_fee: e.target.value })}
                    required
                  />
                  <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                    Will be added automatically as the first item on the patient's running bill.
                  </small>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Visit Creation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lab Charge Modal */}
      {showLabModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="card-title">
                <PlusCircle size={20} className="text-teal-600" /> Add Manual Lab Charge Line Item
              </h3>
              <button onClick={() => setShowLabModal(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>
            <form onSubmit={handleAddLabCharge}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label>Lab Test / Investigation Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Full Blood Count (FBC), Urinalysis, Malaria MP"
                    value={labForm.item_name}
                    onChange={(e) => setLabForm({ ...labForm, item_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Unit Price (KSh) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="1500.00"
                      value={labForm.unit_price}
                      onChange={(e) => setLabForm({ ...labForm, unit_price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={labForm.quantity}
                      onChange={(e) => setLabForm({ ...labForm, quantity: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowLabModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={labLoading}>
                  {labLoading ? 'Adding...' : 'Add Charge to Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
