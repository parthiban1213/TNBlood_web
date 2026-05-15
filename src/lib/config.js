// ─────────────────────────────────────────────────────────────
// API URL detection
//
// Priority:
//  1. VITE_RENDER_URL env var (set in GitHub Actions / .env.local)
//  2. Hardcoded fallback below — update this to your Render URL
// ─────────────────────────────────────────────────────────────

// Update this to your Render backend URL (no trailing slash).
// OR set VITE_RENDER_URL in GitHub Actions Repository Variables.
const RENDER_URL = import.meta.env.VITE_RENDER_URL || 'https://hsblood.onrender.com';

export const API = (() => {
  const h = window.location.hostname;

  // localhost / 127.0.0.1 → dev, Vite proxies /api to :3000
  if (!h || h === 'localhost' || h === '127.0.0.1') return '/api';

  // LAN IP → backend on same machine
  if (/^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))\.\d+\.\d+$/.test(h))
    return `http://${h}:3000/api`;

  // Running on Render itself (frontend served by Express)
  if (RENDER_URL && window.location.origin === RENDER_URL) return '/api';

  // GitHub Pages / any other HTTPS origin → use Render
  return RENDER_URL + '/api';
})();

// Socket.io endpoint — same server, no /api suffix
export const SOCKET_URL = API.startsWith('http')
  ? API.replace(/\/api$/, '')
  : window.location.origin;
