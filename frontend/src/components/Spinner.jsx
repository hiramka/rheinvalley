import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Spinner({ size = 20, text = null, fullScreen = false, inline = false }) {
  if (inline) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <Loader2 className="spin" size={size} />
        {text && <span>{text}</span>}
      </span>
    );
  }

  if (fullScreen) {
    return (
      <div className="full-screen-loader">
        <div className="pulse-loader-ring" style={{ marginBottom: '20px' }}>
          <Loader2 className="spin" size={36} color="#ffffff" />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.2px', marginBottom: '6px' }}>
          CityCare Hospital POS
        </h3>
        <p style={{ fontSize: '13px', color: '#94a3b8' }}>
          {text || 'Connecting to Healthcare API & Loading Records...'}
        </p>
      </div>
    );
  }

  return (
    <div className="loading-overlay">
      <div className="loading-spinner loading-spinner-lg"></div>
      <p style={{ fontSize: '14px', fontWeight: '500' }}>{text || 'Loading records...'}</p>
    </div>
  );
}
