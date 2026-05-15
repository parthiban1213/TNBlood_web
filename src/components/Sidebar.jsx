import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function Sidebar({ mobileOpen, onCloseMobile }) {
  const { user, isAdmin, doLogout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar_collapsed') === 'true'
  );
  const [stats, setStats]           = useState({ total: '—', available: '—' });
  const [respondBadge, setRespondBadge] = useState(0);

  function toggle() {
    setCollapsed(c => {
      const next = !c;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  }

  // quick stats
  useEffect(() => {
    apiFetch('/stats').then(res => {
      if (res.success) setStats({
        total:     res.data.totalDonors,
        available: res.data.availableDonors,
      });
    });
  }, []);

  // respond badge (users only)
  const refreshBadge = useCallback(async () => {
    if (!user || isAdmin) return;
    const res = await apiFetch('/requirements?status=Open');
    if (!res.success) return;
    const userBT = user.bloodType || '';
    const pending = res.data.filter(r => {
      if (userBT && r.bloodType !== userBT && !r.acceptAnyBloodType) return false;
      const donated  = (r.donations||[]).some(d => d.donorUsername === user.username);
      const declined = (r.declines ||[]).some(d => d.donorUsername === user.username);
      return !donated && !declined;
    }).length;
    setRespondBadge(pending);
  }, [user, isAdmin]);

  useEffect(() => {
    refreshBadge();
    const t = setInterval(refreshBadge, 30000);
    return () => clearInterval(t);
  }, [refreshBadge]);

  function logout() {
    doLogout();
    navigate('/login', { replace: true });
  }

  const initial = ((user?.firstName || user?.username || '')[0] || '?').toUpperCase();

  // nav-btn using NavLink — gets .active class automatically
  function Btn({ to, id, icon, label, badge, onClick }) {
    if (onClick) {
      // action button (no route)
      return (
        <button id={id} className="nav-btn" onClick={() => { onClick(); onCloseMobile(); }} title={label} type="button">
          <span className="icon">{icon}</span>
          <span className="nav-text">{label}</span>
        </button>
      );
    }
    return (
      <NavLink
        to={to}
        id={id}
        className={({ isActive }) => 'nav-btn' + (isActive ? ' active' : '')}
        onClick={onCloseMobile}
        title={label}
      >
        <span className="icon">{icon}</span>
        <span className="nav-text">{label}</span>
        {badge > 0 && (
          <span id="respond-nav-badge" style={{
            marginLeft: 'auto', background: 'var(--red)', color: '#fff',
            fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-ui)',
            borderRadius: 99, padding: '1px 7px', minWidth: 18,
            textAlign: 'center', lineHeight: 1.6,
          }}>{badge}</span>
        )}
      </NavLink>
    );
  }

  return (
    <>
      <aside
        className={'sidebar' + (collapsed ? ' collapsed' : '') + (mobileOpen ? ' mobile-open' : '')}
        id="sidebar"
        data-testid="sidebar"
      >
        {/* ── Logo ── */}
        <div className="sidebar-logo">
          <div className="logo-row">
            <div className="logo-icon">🩸</div>
            <div className="sidebar-title-wrap">
              <h1>TN<span>Blood</span></h1>
            </div>
          </div>
          <div id="sidebar-role-pill" className="sidebar-pill-wrap">
            <span className={`role-pill ${isAdmin ? 'admin' : 'user'}`}>
              {isAdmin ? '🛡️ Admin' : '👁️ TN user'}
            </span>
          </div>
        </div>

        {/* ── Collapse toggle ── */}
        <button className="sidebar-toggle" id="sidebar-toggle" onClick={toggle} title="Toggle sidebar" type="button">
          <span className="toggle-icon">◀</span>
        </button>

        {/* ── Nav ── */}
        <nav>

          {/* Overview */}
          <span className="nav-label"><span className="nav-label-text">Overview</span></span>
          <Btn to="/dashboard" id="nav-dashboard" icon="📊" label="Dashboard" />

          {/* Registry */}
          <span className="nav-label"><span className="nav-label-text">Registry</span></span>
          <Btn to="/donors" id="nav-donors" icon="👤" label="Donors" />
          {/* Requirements — admin only */}
          {isAdmin && (
            <Btn to="/requirements" id="nav-requirements" icon="🩸" label="Requirements" />
          )}
          <Btn to="/info" id="nav-info" icon="📍" label="Info Directory" />

          {/* Admin section — admin only */}
          {isAdmin && (
            <>
              <span className="nav-label" id="nav-label-admin">
                <span className="nav-label-text">Admin</span>
              </span>
              <Btn to="/users" id="nav-users" icon="👥" label="User Management" />
            </>
          )}

          {/* Actions — admin only */}
          {isAdmin && (
            <>
              <span className="nav-label"><span className="nav-label-text">Actions</span></span>
              <Btn
                id="nav-register-donor"
                icon="➕"
                label="Register Donor"
                onClick={() => navigate('/donors?action=register')}
              />
              <Btn
                id="nav-add-req"
                icon="📋"
                label="Add Requirement"
                onClick={() => navigate('/requirements?action=add')}
              />
              <Btn
                id="nav-export"
                icon="📤"
                label="Export Data"
                onClick={() => navigate('/donors?action=export')}
              />
            </>
          )}

          {/* My Activity — all roles */}
          <span className="nav-label" id="nav-label-myactivity">
            <span className="nav-label-text">My Activity</span>
          </span>
          <Btn to="/my-requests" id="nav-my-requests" icon="📋" label="My Requests" />
          {/* Respond — user only */}
          {!isAdmin && (
            <Btn to="/respond" id="nav-respond" icon="🩸" label="Respond" badge={respondBadge} />
          )}
          {/* Donation History + Rewards — user only */}
          {!isAdmin && (
            <>
              <Btn to="/donation-history" id="nav-donation-history" icon="📖" label="Donation History" />
              <Btn to="/rewards"          id="nav-rewards"          icon="🏆" label="Rewards" />
            </>
          )}

          {/* Account — Security is user only, Profile is all roles */}
          {!isAdmin && (
            <>
              <span className="nav-label" id="nav-label-account">
                <span className="nav-label-text">Account</span>
              </span>
              <Btn to="/security" id="nav-security" icon="🔐" label="Security" />
            </>
          )}
          <Btn to="/profile" id="nav-profile" icon="👤" label="My Profile" />

        </nav>

        {/* ── Quick Stats ── */}
        <div className="sidebar-stats">
          <h4 className="nav-text">Quick Stats</h4>
          <div className="stat-row">
            <span className="nav-text">Total Donors</span>
            <strong id="stat-total">{stats.total}</strong>
          </div>
          <div className="stat-row">
            <span className="nav-text">Available</span>
            <strong id="stat-available">{stats.available}</strong>
          </div>
          <div className="stat-row">
            <span className="nav-text">Blood Types</span>
            <strong>8</strong>
          </div>
        </div>

        {/* ── Bottom user bar ── */}
        <div className="sidebar-bottom">
          <div className="user-info-bar">
            <div
              className="user-avatar"
              id="sidebar-avatar"
              onClick={() => { navigate('/profile'); onCloseMobile(); }}
              title="View my profile"
              style={{ cursor: 'pointer' }}
            >{initial}</div>
            <div
              className="user-info-text"
              onClick={() => { navigate('/profile'); onCloseMobile(); }}
              style={{ cursor: 'pointer' }}
            >
              <div className="uname" id="sidebar-username">{user?.username || '—'}</div>
              <div className="urole" id="sidebar-userrole">
                {isAdmin ? 'Administrator' : 'TN user'}
              </div>
            </div>
            <button
              id="logout-btn"
              className="logout-btn"
              onClick={logout}
              title="Logout"
              type="button"
            >⏻</button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      <div
        className={'sidebar-overlay' + (mobileOpen ? ' active' : '')}
        id="sidebar-overlay"
        data-testid="sidebar-overlay"
        onClick={onCloseMobile}
      />
    </>
  );
}
