import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { setOnToast } from '../lib/api.js';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ msg: '', type: 'success', show: false });
  const timerRef = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    clearTimeout(timerRef.current);
    setToast({ msg, type, show: true });
    timerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 3200);
  }, []);

  // Wire api.js so non-React code (apiFetch) can trigger toasts too.
  setOnToast(showToast);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Reuses the original .toast styles from main.css */}
      <div id="toast" className={toast.show ? `show ${toast.type}` : ''}>
        {toast.msg}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
