import React from 'react';
import { 
  Users, 
  Calendar, 
  Pill, 
  CreditCard, 
  LayoutDashboard, 
  ShieldCheck, 
  LogOut, 
  Activity,
  AlertTriangle,
  Stethoscope
} from 'lucide-react';

export default function Sidebar({ user, activeTab, setActiveTab, alerts, onLogout }) {
  if (!user) return null;

  const role = user.role;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Admin Dashboard',
      icon: LayoutDashboard,
      roles: ['Admin']
    },
    {
      id: 'patients',
      label: 'Patient Registration',
      icon: Users,
      roles: ['Admin', 'Receptionist', 'Doctor', 'Pharmacist', 'Cashier']
    },
    {
      id: 'visits',
      label: 'Visits & Consultations',
      icon: Stethoscope,
      roles: ['Admin', 'Receptionist', 'Doctor', 'Cashier']
    },
    {
      id: 'pharmacy',
      label: 'Pharmacy & Dispensing',
      icon: Pill,
      badge: (alerts?.low_stock_count || 0) + (alerts?.expiring_soon_count || 0),
      roles: ['Admin', 'Pharmacist', 'Doctor']
    },
    {
      id: 'billing',
      label: 'Billing & Payments',
      icon: CreditCard,
      roles: ['Admin', 'Cashier', 'Receptionist']
    },
    {
      id: 'audit',
      label: 'Security & Audit Log',
      icon: ShieldCheck,
      roles: ['Admin']
    }
  ];

  const visibleItems = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className="sidebar no-print">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Activity size={24} />
        </div>
        <div className="sidebar-title">
          <h1>CityCare Hospital</h1>
          <p>POS & Billing System</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <a
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span style={{ flexGrow: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span className="badge badge-warning" style={{ fontSize: '10px', padding: '2px 6px' }}>
                  {item.badge} alert
                </span>
              )}
            </a>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card" style={{ marginBottom: '12px' }}>
          <div className="user-avatar">
            {user.full_name ? user.full_name.charAt(0) : 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user.full_name}</div>
            <div className="user-role-badge">{user.role}</div>
          </div>
        </div>

        <button 
          onClick={onLogout} 
          className="btn btn-secondary" 
          style={{ width: '100%', fontSize: '13px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}
        >
          <LogOut size={16} /> Logout Account
        </button>
      </div>
    </aside>
  );
}
