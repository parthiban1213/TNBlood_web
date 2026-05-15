import {
  createContext, useContext, useState, useEffect, useCallback, useRef,
} from 'react';
import { setAuthToken, setOnUnauthorized } from '../lib/api.js';
import { connectSocket, disconnectSocket } from '../lib/socket.js';

const AuthContext = createContext(null);

const LS_TOKEN = 'bl_token';
const LS_USER = 'bl_user';
const LS_EXP = 'bl_expires_at';
const SESSION_MS = 24 * 60 * 60 * 1000; // 24 hours — same as original

export function AuthProvider({ children }) {
  // null while we're still checking localStorage on first render.
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false); // becomes true after restore attempt
  const expiryTimerRef = useRef(null);

  // ── Restore session from localStorage (matches the original behaviour) ──
  useEffect(() => {
    try {
      const t = localStorage.getItem(LS_TOKEN);
      const u = localStorage.getItem(LS_USER);
      const exp = parseInt(localStorage.getItem(LS_EXP) || '0', 10);
      if (t && u) {
        if (Date.now() > exp) {
          // Expired — clear.
          localStorage.removeItem(LS_TOKEN);
          localStorage.removeItem(LS_USER);
          localStorage.removeItem(LS_EXP);
        } else {
          const parsed = JSON.parse(u);
          setToken(t);
          setUser(parsed);
          setAuthToken(t);
          // Schedule auto-logout exactly when the 24h expires.
          scheduleExpiry(exp);
          // Real-time connection.
          connectSocket(t);
        }
      }
    } catch (e) {
      // Corrupted storage — ignore and fall through to login screen.
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 401 from any API call → force logout.
  useEffect(() => {
    setOnUnauthorized(() => doLogout());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleExpiry = useCallback((expiresAt) => {
    clearTimeout(expiryTimerRef.current);
    const ms = expiresAt - Date.now();
    if (ms <= 0) return;
    expiryTimerRef.current = setTimeout(() => {
      doLogout();
      // Toast is fired by AuthContext consumer if desired — keeping AuthContext
      // free of toast coupling here. The original showed a toast on expiry; we
      // can re-add via window.dispatchEvent if needed.
    }, ms);
  }, []);

  const persistAndLogin = useCallback((nextToken, nextUser) => {
    const expiresAt = Date.now() + SESSION_MS;
    localStorage.setItem(LS_TOKEN, nextToken);
    localStorage.setItem(LS_USER, JSON.stringify(nextUser));
    localStorage.setItem(LS_EXP, expiresAt.toString());
    setToken(nextToken);
    setUser(nextUser);
    setAuthToken(nextToken);
    scheduleExpiry(expiresAt);
    connectSocket(nextToken);
  }, [scheduleExpiry]);

  const doLogout = useCallback(() => {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER);
    localStorage.removeItem(LS_EXP);
    setToken(null);
    setUser(null);
    setAuthToken(null);
    clearTimeout(expiryTimerRef.current);
    disconnectSocket();
  }, []);

  // Allow other modules (profile, requests) to update the cached user
  // after edits — matches the original `localStorage.setItem('bl_user', …)`
  // pattern used in 6+ places.
  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(LS_USER, JSON.stringify(next)); } catch (e) { /* ignore */ }
      return next;
    });
  }, []);

  const value = {
    user,
    token,
    ready,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    persistAndLogin,
    doLogout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
