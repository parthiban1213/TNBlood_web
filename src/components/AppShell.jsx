import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import NotificationBell from './NotificationBell.jsx';

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <div id="app" className="visible" data-testid="app-root">

      {/* Hamburger — mobile only, matches original position */}
      <button
        className="hamburger"
        id="hamburger-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        type="button"
      >☰</button>

      {/* Notification bell — fixed top-right like original */}
      <div style={{
        display: 'none', position: 'fixed', top: 18, right: 24, zIndex: 400,
      }} id="notif-bell-container" className="notif-bell-container">
        <NotificationBell />
      </div>

      {/* Always-visible bell wrapper using a CSS trick — show on desktop only */}
      <style>{`
        @media (min-width: 769px) { #notif-bell-container { display: block !important; } }
        @media (max-width: 768px) { #notif-bell-container { display: block !important; top: 10px !important; right: 60px !important; } }
      `}</style>

      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
