import React, { useState, useEffect } from 'react';
import { Pill, AlertTriangle, Clock, PlusCircle, ShoppingCart, Search, History, ArrowUpRight, ArrowDownLeft, ShieldAlert, CheckCircle } from 'lucide-react';
import { api } from '../api';
import Spinner from '../components/Spinner';


export default function PharmacyPage({ user, defaultVisitId }) {
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Stock Movement Modal State
  const [selectedDrugMovements, setSelectedDrugMovements] = useState(null);
  const [movementModalData, setMovementModalData] = useState(null);
  const [showRecordMovementModal, setShowRecordMovementModal] = useState(false);

  // Record Movement Form State
  const [movementForm, setMovementForm] = useState({
    movement_type: 'Receipt', // Receipt, Damaged, Adjustment, Return
    quantity: 10,
    reference: ''
  });
  const [movementLoading, setMovementLoading] = useState(false);

  // Dispense Form State
  const [dispenseForm, setDispenseForm] = useState({
    visit_id: defaultVisitId || '',
    drug_id: '',
    quantity: 1
  });
  const [dispenseLoading, setDispenseLoading] = useState(false);
  const [dispenseMsg, setDispenseMsg] = useState({ type: '', text: '' });

  // Add Drug Form State
  const [drugForm, setDrugForm] = useState({
    code: '',
    name: '',
    batch_number: '',
    expiry_date: '',
    quantity: 100,
    unit_price: 50.00,
    reorder_level: 10
  });
  const [drugLoading, setDrugLoading] = useState(false);

  useEffect(() => {
    loadPharmacyData();
  }, [search]);

  useEffect(() => {
    if (defaultVisitId) {
      setDispenseForm(prev => ({ ...prev, visit_id: defaultVisitId }));
    }
  }, [defaultVisitId]);

  const loadPharmacyData = async () => {
    try {
      setLoading(true);
      const [invRes, alertRes, visitRes] = await Promise.all([
        api.getInventory(search),
        api.getPharmacyAlerts(),
        api.getVisits({ status: 'Active' })
      ]);
      setInventory(invRes.drugs);
      setAlerts(alertRes);
      setVisits(visitRes.visits);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewMovements = async (drugId) => {
    try {
      const res = await api.getDrugMovements(drugId);
      setMovementModalData(res);
      setSelectedDrugMovements(res.drug);
    } catch (err) {
      alert(err.message || 'Error loading stock movements');
    }
  };

  const handleRecordMovementSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDrugMovements) return;

    try {
      setMovementLoading(true);
      const res = await api.recordStockMovement(selectedDrugMovements.id, {
        movement_type: movementForm.movement_type,
        quantity: parseInt(movementForm.quantity),
        reference: movementForm.reference
      });
      setShowRecordMovementModal(false);
      setMovementForm({ movement_type: 'Receipt', quantity: 10, reference: '' });
      handleViewMovements(selectedDrugMovements.id);
      loadPharmacyData();
    } catch (err) {
      alert(err.message || 'Failed to record stock movement');
    } finally {
      setMovementLoading(false);
    }
  };

  const handleDispense = async (e) => {
    e.preventDefault();
    if (!dispenseForm.visit_id || !dispenseForm.drug_id) {
      setDispenseMsg({ type: 'danger', text: 'Please select both an active Visit and a Drug' });
      return;
    }

    try {
      setDispenseLoading(true);
      setDispenseMsg({ type: '', text: '' });
      const res = await api.dispenseDrug(
        parseInt(dispenseForm.visit_id),
        parseInt(dispenseForm.drug_id),
        parseInt(dispenseForm.quantity)
      );
      setDispenseMsg({
        type: 'success',
        text: `✓ FEFO Dispensed! ${res.message}`
      });
      setDispenseForm(prev => ({ ...prev, drug_id: '', quantity: 1 }));
      loadPharmacyData();
    } catch (err) {
      setDispenseMsg({ type: 'danger', text: err.message || 'Dispensing failed' });
    } finally {
      setDispenseLoading(false);
    }
  };

  const handleAddDrug = async (e) => {
    e.preventDefault();
    try {
      setDrugLoading(true);
      await api.addDrug({
        code: drugForm.code.toUpperCase(),
        name: drugForm.name,
        batch_number: drugForm.batch_number,
        expiry_date: drugForm.expiry_date,
        quantity: parseInt(drugForm.quantity),
        unit_price: parseFloat(drugForm.unit_price),
        reorder_level: parseInt(drugForm.reorder_level)
      });
      setShowAddForm(false);
      setDrugForm({
        code: '',
        name: '',
        batch_number: '',
        expiry_date: '',
        quantity: 100,
        unit_price: 50.00,
        reorder_level: 10
      });
      loadPharmacyData();
    } catch (err) {
      alert(err.message || 'Failed to add drug batch');
    } finally {
      setDrugLoading(false);
    }
  };

  if (loading) {
    return <Spinner text="Loading FEFO pharmacy inventory & stock batches..." />;
  }

  return (
    <div>

      {/* Top Header Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
              Pharmacy Inventory, FEFO & Stock Movements
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              First Expiry, First Out (FEFO) dispensing with complete stock audit trail (Opening stock, Received, Dispensed, Damaged, Adjusted).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <span className="badge badge-success" style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={14} /> FEFO Dispensing Enabled
            </span>
            {['Pharmacist', 'Admin'].includes(user.role) && (
              <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-primary">
                <PlusCircle size={18} /> Add New Drug Batch
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stock & Expiry Alert Banners */}
      {alerts && (alerts.low_stock_count > 0 || alerts.expiring_soon_count > 0 || alerts.expired_count > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {alerts.low_stock_count > 0 && (
            <div className="card" style={{ borderLeft: '4px solid #f59e0b', backgroundColor: '#fffbeb', marginBottom: 0, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#b45309' }}>
                <AlertTriangle size={20} />
                <h4 style={{ fontWeight: '700', fontSize: '14px' }}>Low Stock Alert ({alerts.low_stock_count})</h4>
              </div>
              <ul style={{ marginTop: '8px', fontSize: '12px', color: '#78350f', paddingLeft: '20px' }}>
                {alerts.low_stock.map(d => (
                  <li key={d.id}>
                    <strong>{d.name}</strong> — Stock: <span style={{ fontWeight: '700', color: '#dc2626' }}>{d.quantity}</span> (Reorder Level: {d.reorder_level})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {alerts.expiring_soon_count > 0 && (
            <div className="card" style={{ borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2', marginBottom: 0, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#b91c1c' }}>
                <Clock size={20} />
                <h4 style={{ fontWeight: '700', fontSize: '14px' }}>Expiring Soon Alert ({alerts.expiring_soon_count})</h4>
              </div>
              <ul style={{ marginTop: '8px', fontSize: '12px', color: '#991b1b', paddingLeft: '20px' }}>
                {alerts.expiring_soon.map(d => (
                  <li key={d.id}>
                    <strong>{d.name}</strong> — Batch: {d.batch_number} (Expires in <strong style={{ color: '#dc2626' }}>{d.days_to_expiry} days</strong> on {d.expiry_date})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Drug Dispensing Card Panel (FEFO) */}
      <div className="card" style={{ borderLeft: '4px solid #0f766e', marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title">
            <ShoppingCart className="text-teal-600" size={20} /> FEFO Medication Dispensing Panel
          </div>
          <span className="badge badge-info">Auto-Selects Earliest Expiring Batch</span>
        </div>

        {dispenseMsg.text && (
          <div className={`badge badge-${dispenseMsg.type}`} style={{ display: 'block', padding: '12px', marginBottom: '16px', fontSize: '14px' }}>
            {dispenseMsg.text}
          </div>
        )}

        <form onSubmit={handleDispense}>
          <div className="form-grid">
            <div className="form-group">
              <label>Select Active Patient Visit *</label>
              <select
                className="form-control"
                value={dispenseForm.visit_id}
                onChange={(e) => setDispenseForm({ ...dispenseForm, visit_id: e.target.value })}
                required
              >
                <option value="">-- Choose Active Outpatient Visit --</option>
                {visits.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.patient?.name} ({v.visit_number} - Doctor: {v.doctor_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Select Medication from Inventory *</label>
              <select
                className="form-control"
                value={dispenseForm.drug_id}
                onChange={(e) => setDispenseForm({ ...dispenseForm, drug_id: e.target.value })}
                required
              >
                <option value="">-- Choose Drug --</option>
                {inventory.map(d => (
                  <option key={d.id} value={d.id} disabled={d.quantity <= 0 || d.is_expired}>
                    {d.name} (Code: {d.code} - Batch: {d.batch_number} - FEFO Exp: {d.expiry_date}) — Current Stock: {d.quantity}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Quantity to Dispense *</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={dispenseForm.quantity}
                onChange={(e) => setDispenseForm({ ...dispenseForm, quantity: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={dispenseLoading}>
              <Pill size={16} />
              {dispenseLoading ? 'FEFO Dispensing...' : 'FEFO Dispense & Bill Patient'}
            </button>
          </div>
        </form>
      </div>

      {/* Drug Inventory Directory Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Pill className="text-teal-600" size={20} /> Drug Inventory & Stock Breakdown ({inventory.length})
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search drug, code, batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading inventory...</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Drug Name</th>
                  <th>Batch No</th>
                  <th>Expiry Date</th>
                  <th style={{ textAlign: 'center' }}>Stock Movements Breakdown</th>
                  <th>Current Stock</th>
                  <th>Unit Price</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(d => {
                  const s = d.stock_summary || {};
                  return (
                    <tr key={d.id}>
                      <td><span className="badge badge-info" style={{ fontFamily: 'monospace' }}>{d.code}</span></td>
                      <td style={{ fontWeight: '600', color: '#0f172a' }}>{d.name}</td>
                      <td>{d.batch_number}</td>
                      <td>
                        {d.expiry_date}
                        {d.is_near_expiry && !d.is_expired && (
                          <span className="badge badge-warning" style={{ fontSize: '10px', marginLeft: '6px' }}>
                            Expiring in {d.days_to_expiry}d
                          </span>
                        )}
                        {d.is_expired && (
                          <span className="badge badge-danger" style={{ fontSize: '10px', marginLeft: '6px' }}>
                            EXPIRED
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '12px' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <span className="badge badge-secondary" title="Opening Stock">Open: {s.opening_stock || 0}</span>
                          <span className="badge badge-success" title="Received Stock">Rec: {s.received || 0}</span>
                          <span className="badge badge-info" title="Dispensed to Patients">Disp: {s.dispensed || 0}</span>
                          <span className="badge badge-danger" title="Damaged/Expired Write-off">Dmg: {s.damaged || 0}</span>
                          <span className="badge badge-warning" title="Stock Adjustments">Adj: {s.adjusted || 0}</span>
                        </div>
                      </td>
                      <td>
                        <strong style={{ fontSize: '16px', color: d.is_low_stock ? '#dc2626' : '#059669' }}>
                          {d.quantity}
                        </strong>
                      </td>
                      <td style={{ fontWeight: '600' }}>KSh {d.unit_price.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleViewMovements(d.id)}
                          className="btn btn-secondary btn-sm"
                          title="View Audit Movements Trail"
                        >
                          <History size={14} /> Stock Movements
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Movements & Breakdown Audit Modal */}
      {selectedDrugMovements && movementModalData && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 className="card-title">
                <History size={20} className="text-teal-600" /> Stock Movements & Audit Breakdown: {selectedDrugMovements.name}
              </h3>
              <button onClick={() => setSelectedDrugMovements(null)} className="btn btn-secondary btn-sm">✕</button>
            </div>
            <div className="modal-body">
              {/* Formula Breakdown Card */}
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '24px' }}>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#64748b', marginBottom: '12px' }}>
                  Stock Reconciliation Formula
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', textAlign: 'center' }}>
                  <div style={{ background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Opening Stock</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{movementModalData.stock_summary.opening_stock}</div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#059669' }}>+ Received</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>{movementModalData.stock_summary.received}</div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#2563eb' }}>- Dispensed</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#2563eb' }}>{movementModalData.stock_summary.dispensed}</div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#dc2626' }}>- Damaged</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626' }}>{movementModalData.stock_summary.damaged}</div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#d97706' }}>+/- Adjusted</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#d97706' }}>{movementModalData.stock_summary.adjusted}</div>
                  </div>

                  <div style={{ background: '#0f766e', color: 'white', padding: '10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', opacity: 0.9 }}>= Current Stock</div>
                    <div style={{ fontSize: '18px', fontWeight: '800' }}>{movementModalData.stock_summary.current_stock}</div>
                  </div>
                </div>
              </div>

              {/* Action Button: Record New Movement */}
              {['Pharmacist', 'Admin'].includes(user.role) && (
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowRecordMovementModal(true)} className="btn btn-primary btn-sm">
                    + Record Stock Receipt / Damaged Write-off / Adjustment
                  </button>
                </div>
              )}

              {/* Movements History Table */}
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>Stock Movement Logs History</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Movement Type</th>
                    <th>Qty Change</th>
                    <th>Reference / Reason</th>
                    <th>Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {movementModalData.movements.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>{new Date(m.created_at).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${
                          m.movement_type === 'Receipt' || m.movement_type === 'Opening Stock' ? 'badge-success' :
                          m.movement_type === 'Dispensed' ? 'badge-info' :
                          m.movement_type === 'Damaged' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {m.movement_type}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700', color: m.quantity > 0 ? '#059669' : '#dc2626' }}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td style={{ fontSize: '13px' }}>{m.reference || '-'}</td>
                      <td style={{ fontSize: '13px' }}>{m.performed_by_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedDrugMovements(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Movement Modal */}
      {showRecordMovementModal && selectedDrugMovements && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="card-title">
                Record Stock Movement for {selectedDrugMovements.name}
              </h3>
              <button onClick={() => setShowRecordMovementModal(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>
            <form onSubmit={handleRecordMovementSubmit}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label>Movement Type *</label>
                  <select
                    className="form-control"
                    value={movementForm.movement_type}
                    onChange={(e) => setMovementForm({ ...movementForm, movement_type: e.target.value })}
                    required
                  >
                    <option value="Receipt">📦 Receipt (Supplier Stock Intake)</option>
                    <option value="Damaged">❌ Damaged / Expired Write-off</option>
                    <option value="Adjustment">⚖️ Inventory Stock Adjustment (+/-)</option>
                    <option value="Return">🔄 Patient/Supplier Return</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label>Quantity *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Enter quantity (positive or negative)"
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                    required
                  />
                  <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                    Note: Damaged will automatically subtract from stock. Receipts will add to stock.
                  </small>
                </div>

                <div className="form-group">
                  <label>Reference / Reason *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Supplier Invoice #9812 or Water Leak Damage"
                    value={movementForm.reference}
                    onChange={(e) => setMovementForm({ ...movementForm, reference: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowRecordMovementModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={movementLoading}>
                  {movementLoading ? 'Saving...' : 'Save Stock Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Drug Batch Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="card-title">
                <PlusCircle size={20} className="text-teal-600" /> Add New Drug Stock Batch
              </h3>
              <button onClick={() => setShowAddForm(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>
            <form onSubmit={handleAddDrug}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Drug Code *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. PAR500"
                      value={drugForm.code}
                      onChange={(e) => setDrugForm({ ...drugForm, code: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Drug Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Paracetamol 500mg"
                      value={drugForm.name}
                      onChange={(e) => setDrugForm({ ...drugForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Batch Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. BCH-2026-09"
                      value={drugForm.batch_number}
                      onChange={(e) => setDrugForm({ ...drugForm, batch_number: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Expiry Date (FEFO Sorted) *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={drugForm.expiry_date}
                      onChange={(e) => setDrugForm({ ...drugForm, expiry_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Opening Stock Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={drugForm.quantity}
                      onChange={(e) => setDrugForm({ ...drugForm, quantity: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Unit Price (KSh) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={drugForm.unit_price}
                      onChange={(e) => setDrugForm({ ...drugForm, unit_price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Reorder Alert Level *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={drugForm.reorder_level}
                      onChange={(e) => setDrugForm({ ...drugForm, reorder_level: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={drugLoading}>
                  {drugLoading ? 'Saving...' : 'Add Drug Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
