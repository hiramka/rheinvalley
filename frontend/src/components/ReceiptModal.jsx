import React, { useState, useEffect } from 'react';
import { Printer, X, CheckCircle, Clock, ShieldAlert } from 'lucide-react';
import { api } from '../api';

export default function ReceiptModal({ billId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (billId) {
      loadReceipt();
    }
  }, [billId]);

  const loadReceipt = async () => {
    try {
      setLoading(true);
      const res = await api.getReceipt(billId);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load receipt');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!billId) return null;

  return (
    <div className="modal-overlay no-print-bg">
      <div className="modal-container printable-receipt" style={{ maxWidth: '750px' }}>
        <div className="modal-header no-print">
          <h3 className="card-title">
            <Printer className="w-5 h-5 text-teal-600" /> Official Hospital Receipt / Invoice
          </h3>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '32px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading official receipt...</div>
          ) : error ? (
            <div className="badge badge-danger" style={{ display: 'block', padding: '12px' }}>{error}</div>
          ) : data ? (
            <div>
              {/* Hospital Letterhead */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f766e', paddingBottom: '16px', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f766e', letterSpacing: '-0.5px' }}>
                  {data.hospital_info.name}
                </h1>
                <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#64748b', marginBottom: '6px' }}>
                  {data.hospital_info.tagline}
                </p>
                <div style={{ fontSize: '11px', color: '#475569', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <span>📍 {data.hospital_info.address}</span>
                  <span>📞 {data.hospital_info.phone}</span>
                  <span>KRA PIN: {data.hospital_info.pin}</span>
                </div>
              </div>

              {/* Receipt Header Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Invoice Number</span>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{data.receipt.bill_number}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Date: {data.receipt.date}</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Status</span>
                  <div style={{ marginTop: '4px' }}>
                    {data.receipt.status === 'Paid' ? (
                      <span className="badge badge-success" style={{ fontSize: '13px', padding: '6px 12px' }}>
                        ✓ PAID IN FULL
                      </span>
                    ) : data.receipt.status === 'Insurance Pending' ? (
                      <span className="badge badge-warning" style={{ fontSize: '13px', padding: '6px 12px' }}>
                        ⏳ INSURANCE PENDING
                      </span>
                    ) : (
                      <span className="badge badge-danger" style={{ fontSize: '13px', padding: '6px 12px' }}>
                        UNPAID BALANCE
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Patient & Doctor Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>Patient Details</h4>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>{data.receipt.patient?.name || 'Walk-in Patient'}</div>
                  <div style={{ fontSize: '13px', color: '#475569' }}>Patient No: {data.receipt.patient?.patient_number}</div>
                  <div style={{ fontSize: '13px', color: '#475569' }}>National ID: {data.receipt.patient?.national_id}</div>
                  <div style={{ fontSize: '13px', color: '#475569' }}>Phone: {data.receipt.patient?.phone}</div>
                </div>

                <div>
                  <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>Visit Details</h4>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>Visit Ref: {data.receipt.visit_number}</div>
                  <div style={{ fontSize: '13px', color: '#475569' }}>Attending Doctor: {data.receipt.doctor_name}</div>
                </div>
              </div>

              {/* Itemized Services & Drugs Table */}
              <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: '#0f172a' }}>Itemized Breakdown of Services & Items</h4>
              <table className="table" style={{ marginBottom: '24px' }}>
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
                  {data.receipt.items.map((item, idx) => (
                    <tr key={idx}>
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

              {/* Totals Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                <div style={{ width: '280px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Subtotal:</span>
                    <span style={{ fontWeight: '600' }}>KSh {data.receipt.total_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Amount Paid:</span>
                    <span style={{ fontWeight: '600', color: '#059669' }}>KSh {data.receipt.paid_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0f766e', paddingTop: '8px', fontSize: '16px', fontWeight: '700' }}>
                    <span>Balance Due:</span>
                    <span style={{ color: data.receipt.balance > 0 ? '#dc2626' : '#059669' }}>
                      KSh {data.receipt.balance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment History Breakdown */}
              {data.receipt.payments.length > 0 && (
                <div style={{ marginBottom: '20px', background: '#ecfdf5', padding: '12px 16px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                  <h5 style={{ fontSize: '12px', fontWeight: '700', color: '#065f46', marginBottom: '6px' }}>Payment Transactions</h5>
                  {data.receipt.payments.map((p, pidx) => (
                    <div key={pidx} style={{ fontSize: '12px', color: '#047857', display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span>Mode: <strong>{p.payment_method}</strong> (Ref: {p.transaction_reference})</span>
                      <span>Paid by Cashier ({p.cashier_name}): <strong>KSh {p.amount_paid.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</strong></span>
                    </div>
                  ))}
                </div>
              )}

              {/* Official Stamp Footer */}
              <div style={{ marginTop: '30px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
                <div>
                  <p>Thank you for choosing CityCare Hospital Kenya.</p>
                  <p>Computer Generated Official Billing Receipt.</p>
                </div>
                <div style={{ textAlign: 'center', border: '1px dashed #0f766e', padding: '8px 16px', borderRadius: '6px', color: '#0f766e' }}>
                  <strong>CITYCARE HOSPITAL KENYA</strong><br />
                  <span style={{ fontSize: '9px' }}>STAMP & SIGNATURE</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="modal-footer no-print">
          <button onClick={handlePrint} className="btn btn-primary">
            <Printer size={16} /> Print Receipt
          </button>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
