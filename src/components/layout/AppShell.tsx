'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // On login page, render clean auth card layout without enterprise navigation shell
  if (pathname === '/login') {
    return <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>{children}</main>;
  }

  return (
    <div className="app-container">
      <Sidebar collapsed={collapsed} />
      <div className="main-content">
        <Header onToggleSidebar={() => setCollapsed(!collapsed)} />
        <main className="page-body">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
