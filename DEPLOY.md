# Deployment Guide — Render (backend) + GitHub Pages (frontend)

---

## Overview

```
GitHub repo (main branch)
  │
  ├── push triggers GitHub Actions
  │       └── builds React → deploys to gh-pages branch
  │                               └── GitHub Pages serves it
  │
  └── backend/server.js → deployed manually to Render
                              └── your API on onrender.com
```

---

## PART 1 — Push the project to GitHub

### Step 1.1 — Create a GitHub repository

1. Go to https://github.com/new
2. Name it (e.g. `hsblood-react`) — **remember this name, you need it later**
3. Keep it **Public** (GitHub Pages requires public repos on free plan)
4. Do **NOT** tick "Add a README" or ".gitignore" — your project already has them
5. Click **Create repository**

### Step 1.2 — Push your project

Open a terminal inside your `hsblood-react` folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual values.

---

## PART 2 — Deploy the backend to Render

### Step 2.1 — Create a Render account

Go to https://render.com and sign up (free).

### Step 2.2 — Create a new Web Service

1. Click **New +** → **Web Service**
2. Click **Connect a repository** → connect your GitHub account → select your repo
3. Fill in the settings:

| Field | Value |
|-------|-------|
| **Name** | `hsblood-backend` (or anything you like) |
| **Region** | Choose closest to your users |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Root Directory** | *(leave blank)* |
| **Start Command** | `node server.js` |
| **Instance Type** | Free (or Starter for always-on) |

4. Click **Create Web Service**

### Step 2.3 — Add environment variables

On the Render service page click **Environment** → **Add Environment Variable** and add each of these:

| Key | Value |
|-----|-------|
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | Any long random string (e.g. `openssl rand -hex 32`) |
| `ADMIN_USERNAME` | `admin` (or your preferred admin username) |
| `ADMIN_PASSWORD` | A strong password |
| `USER_USERNAME` | `user` |
| `USER_PASSWORD` | A strong password |
| `TWILIO_ACCOUNT_SID` | From your Twilio console |
| `TWILIO_AUTH_TOKEN` | From your Twilio console |
| `TWILIO_PHONE_NUMBER` | Your Twilio number (e.g. `+14155552671`) |
| `RESEND_API_KEY` | From https://resend.com |
| `MAIL_TO` | Email that receives support messages |
| `MAIL_FROM` | Verified sender in Resend |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `NODE_ENV` | `production` |

> **MongoDB Atlas tip:** In Atlas → Network Access → Add IP Address → click
> **Allow Access from Anywhere** (0.0.0.0/0). Render IPs change, so this is required.

### Step 2.4 — Note your Render URL

After deploy finishes, Render shows your URL at the top of the page:
```
https://hsblood-backend.onrender.com
```
**Copy this URL — you need it in Part 3.**

### Step 2.5 — Test the backend

Open a browser and visit:
```
https://your-app.onrender.com/api/stats
```
You should get a JSON response. If you get an error, check **Logs** on Render.

> **Free tier note:** Render free services spin down after 15 min of inactivity
> and take ~30 seconds to wake up on the first request. Upgrade to Starter ($7/mo)
> for always-on.

---

## PART 3 — Configure the frontend to point to your Render URL

### Step 3.1 — Update the hardcoded Render URL

Open `src/lib/config.js` and update this line with your actual Render URL:

```js
const RENDER_URL = import.meta.env.VITE_RENDER_URL || 'https://YOUR-APP.onrender.com';
```

### Step 3.2 — Set GitHub Actions Repository Variables

This is the cleanest way — no need to edit files every time the URL changes.

1. In your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click the **Variables** tab (not Secrets)
3. Click **New repository variable** and add:

| Name | Value |
|------|-------|
| `VITE_BASE_PATH` | `/hsblood-react/` — **must match your repo name exactly, with slashes** |
| `VITE_RENDER_URL` | `https://hsblood-backend.onrender.com` — your Render URL from Step 2.4 |

> Example: if your repo is `github.com/john/my-blood-app`, set `VITE_BASE_PATH` to `/my-blood-app/`

### Step 3.3 — Push the config change

```bash
git add src/lib/config.js
git commit -m "Set Render URL"
git push
```

This push will automatically trigger GitHub Actions to build and deploy the frontend.

---

## PART 4 — Enable GitHub Pages

### Step 4.1 — Wait for the first GitHub Actions run

Go to your repo → **Actions** tab. You should see a workflow running called
**Deploy to GitHub Pages**. Wait for it to finish (green tick ✅).

It creates a `gh-pages` branch with the built files.

### Step 4.2 — Configure GitHub Pages source

1. Repo → **Settings** → **Pages** (left sidebar)
2. Under **Source** → select **Deploy from a branch**
3. Branch: **gh-pages** / folder: **/ (root)**
4. Click **Save**

### Step 4.3 — Your site is live

After ~60 seconds, GitHub Pages will show your URL:
```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

Open it — you should see the TNBlood login page.

---

## PART 5 — Verify everything works end to end

1. Open `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`
2. Log in with your admin credentials
3. The dashboard should load and show stats from your MongoDB
4. Try registering a donor — it should save
5. Try the OTP flow — SMS should arrive via Twilio

If you see a blank page, open browser DevTools → Console and check for errors.

---

## Common issues and fixes

### "Failed to load" / API errors after login
The frontend can't reach the backend.
- Check `VITE_RENDER_URL` in GitHub Actions variables has no trailing slash
- Visit `https://your-app.onrender.com/api/stats` directly — if it's down, check Render logs
- Free tier: wait 30 seconds for it to wake up and try again

### Blank page on direct URL (e.g. `/dashboard`)
The 404.html redirect isn't working.
- Make sure `public/404.html` exists in your repo
- Make sure `VITE_BASE_PATH` ends with `/` on both sides (e.g. `/hsblood-react/`)

### GitHub Actions failing
- Go to **Actions** tab → click the failed run → expand the failing step
- Most common: Node version mismatch → already set to 20 in the workflow

### OTP not arriving
- Check Twilio credentials in Render environment variables
- Check Twilio console for error logs
- Make sure your Twilio number is active

### Changes not showing on the live site
Every `git push origin main` triggers an automatic redeploy of the frontend.
For backend changes, Render auto-deploys on push too (since the repo is connected).

---

## Updating after this

| What changed | What to do |
|---|---|
| Frontend code | `git add . && git commit -m "..." && git push` — GitHub Actions deploys automatically |
| Backend code | Same push — Render auto-deploys the `backend/` folder |
| Environment variables | Update them on the Render dashboard, then **Manual Deploy** → **Deploy latest commit** |
