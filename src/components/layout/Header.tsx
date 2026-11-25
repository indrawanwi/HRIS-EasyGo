'use client';

import React, { useEffect, useState } from 'react';
import { PRESET_PERSONAS, getStoredUser, setStoredUser, UserSession } from '@/lib/auth';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const [currentUser, setCurrentUser] = useState<UserSession>(PRESET_PERSONAS[0]);
  const [timeWib, setTimeWib] = useState<string>('');

  useEffect(() => {
    setCurrentUser(getStoredUser());

    const handleAuthChange = () => {
      setCurrentUser(getStoredUser());
    };
    window.addEventListener('easygo_auth_change', handleAuthChange);

    const updateClock = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setTimeWib(formatted + ' WIB');
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);

    return () => {
      window.removeEventListener('easygo_auth_change', handleAuthChange);
      clearInterval(interval);
    };
  }, []);

  const handlePersonaSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = PRESET_PERSONAS.find((p) => p.empId === e.target.value);
    if (selected) {
      setStoredUser(selected);
      setCurrentUser(selected);
    }
  };

  return (
    <header
      style={{
        height: '64px',
        background: 'var(--card)',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onToggleSidebar}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', padding: '6px 10px' }}
          title="Toggle Navigation"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--or)', letterSpacing: '-0.5px' }}>
            HRIS EasyGo
          </span>
          <span className="badge badge-orange" style={{ fontSize: '11px' }}>
            Enterprise
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        {/* Real-time Jakarta Clock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--seg)',
            padding: '5px 12px',
            borderRadius: 'var(--r-md)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--ink-2)',
            fontFamily: 'var(--mono)',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)' }}></span>
          <span>{timeWib || '00:00:00 WIB'}</span>
        </div>

        {/* Persona Switcher Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="persona-select" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--mut)' }}>
            Persona:
          </label>
          <select
            id="persona-select"
            value={currentUser.empId}
            onChange={handlePersonaSelect}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--line-2)',
              background: 'var(--card)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--ink)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {PRESET_PERSONAS.map((p) => (
              <option key={p.empId} value={p.empId}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Current user badge & avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--or), var(--or-d))',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '14px',
              boxShadow: '0 2px 6px rgba(249,115,22,0.3)',
            }}
          >
            {currentUser.empId}
          </div>
          <div style={{ display: 'none', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.2 }}>{currentUser.name}</span>
            <span style={{ fontSize: '11px', color: 'var(--mut)' }}>{currentUser.positionTitle}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
