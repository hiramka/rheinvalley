import React from 'react';
import { Bell, Search, Shield, Hospital } from 'lucide-react';

export default function Topbar({ user, activeTitle, search, setSearch, alerts }) {
  const alertCount = (alerts?.low_stock_count || 0) + (alerts?.expiring_soon_count || 0);

  return (
    <header className="top-bar no-print">
      <div className="page-header">
        <h2>{activeTitle}</h2>
        <p>Outpatient POS & Hospital Billing Management System — Kenya</p>
      </div>

      <div className="top-bar-actions">
        {setSearch !== undefined && (
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search patient, ID, bill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', color: '#334155' }}>
          <Hospital size={16} className="text-teal-600" />
          <span>Active Role: <strong style={{ color: '#0f766e' }}>{user?.role}</strong></span>
        </div>

        {alertCount > 0 && (
          <div className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}>
            <Bell size={14} />
            <span>{alertCount} Inventory Alert{alertCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </header>
  );
}
