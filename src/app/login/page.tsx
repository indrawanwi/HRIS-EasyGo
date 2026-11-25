'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PRESET_PERSONAS, setStoredUser } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('superadmin@easygo-gps.co.id');
  const [password, setPassword] = useState('easygo123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Autentikasi gagal');
      }

      // Find matching preset or create session
      const matched = PRESET_PERSONAS.find((p) => p.email === identifier || p.empId === identifier) || {
        id: data.user?.id || 'US-CUSTOM',
        empId: data.user?.empId || 'E11',
        name: data.user?.name || identifier,
        email: data.user?.email || identifier,
        roles: data.user?.roles || ['karyawan'],
        positionTitle: data.user?.position_title || 'Staff',
      };

      setStoredUser(matched);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (persona: typeof PRESET_PERSONAS[0]) => {
    setStoredUser(persona);
    router.push('/');
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '460px',
          width: '100%',
          boxShadow: 'var(--sh-3)',
          border: '1px solid var(--line)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--r-xl)',
              background: 'var(--or)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '24px',
              marginBottom: '12px',
              boxShadow: '0 8px 18px rgba(249,115,22,0.3)',
            }}
          >
            EG
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink)' }}>Masuk ke HRIS EasyGo</h2>
          <p style={{ fontSize: '13.5px', color: 'var(--mut)', marginTop: '4px' }}>
            Portal Manajemen SDM & Penggajian Terpadu Neon PostgreSQL
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'var(--red-l)',
              border: '1px solid var(--bad-line)',
              color: 'var(--red-d)',
              padding: '10px 14px',
              borderRadius: 'var(--r-md)',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">NIK atau Email</label>
            <input
              type="text"
              className="form-control"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Contoh: 20110302 atau email@easygo-gps.co.id"
              required
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Kata Sandi</label>
              <span style={{ fontSize: '12px', color: 'var(--or)', cursor: 'pointer' }}>Lupa sandi?</span>
            </div>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '8px', fontSize: '15px' }}
            disabled={loading}
          >
            {loading ? 'Memverifikasi...' : 'Masuk ke Sistem'}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px dashed var(--line)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--mut)', marginBottom: '10px' }}>
            DEMO QUICK LOGIN (PILIH PERSONA):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {PRESET_PERSONAS.slice(0, 4).map((p) => (
              <button
                key={p.empId}
                type="button"
                onClick={() => handleQuickLogin(p)}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '6px 8px' }}
              >
                <span className="badge badge-orange" style={{ padding: '2px 4px', fontSize: '10px' }}>
                  {p.empId}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
