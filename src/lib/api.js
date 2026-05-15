// ──────────────────────────────────────────────────────────────
// API fetch wrapper — ported from js/api.js
// ──────────────────────────────────────────────────────────────
// Design note: in vanilla JS this used a global `authToken` variable
// and called doLogout() / showToast() directly. In React we keep
// it framework-agnostic and let the caller plug those in via setters.

import { API } from './config.js';

let _authToken = null;
let _onUnauthorized = null;     // injected by AuthContext: () => { ... }
let _onToast = null;            // injected by ToastContext: (msg, type) => { ... }
let _onProgress = null;         // injected by ProgressBar: (delta) => { ... }

export function setAuthToken(token) { _authToken = token; }
export function getAuthToken() { return _authToken; }
export function setOnUnauthorized(fn) { _onUnauthorized = fn; }
export function setOnToast(fn) { _onToast = fn; }
export function setOnProgress(fn) { _onProgress = fn; }

function authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (_authToken) h['Authorization'] = 'Bearer ' + _authToken;
  return h;
}

export async function apiFetch(url, opts = {}, retries = 2, timeoutMs = 10000) {
  if (_onProgress) _onProgress(+1);
  try {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(API + url, {
          headers: authHeaders(),
          signal: controller.signal,
          ...opts,
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (res.status === 401) {
          if (_onUnauthorized) _onUnauthorized();
          if (_onToast) _onToast('Session expired. Please log in again.', 'error');
          return { success: false };
        }
        return { ...data, status: res.status };
      } catch (e) {
        clearTimeout(timeoutId);
        const isLast = attempt === retries;
        // Don't retry non-GET — avoid duplicate writes.
        const method = (opts.method || 'GET').toUpperCase();
        if (!isLast && method === 'GET') {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1))); // 800, 1600ms
          continue;
        }
        return {
          success: false,
          error: e.name === 'AbortError'
            ? 'Request timed out. Is the backend running?'
            : 'Cannot connect to server.',
        };
      }
    }
  } finally {
    if (_onProgress) _onProgress(-1);
  }
}
