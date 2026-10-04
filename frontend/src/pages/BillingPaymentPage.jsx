import React, { useState, useEffect } from 'react';
import { CreditCard, Printer, CheckCircle, Clock, DollarSign, Smartphone, ShieldCheck, AlertCircle } from 'lucide-react';
import { api } from '../api';
import ReceiptModal from '../components/ReceiptModal';

export default function BillingPaymentPage({ user, defaultVisitId }) {
  const [bills, setBills] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [loading, setLoading] = useState(true);

  // Payment Form State
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // Cash, M-Pesa, Insurance
  const [transactionRef, setTransactionRef] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payMessage, setPayMessage] = useState({ type: '', text: '' });

  // Receipt Modal State
  const [receiptBillId, setReceiptBillId] = useState(null);

  useEffect(() => {
    loadBills();
  }, [statusFilter]);

  useEffect(() => {
    if (defaultVisitId) {
      loadVisitBill(defaultVisitId);
    }
  }, [defaultVisitId]);

  const loadBills = async () => {
    try {
      setLoading(true);
      const res = await api.getBills(statusFilter);
      setBills(res.bills);
      if (res.bills.length > 0 && !selectedBill) {
        setSelectedBill(res.bills[0]);
        setAmountPaid(res.bills[0].balance);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadVisitBill = async (visitId) => {
    try {
      const res = await api.getVisitBill(visitId);
      setSelectedBill(res.bill);
      setAmountPaid(res.bill.balance);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectBill = (bill) => {
    setSelectedBill(bill);
    setAmountPaid(bill.balance);
    setPayMessage({ type: '', text: '' });
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!selectedBill) return;

    try {
      setPayLoading(true);
      setPayMessage({ type: '', text: '' });

      const res = await api.processPayment({
        bill_id: selectedBill.id,
        payment_method: paymentMethod,
        transaction_reference: transactionRef,
        amount_paid: paymentMethod === 'Insurance' ? 0 : parseFloat(amountPaid)
      });

      setPayMessage({
        type: 'success',
        text: `✓ Payment recorded! Status: ${res.bill.status}`
      });
      setSelectedBill(res.bill);
      loadBills();
    } catch (err) {
      setPayMessage({ type: 'danger', text: err.message || 'Payment processing failed' });
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
              Billing, Invoicing & Payment Settlement
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Process Cash and M-Pesa payments, flag insurance pending claims, and issue printed receipts.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setStatusFilter('')}
              className={`btn btn-sm ${statusFilter === '' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All Bills
            </button>
            <button
              onClick={() => setStatusFilter('Unpaid')}
              className={`btn btn-sm ${statusFilter === 'Unpaid' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Unpaid
            </button>
            <button
              onClick={() => setStatusFilter('Insurance Pending')}
              className={`btn btn-sm ${statusFilter === 'Insurance Pending' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Insurance Pending
            </button>
            <button
              onClick={() => setStatusFilter('Paid')}
              className={`btn btn-sm ${statusFilter === 'Paid' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Paid
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Bills List (Left) & Active Bill Payment Panel (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
        
        {/* Left Side: Bills Directory */}
        <div className="card" style={{ padding: '16px' }}>
          <div className="card-header" style={{ marginBottom: '12px' }}>
            <div className="card-title" style={{ fontSize: '15px' }}>
              <CreditCard size={18} className="text-teal-600" /> Patient Bills ({bills.length})
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>Loading bills...</div>
          ) : bills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
              No bills found for selected filter.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '650px', overflowY: 'auto' }}>
              {bills.map(b => {
                const isSelected = selectedBill?.id === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => handleSelectBill(b)}
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
                      <span style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>{b.bill_number}</span>
                      <span className={`badge ${b.status === 'Paid' ? 'badge-success' : b.status === 'Insurance Pending' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                        {b.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total: <strong>KSh {b.total_amount.toLocaleString('en-KE')}</strong></span>
                      <span>Balance: <strong style={{ color: b.balance > 0 ? '#dc2626' : '#059669' }}>KSh {b.balance.toLocaleString('en-KE')}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Detailed Bill Breakdown & Payment Processing */}
        <div>
          {selectedBill ? (
            <div>
              <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #0f766e' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                        Bill #{selectedBill.bill_number}
                      </h3>
                      <span className={`badge ${selectedBill.status === 'Paid' ? 'badge-success' : selectedBill.status === 'Insurance Pending' ? 'badge-warning' : 'badge-danger'}`}>
                        {selectedBill.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                      Generated on: {new Date(selectedBill.created_at).toLocaleString()}
                    </div>
                  </div>

                  <button
                    onClick={() => setReceiptBillId(selectedBill.id)}
                    className="btn btn-primary"
                  >
                    <Printer size={16} /> Official Receipt / Invoice
                  </button>
                </div>
              </div>

              {/* Itemized Charges Table */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-header">
                  <div className="card-title">Itemized Visit Line Items</div>
                </div>

                <table className="table" style={{ marginBottom: '16px' }}>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Item Description</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBill.items.map(item => (
                      <tr key={item.id}>
                        <td>
                          <span className={`badge ${item.item_type === 'Drug' ? 'badge-info' : item.item_type === 'Consultation' ? 'badge-success' : 'badge-warning'}`}>
                            {item.item_type}
                          </span>
                        </td>
                        <td style={{ fontWeight: '500' }}>{item.item_name}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>KSh {item.unit_price.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>KSh {item.total_price.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ width: '280px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                      <span>Total Bill Amount:</span>
                      <strong>KSh {selectedBill.total_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                      <span>Amount Paid to Date:</span>
                      <strong style={{ color: '#059669' }}>KSh {selectedBill.paid_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0f766e', paddingTop: '8px', fontSize: '16px', fontWeight: '800' }}>
                      <span>Remaining Balance:</span>
                      <span style={{ color: selectedBill.balance > 0 ? '#dc2626' : '#059669' }}>
                        KSh {selectedBill.balance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Settlement Panel */}
              {['Cashier', 'Admin'].includes(user.role) && selectedBill.status !== 'Paid' && (
                <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
                  <div className="card-header">
                    <div className="card-title">
                      <DollarSign className="text-emerald-600" size={20} /> Record Payment & Settle Bill
                    </div>
                    <span className="badge badge-success">Cashier Counter</span>
                  </div>

                  {payMessage.text && (
                    <div className={`badge badge-${payMessage.type}`} style={{ display: 'block', padding: '12px', marginBottom: '16px', fontSize: '14px' }}>
                      {payMessage.text}
                    </div>
                  )}

                  <form onSubmit={handleProcessPayment}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Payment Method *</label>
                        <select
                          className="form-control"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          required
                        >
                          <option value="Cash">💵 Cash</option>
                          <option value="M-Pesa">📱 M-Pesa Mobile Money</option>
                          <option value="Insurance">🛡️ Insurance Pending Claim</option>
                        </select>
                      </div>

                      {paymentMethod === 'M-Pesa' && (
                        <div className="form-group">
                          <label>M-Pesa Transaction Reference Code *</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. QKH78921034"
                            value={transactionRef}
                            onChange={(e) => setTransactionRef(e.target.value)}
                            required
                          />
                        </div>
                      )}

                      {paymentMethod !== 'Insurance' && (
                        <div className="form-group">
                          <label>Amount Received (KSh) *</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(e.target.value)}
                            required
                          />
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="submit" className="btn btn-success" disabled={payLoading}>
                        {payLoading ? 'Processing...' : paymentMethod === 'Insurance' ? 'Mark Insurance Pending' : 'Record Payment & Close Bill'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              Select a bill from the left list to process payment or view receipt.
            </div>
          )}
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {receiptBillId && (
        <ReceiptModal
          billId={receiptBillId}
          onClose={() => setReceiptBillId(null)}
        />
      )}
    </div>
  );
}
