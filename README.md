# TNBlood — React + Express (Single Project)

Full-stack blood donor registry. React frontend + Express/MongoDB backend — both in one folder.

```
hsblood-react/
├── backend/              ← Express API server
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   └── .env.example      ← copy to .env and fill in your values
├── src/                  ← React frontend
├── public/
├── package.json          ← frontend dependencies + helper scripts
├── vite.config.js
└── index.html
```

---

## Quick Start

### 1. Backend setup

```bash
cd backend
cp .env.example .env        # fill in MONGO_URI, JWT_SECRET, Twilio, etc.
npm install
node server.js              # runs on http://localhost:3000
```

### 2. Frontend setup (separate terminal)

```bash
# from the project root (hsblood-react/)
npm install
npm run dev                 # runs on http://localhost:5173
```

The Vite dev server proxies all `/api` and `/socket.io` requests to `:3000` automatically — no CORS config needed during development.

---

## Production build

```bash
npm run build               # outputs to dist/
```

Serve the `dist/` folder from your Express server by adding this to `backend/server.js`:

```js
const path = require('path');
app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});
```

Then run just `node backend/server.js` — it serves both the API and the built frontend.

---

## Deploy to Render

1. Push this folder to a GitHub repo.
2. Create a **Web Service** on Render pointing to the repo.
3. Set **Build command**: `npm install && npm run build && cd backend && npm install`
4. Set **Start command**: `node backend/server.js`
5. Add all env vars from `backend/.env.example` in the Render dashboard.

---

## Default credentials

| Role  | Username | Password |
|-------|----------|----------|
| Admin | `admin`  | `admin123` |
| User  | `user`   | `user123`  |

Change these via env vars: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `USER_USERNAME`, `USER_PASSWORD`.
