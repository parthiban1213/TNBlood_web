import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocketEvent } from '../hooks/useSocketEvent.js';

const POLL_MS = 15000;

function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), day = Math.floor(diff/86400000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (day < 7) return `${day}d ago`;
  return new Date(d).toLocaleDateString();
}

export default function NotificationBell() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen]   = useState(false);
  const timerRef = useRef(null);
  const unread = items.filter(n => !n.isRead).length;

  const fetch_ = useCallback(async () => {
    if (!isAuthenticated) return;
    const res = await apiFetch('/notifications');
    if (res.success) setItems(res.data || []);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) { setItems([]); return; }
    fetch_();
    timerRef.current = setInterval(fetch_, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [isAuthenticated, fetch_]);

  useSocketEvent('notification:new', n => setItems(p => [n, ...p]));

  async function handleClick(n) {
    if (!n.isRead) {
      setItems(p => p.map(x => x._id === n._id ? { ...x, isRead: true } : x));
      apiFetch(`/notifications/${n._id}/read`, { method: 'PUT' }).catch(() => {});
    }
    setOpen(false);
    navigate(isAdmin ? '/requirements' : '/respond');
  }

  async function deleteOne(id, e) {
    e.stopPropagation();
    await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
    setItems(p => p.filter(n => n._id !== id));
  }

  async function markAllRead() {
    await apiFetch('/notifications/read-all', { method: 'PUT' });
    setItems(p => p.map(n => ({ ...n, isRead: true })));
  }

  async function clearAll() {
    await apiFetch('/notifications', { method: 'DELETE' });
    setItems([]);
  }

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Bell button — matches original: 42x42 rounded button with SVG bell icon */}
      <div id="notif-bell-wrap" data-testid="notif-bell-wrap"
        style={{ display: 'inline-flex', position: 'relative' }}>
        <button
          id="notif-bell-btn"
          data-testid="notif-bell-btn"
          onClick={() => setOpen(o => !o)}
          title="Notifications"
          aria-label="Notifications"
          type="button"
          style={{
            position: 'relative', width: 42, height: 42, borderRadius: 12,
            border: '1.5px solid var(--border)', background: '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--text2)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'all .17s',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 17H9m3 0v1a3 3 0 01-6 0v-1m6 0H6m9 0h3M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {unread > 0 && (
            <span id="notif-badge" data-testid="notif-badge" style={{
              display: 'flex', position: 'absolute', top: -6, right: -6,
              background: '#C8102E', color: '#fff', fontFamily: 'var(--font-ui)',
              fontSize: '0.62rem', fontWeight: 800, minWidth: 18, height: 18,
              borderRadius: 9, alignItems: 'center', justifyContent: 'center',
              padding: '0 4px', border: '2px solid #fff',
            }}>{unread > 99 ? '99+' : unread}</span>
          )}
        </button>
      </div>

      {/* Notification panel — matches original positioning and structure */}
      {open && (
        <>
          <div id="notif-overlay" onClick={() => setOpen(false)}
            style={{ display: 'block', position: 'fixed', inset: 0, zIndex: 399 }}/>
          <div id="notif-panel" data-testid="notif-panel" style={{
            display: 'flex', position: 'fixed', top: 68, right: 24,
            width: 380, maxWidth: 'calc(100vw - 32px)',
            background: '#fff', border: '1.5px solid var(--border)',
            borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
            zIndex: 400, flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border2)', flexShrink: 0, gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: '0.88rem', color: 'var(--text)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                🔔 Notifications {unread > 0 && <span style={{ color: 'var(--red)' }}>({unread})</span>}
              </span>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                {unread > 0 && <button id="notif-read-all-btn" data-testid="notif-read-all-btn" onClick={markAllRead} className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>✓ Read all</button>}
                {items.length > 0 && <button id="notif-clear-btn" data-testid="notif-clear-btn" onClick={clearAll} className="btn btn-danger" style={{ padding: '3px 8px', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>🗑 Clear</button>}
                <button onClick={() => setOpen(false)} className="btn btn-outline" style={{ padding: '3px 7px', fontSize: '0.68rem', whiteSpace: 'nowrap' }} title="Close notifications" aria-label="Close">✕</button>
              </div>
            </div>

            {/* List */}
            <div id="notif-list" data-testid="notif-list" style={{ overflowY: 'auto', maxHeight: 420 }}>
              {items.length === 0 ? (
                <div className="notif-empty">🔕 No notifications yet</div>
              ) : items.map(n => (
                <div key={n._id} data-testid="notif-item" className={`notif-item ${n.isRead ? 'read' : 'unread'}`}
                  onClick={() => handleClick(n)} style={{ cursor: 'pointer' }}>
                  <div className="notif-dot"/>
                  <div className="notif-item-body">
                    <div className="notif-item-title">{n.title}</div>
                    <div className="notif-item-msg">{n.message}</div>
                    <div className="notif-item-time">{timeAgo(n.createdAt)}</div>
                  </div>
                  <button className="notif-item-del" title="Dismiss" onClick={e => deleteOne(n._id, e)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
