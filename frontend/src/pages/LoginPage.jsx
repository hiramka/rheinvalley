import React, { useState } from 'react';
import { Activity, Lock, User, KeyRound, ShieldAlert } from 'lucide-react';
import { api } from '../api';

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide both username and password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await api.login(username, password);
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (user, pass) => {
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

        {error && (
          <div className="badge badge-danger" style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

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

        <div className="demo-buttons">
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
