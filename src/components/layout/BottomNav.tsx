'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    {
      title: 'Dasbor',
      href: '/',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
    },
    {
      title: 'Absensi',
      href: '/attendance',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
    },
    {
      title: 'Permintaan',
      href: '/requests',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      ),
    },
    {
      title: 'Payroll',
      href: '/payroll',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ),
    },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--card)',
        borderRadius: 'var(--r-pill)',
        padding: '8px 20px',
        boxShadow: 'var(--sh-3)',
        border: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        gap: '28px',
        zIndex: 90,
      }}
      className="mobile-bottom-nav"
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              color: isActive ? 'var(--or)' : 'var(--mut)',
              fontSize: '11px',
              fontWeight: isActive ? 700 : 500,
              textDecoration: 'none',
              padding: '4px 6px',
            }}
          >
            {tab.icon}
            <span>{tab.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
