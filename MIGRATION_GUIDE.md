# 🛠 Migration Guide — HSBlood (Vanilla JS → React)

This guide tells you how to port the remaining pages from the original
project to React, following the exact pattern shown in
`src/pages/Dashboard.jsx` (the reference migration) and
`src/pages/DonorsPage.jsx` (a partial port with a list + filters).

---

## The core mental model

Vanilla JS pattern → React equivalent:

| Vanilla JS (original) | React (this project) |
|---|---|
| Global `let allDonors = []` | `useState([])` |
| `document.getElementById('x').innerHTML = '...'` | `{x}` in JSX |
| `document.getElementById('x').style.display = 'none'` | `{condition && <X/>}` |
| `onclick="foo()"` in HTML | `onClick={foo}` in JSX |
| `<script src="js/foo.js">` global function | `import { foo } from './foo.js'` |
| `let currentUser = null` (global) | `const { user } = useAuth()` |
| `let authToken = null` (global) | Inside `AuthContext`, accessed via `apiFetch` |
| `fetch(API+'/x')` directly | `await apiFetch('/x')` (handles auth, retry, progress) |
| `showToast('hi')` global | `const { showToast } = useToast()` |
| `setInterval(...)` countdown | `useEffect` with cleanup |
| `localStorage.setItem('bl_user', ...)` after edit | `updateUser(patch)` from `useAuth()` |
| Modal: `openModal('foo-modal')` / hide via class | `useState` boolean + conditional JSX |

---

## Module-by-module mapping

Each original JS file maps to one React page (or component).

| Original file | New React file | Status |
|---|---|---|
| `js/config.js` | `src/lib/config.js` | ✅ Done |
| `js/utils.js` | `src/lib/utils.js` | ✅ Done |
| `js/api.js` | `src/lib/api.js` | ✅ Done |
| `js/auth.js` (admin login) | `src/pages/Login.jsx` | ✅ Done (admin only) |
| `js/auth.js` (OTP / register / forgot-pwd) | `src/pages/Login.jsx` (extend) | 🚧 Stub — see § "Login: OTP & register" |
| `js/auth.js` (change password) | `src/pages/SecurityPage.jsx` (new) | 🚧 Placeholder |
| `js/ui.js` (applyRoleUI, showPage) | `src/components/Sidebar.jsx` + react-router | ✅ Done |
| `js/dashboard.js` | `src/pages/Dashboard.jsx` | ✅ Done (reference) |
| `js/donors.js` (list, filter, view) | `src/pages/DonorsPage.jsx` | ✅ Done (list only) |
| `js/donors.js` (modals: view/edit/register) | `src/pages/DonorsPage.jsx` (extend) | 🚧 Stub — see § "Modals" |
| `js/delete.js` (shared confirm) | `src/components/ConfirmDeleteModal.jsx` (new) | 🚧 Placeholder |
| `js/requirements.js` | `src/pages/RequirementsPage.jsx` (new) | 🚧 Placeholder |
| `js/requests.js` | `src/pages/MyRequestsPage.jsx` + `RespondPage.jsx` | 🚧 Placeholder |
| `js/donationHistory.js` | `src/pages/DonationHistoryPage.jsx` | 🚧 Placeholder |
| `js/rewards.js` | `src/pages/RewardsPage.jsx` | 🚧 Placeholder |
| `js/bulk.js` | `src/components/BulkUploadModal.jsx` | 🚧 Placeholder |
| `js/duplicates.js` | `src/hooks/useDuplicateCheck.js` (new) | 🚧 Placeholder |
| `js/export.js` | `src/components/ExportModal.jsx` | 🚧 Placeholder |
| `js/info.js` | `src/pages/InfoPage.jsx` (Leaflet map) | 🚧 Placeholder |
| `js/notifications.js` | `src/components/NotificationBell.jsx` + context | 🚧 Placeholder |
| `js/profile.js` | `src/pages/ProfilePage.jsx` | 🚧 Placeholder |
| `js/users.js` | `src/pages/UsersPage.jsx` | 🚧 Placeholder |
| `js/animation.js` (drop animation) | `src/components/LoginDropAnimation.jsx` (new) | 🚧 Placeholder |
| `js/animation.js` (session restore) | `src/context/AuthContext.jsx` | ✅ Done |

---

## How to port a typical page (step-by-step)

Let's say you're porting `js/requirements.js`. The shape will look like
this almost exactly for every other page.

### 1. Read the original

```bash
cat ../hsblood/js/requirements.js | less
grep -n 'function ' ../hsblood/js/requirements.js
```

Note the public functions (`loadRequirements`, `openReqModal`, etc.)
and the DOM IDs they touch.

### 2. Find the corresponding HTML section in `index.html`

```bash
grep -n 'page-requirements' ../hsblood/index.html
```

That gives you the JSX skeleton to copy.

### 3. Create the new page file

`src/pages/RequirementsPage.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSocketEvent } from '../hooks/useSocketEvent.js';
import { formatDate } from '../lib/utils.js';

export default function RequirementsPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch('/requirements');
    if (res.success) setItems(res.data);
    else showToast(res.error, 'error');
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // Real-time: splice in new requirements as they're created.
  useSocketEvent('requirement:created', (req) => {
    setItems((prev) => [req, ...prev]);
  });
  useSocketEvent('requirement:updated', (req) => {
    setItems((prev) => prev.map((r) => r._id === req._id ? req : r));
  });

  return (
    <div id="page-requirements" className="page">
      <div className="page-header-row page-header">
        <div>
          <h2>Blood <span>Requirements</span></h2>
          <p>Open requests for blood donations</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            ➕ Add Requirement
          </button>
        )}
      </div>

      {loading ? (
        <div className="spinner"/>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">🩸</div>
          <h4>No requirements yet</h4>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Patient</th><th>Blood</th><th>Units</th><th>Status</th><th>Created</th></tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r._id}>
                  <td>{r.patientName}</td>
                  <td><span className="blood-badge">{r.bloodType}</span></td>
                  <td>{r.unitsRequired}</td>
                  <td>{r.status}</td>
                  <td>{formatDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <RequirementModal
          onClose={() => setModalOpen(false)}
          onSaved={(req) => {
            setItems((prev) => [req, ...prev]);
            setModalOpen(false);
            showToast('Requirement added!', 'success');
          }}
        />
      )}
    </div>
  );
}

function RequirementModal({ onClose, onSaved }) {
  // ... lift the form state from openReqModal/saveReq in requirements.js
}
```

### 4. Wire the route in `App.jsx`

Replace the `<PlaceholderPage title="Requirements" .../>` line with:

```jsx
<Route path="/requirements" element={<RequirementsPage />} />
```

(Don't forget the import.)

### 5. Add real-time emits in the backend

Follow `backend-patch/SOCKETIO_PATCH.md` — add one `emit('requirement:created', ...)`
line in the corresponding POST route in `server.js`. Done.

---

## Special case: Login — porting the OTP & register flow

The OTP flow has state machines (`step-mobile` → `step-otp` → `step-register`)
and timers. Here's the React shape:

```jsx
function Login() {
  const [otpStep, setOtpStep] = useState('mobile'); // 'mobile' | 'otp' | 'register'
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Countdown timer with cleanup
  useEffect(() => {
    if (countdown <= 0) return undefined;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  async function sendOTP() {
    const res = await fetch(API + '/auth/otp/send', { ... });
    if (data.success) {
      setOtpStep('otp');
      setCountdown(60);
    }
  }

  return (
    <>
      {otpStep === 'mobile' && <MobileStep .../>}
      {otpStep === 'otp'    && <OtpStep .../>}
      {otpStep === 'register' && <RegisterStep .../>}
    </>
  );
}
```

Backend endpoints (already implemented — **no server changes needed**):

- `POST /api/auth/otp/send` — send OTP
- `POST /api/auth/otp/verify` — verify the code
- `POST /api/auth/otp/login` — finalise login (returns `{token, user}`)
- `POST /api/auth/otp/register` — register new user (returns `{token, user}`)
- `POST /api/auth/forgot-password` — reset password

On success, call `persistAndLogin(data.token, data.user)` then
`navigate('/dashboard')`. Same pattern as the working admin login.

---

## Special case: Modals (donor register, requirement add, etc.)

Vanilla JS used global modals with `openDonorModal()` / `closeModal()`.
In React, lift them into the page component:

```jsx
function DonorsPage() {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editing, setEditing] = useState(null);     // donor object or null
  const [confirmDelete, setConfirmDelete] = useState(null);

  return (
    <>
      <button onClick={() => setRegisterOpen(true)}>➕ Register Donor</button>
      ...
      {registerOpen && (
        <DonorFormModal
          mode="create"
          onClose={() => setRegisterOpen(false)}
          onSaved={(d) => setDonors(prev => [d, ...prev])}
        />
      )}
      {editing && (
        <DonorFormModal
          mode="edit"
          donor={editing}
          onClose={() => setEditing(null)}
          onSaved={(d) => setDonors(prev => prev.map(x => x._id === d._id ? d : x))}
        />
      )}
      {confirmDelete && (
        <ConfirmDeleteModal
          name={confirmDelete.firstName + ' ' + confirmDelete.lastName}
          onConfirm={async () => {
            await apiFetch('/donors/' + confirmDelete._id, { method: 'DELETE' });
            setDonors(prev => prev.filter(x => x._id !== confirmDelete._id));
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}
```

Modal markup can be copied verbatim from `index.html` — same CSS classes
(`.modal-overlay`, `.modal`, etc.) already work because `main.css` is
imported as-is.

---

## Special case: Leaflet map (info page)

```bash
npm install leaflet
```

```jsx
import { useEffect, useRef } from 'react';
import L from 'leaflet';
// Leaflet's CSS is loaded via the CDN <link> already in index.html.

export default function InfoPage() {
  const mapEl = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    mapRef.current = L.map(mapEl.current).setView([13.0827, 80.2707], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  return <div ref={mapEl} style={{ height: 500, borderRadius: 12 }}/>;
}
```

---

## Special case: Notifications

The notifications module polled the server. In React + Socket.io it can
just listen:

```jsx
// src/context/NotificationsContext.jsx
const [items, setItems] = useState([]);

useEffect(() => {
  apiFetch('/notifications').then(r => r.success && setItems(r.data));
}, []);

useSocketEvent('notification:new', (n) => {
  setItems(prev => [n, ...prev]);
});
```

Add an `emit('notification:new', notification, 'user:' + userId)` in the
server when creating a notification (see SOCKETIO_PATCH.md § "Targeted emits").

---

## Special case: Bulk upload (file → CSV/XLSX → POST)

```bash
npm install xlsx
```

```jsx
import * as XLSX from 'xlsx';

function BulkUploadModal({ onClose }) {
  const [rows, setRows] = useState([]);

  function onFile(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      setRows(XLSX.utils.sheet_to_json(ws));
    };
    reader.readAsBinaryString(file);
  }

  async function upload() {
    await apiFetch('/donors/bulk', {
      method: 'POST',
      body: JSON.stringify({ donors: rows }),
    });
  }
}
```

---

## Special case: Export (download data as XLSX/CSV/JSON)

Same `xlsx` package. The original `js/export.js` already shows the
column mapping — copy it into the new component:

```jsx
function ExportModal() {
  async function exportXlsx() {
    const res = await apiFetch('/donors');
    const ws = XLSX.utils.json_to_sheet(res.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Donors');
    XLSX.writeFile(wb, 'donors.xlsx');
  }
}
```

---

## Rules of thumb

1. **Never reach for `document.getElementById`.** If you find yourself
   wanting to, you need either a `useState` (for data) or a `useRef`
   (for an actual DOM node like a map container).
2. **Lift state up.** If two components need the same data, put it in
   the nearest common parent — or a context if it's app-wide.
3. **Lists need `key` props.** Always use `key={item._id}`, never the
   array index.
4. **Forms need controlled inputs.** Every `<input>` has a `value` and
   an `onChange`. Always.
5. **Use `apiFetch`, not raw `fetch`** — except for pre-auth endpoints
   (login, send-otp, register) which need to run without a token.
6. **Real-time first, polling last.** When you migrate a list page, add
   a `useSocketEvent` listener and an `emit()` on the matching backend
   route. The list will stay live with zero polling overhead.

---

## What's already wired for you

Don't worry about these — they're done in the scaffold:

- ✅ JWT auth flow (`AuthContext` handles token storage, 24h expiry,
      session restore, automatic logout on 401)
- ✅ Route guarding (`<ProtectedRoutes>` redirects to login)
- ✅ Toast notifications (`useToast()`)
- ✅ Top progress bar (auto-driven by `apiFetch`)
- ✅ Socket.io client (auto-connects after login, auto-disconnects on
      logout, reconnects on network drop)
- ✅ Sidebar with role-based item visibility (admin vs user)
- ✅ Mobile drawer with body-scroll lock
- ✅ Sidebar collapsed state persisted to localStorage
- ✅ All your original CSS works as-is — no class renames

Happy porting. 🩸
