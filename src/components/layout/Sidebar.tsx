'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  collapsed?: boolean;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      title: 'Dasbor',
      href: '/',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      ),
    },
    {
      title: 'Data Master',
      href: '/master',
      badge: '21 Tabel',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
        </svg>
      ),
    },
    {
      title: 'Karyawan',
      href: '/employees',
      badge: '11 NIK',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
    },
    {
      title: 'Kehadiran & GPS',
      href: '/attendance',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
    },
    {
      title: 'Permintaan & Approval',
      href: '/requests',
      badge: 'Alur',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ),
    },
    {
      title: 'Rekrutmen & Onboarding',
      href: '/recruitment',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
        </svg>
      ),
    },
    {
      title: 'Penggajian & PPh 21',
      href: '/payroll',
      badge: 'TER & PP58',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ),
    },
    {
      title: 'Audit & Keamanan',
      href: '/audit',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      ),
    },
  ];

  return (
    <aside
      style={{
        width: collapsed ? '72px' : '260px',
        background: 'var(--card)',
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '20px 20px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--r-md)',
            background: 'var(--or)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '18px',
          }}
        >
          EG
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--ink)' }}>EasyGo GPS</div>
            <div style={{ fontSize: '11px', color: 'var(--mut)', fontWeight: 500 }}>HRIS Enterprise v6.3</div>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav style={{ padding: '16px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--r-md)',
                color: isActive ? 'var(--or-d)' : 'var(--ink-2)',
                background: isActive ? 'var(--or-l)' : 'transparent',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13.5px',
                transition: 'all 0.15s ease',
                textDecoration: 'none',
              }}
            >
              <span style={{ color: isActive ? 'var(--or)' : 'var(--mut)', display: 'flex' }}>{item.icon}</span>
              {!collapsed && (
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{item.title}</span>
                  {item.badge && (
                    <span
                      className={`badge ${isActive ? 'badge-orange' : 'badge-gray'}`}
                      style={{ fontSize: '10.5px', padding: '2px 6px' }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer System Status */}
      {!collapsed && (
        <div style={{ padding: '16px', borderTop: '1px solid var(--line)', background: 'var(--seg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)' }}></span>
            <span>Neon DB Connected</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--mut)', marginTop: '4px' }}>
            Branch: <code style={{ fontFamily: 'var(--mono)' }}>main</code>
          </div>
        </div>
      )}
    </aside>
  );
}
