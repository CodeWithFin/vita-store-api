'use client';

import { useState } from 'react';
import DashboardSidebar from '@/components/DashboardSidebar';

export default function DashboardShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function openSidebar() {
    setSidebarOpen(true);
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    setSidebarOpen(false);
    document.body.style.overflow = '';
  }

  return (
    <div className="dash-app">
      <div
        className={`dash-backdrop ${sidebarOpen ? 'is-open' : ''}`}
        onClick={closeSidebar}
        aria-hidden={!sidebarOpen}
      />
      <DashboardSidebar
        username={username}
        open={sidebarOpen}
        onNavigate={closeSidebar}
      />
      <div className="dash-main">
        <header className="dash-mobile-header">
          <button
            className="btn btn-outline"
            type="button"
            aria-label="Open menu"
            onClick={openSidebar}
          >
            Menu
          </button>
          <strong>Vitapharm</strong>
        </header>
        <div className="dash-content">{children}</div>
      </div>
    </div>
  );
}
