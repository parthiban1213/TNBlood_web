// ──────────────────────────────────────────────────────────────
// Shared utilities — ported from js/utils.js
// ──────────────────────────────────────────────────────────────

export function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function getInitials(f, l) {
  return ((f || '')[0] + (l || '')[0]).toUpperCase();
}

// Inline SVG donor avatar (works offline, no external fetch).
export function getDonorAvatar() {
  return (
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="12" cy="7" r="3.5" fill="rgba(255,255,255,0.95)"/>' +
      '<path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" ' +
        'stroke="rgba(255,255,255,0.95)" stroke-width="1.8" ' +
        'stroke-linecap="round" fill="none"/>' +
    '</svg>'
  );
}

// Role checks — equivalent to isAdmin() in original.
export function isAdmin(user) {
  return user?.role === 'admin';
}
