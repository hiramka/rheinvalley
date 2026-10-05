import React, { useState } from 'react';
import { Activity, Lock, User, KeyRound, ShieldAlert, UserPlus, LogIn, BadgeCheck } from 'lucide-react';
import { api } from '../api';

export default function LoginPage({ onLoginSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Receptionist');
  const [department, setDepartment] = useState('Clinical Services');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide both username and password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await api.login(username, password);
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials or backend server status.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !password || !fullName) {
      setError('Please fill out all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await api.register({
        username,
        password,
        full_name: fullName,
        role,
        department
      });
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (user, pass) => {
    setIsRegistering(false);
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">
            <Activity size={32} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>CityCare Hospital</h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Kenya Outpatient POS & Billing System
          </p>
        </div>

        {/* Auth Mode Toggle Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          <button
            type="button"
            className={`btn btn-sm ${!isRegistering ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, border: 'none' }}
            onClick={() => { setIsRegistering(false); setError(''); }}
          >
            <LogIn size={14} style={{ marginRight: '4px' }} /> Sign In
          </button>
          <button
            type="button"
            className={`btn btn-sm ${isRegistering ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, border: 'none' }}
            onClick={() => { setIsRegistering(true); setError(''); }}
          >
            <UserPlus size={14} style={{ marginRight: '4px' }} /> Sign Up Staff
          </button>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: '1.4' }}>
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="badge badge-success" style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BadgeCheck size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {!isRegistering ? (
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Username / Staff ID</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '40px' }}
                  placeholder="Enter staff username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="password"
                  className="form-control"
                  style={{ paddingLeft: '40px' }}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '15px' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label>Full Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Dr. Jane Wanjiru"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label>Username</label>
              <input
                type="text"
                className="form-control"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label>Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label>Role</label>
              <select
                className="form-control"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="Receptionist">📋 Receptionist</option>
                <option value="Doctor">🩺 Doctor</option>
                <option value="Pharmacist">💊 Pharmacist</option>
                <option value="Cashier">💵 Cashier</option>
                <option value="Admin">🔑 Admin</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Department</label>
              <select
                className="form-control"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="Reception">Reception & Records</option>
                <option value="Clinical Services">Clinical Services / Consultation</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Accounts">Accounts & Cashier</option>
                <option value="Administration">Hospital Administration</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '15px' }}
              disabled={loading}
            >
              {loading ? 'Creating Staff Account...' : 'Register Staff Account'}
            </button>
          </form>
        )}

        <div className="demo-buttons" style={{ marginTop: '20px' }}>
          <div style={{ width: '100%', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}>
            Quick Demo Role Login:
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setDemoCredentials('reception', 'reception123')}
          >
            📋 Receptionist
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setDemoCredentials('doctor', 'doctor123')}
          >
            🩺 Doctor
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setDemoCredentials('pharmacy', 'pharmacy123')}
          >
            💊 Pharmacist
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setDemoCredentials('cashier', 'cashier123')}
          >
            💵 Cashier
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setDemoCredentials('admin', 'admin123')}
          >
            🔑 Admin
          </button>
        </div>
      </div>
    </div>
  );
}

