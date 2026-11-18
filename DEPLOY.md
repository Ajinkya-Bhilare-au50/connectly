# Deploying Connectly (free): Vercel + Render + MongoDB Atlas

```
 browser ──► Vercel   (Next.js frontend)        https://connectly-xxxx.vercel.app
 browser ──► Render   (FastAPI backend container) https://connectly-api-xxxx.onrender.com/api
                         └──► MongoDB Atlas (database + uploaded images, GridFS)
```

| Part | Where | Cost | Notes |
|---|---|---|---|
| Frontend | Vercel (Hobby) | free | Built from `frontend/` |
| Backend | Render (Free web service) | free | Built from `backend/Dockerfile` (via `render.yaml`) |
| Database | MongoDB Atlas (M0) | free | 512 MB — your existing cluster and data |

> **Free-tier catch:** Render's free service **sleeps after 15 minutes without traffic**. The next visit wakes it
> up, which takes **~30–60 seconds** (the site shows a loading screen meanwhile). Upgrading the Render service to a
> paid plan removes this.

Do the steps **in order** — each one needs an address from the one before.

---

## Step 1 — MongoDB Atlas: allow Render to connect

Render's free services don't have a fixed IP address, so Atlas must accept connections from anywhere. Your
database stays protected by its **username and password**.

1. Open https://cloud.mongodb.com → your project → **SECURITY → Network Access** → **Add IP Address**.
2. Click **Allow access from anywhere** (`0.0.0.0/0`) → **Confirm**.
3. Make sure your database user (**SECURITY → Database Access**) has a **long, random password** — with access
   from anywhere, the password is the only lock.
4. Your connection string is the `MONGO_URI` line in `backend/.env`. You'll paste it into Render in Step 2.
   It must contain the database name, e.g. `…mongodb.net/twitter-clone-db?retryWrites=true&w=majority`.
   **Never paste it anywhere public.**

---

## Step 2 — Render: deploy the backend

1. Go to https://dashboard.render.com and **sign up with GitHub**.
2. **New +** → **Blueprint** → connect your GitHub account if asked → choose the **`connectly`** repository.
3. Render reads [`render.yaml`](render.yaml) and shows a service called **`connectly-api`**. It asks for:
   - **`MONGO_URI`** — paste your Atlas connection string from Step 1.
   - **`CORS_ORIGINS`** — not known yet; enter `https://connectly.vercel.app` for now (fixed in Step 4).
   - **`FRONTEND_URL`** — same placeholder for now.

   `JWT_SECRET` is generated automatically; `ENV=production` turns off the demo-data routes.
4. Click **Apply** / **Deploy**. The first build takes ~5 minutes — watch the **Logs** tab until you see
   `Connected to MongoDB` and `Uvicorn running on http://0.0.0.0:10000`.
5. Copy your service address from the top of the page, e.g. `https://connectly-api-ab12.onrender.com`.
6. Test it: open `https://connectly-api-ab12.onrender.com/api/health` → `{"status":"ok"}`.

---

## Step 3 — Vercel: deploy the frontend

1. Go to https://vercel.com and **sign up with GitHub**.
2. **Add New… → Project** → **Import** the **`connectly`** repository.
3. Configure:
   - **Root Directory** → **Edit** → choose **`frontend`**. (Framework is detected as **Next.js**.)
   - **Environment Variables** → add:

     | Name | Value |
     |---|---|
     | `NEXT_PUBLIC_API_URL` | `https://connectly-api-ab12.onrender.com/api` ← your Render address + `/api` |

4. Click **Deploy** (~2 minutes). Then copy your site address, e.g. `https://connectly-xyz.vercel.app`
   (**Settings → Domains** shows the main one).

---

## Step 4 — Render: allow your Vercel site

1. Render → **connectly-api** → **Environment**.
2. Set both to your Vercel address (no trailing slash):
   - `CORS_ORIGINS` = `https://connectly-xyz.vercel.app`
   - `FRONTEND_URL` = `https://connectly-xyz.vercel.app`
3. **Save Changes** — Render restarts the service (~1–2 minutes).

---

## Step 5 — Try it

Open your Vercel address. The first load may take up to a minute while Render wakes up. Then:

- Sign in with your account (**@tribo**) or a demo account — it's the same Atlas data you use locally.
- Post with a photo, open Notifications, Messages, Explore.

Everyone is signed out once, because the deployed backend has its own `JWT_SECRET`.

---

## Updating the live app

Push to GitHub — both services **rebuild automatically**:

```powershell
git add -A
git commit -m "Describe your change"
git push
```

- Vercel redeploys the frontend in ~2 minutes; Render rebuilds the backend container in ~5 minutes.
- Changed `NEXT_PUBLIC_API_URL`? It's baked in at build time → Vercel → **Deployments** → **⋯ → Redeploy**.

---

## Troubleshooting

| Symptom | Cause → fix |
|---|---|
| Site loads but shows "Can't reach the server" / nothing loads | Backend asleep — wait a minute and refresh. If it persists, check Render **Logs** |
| Browser console: *blocked by CORS policy* | `CORS_ORIGINS` on Render doesn't exactly match your Vercel address (https, no trailing slash) |
| Render logs: `ServerSelectionTimeoutError` / can't connect | Atlas **Network Access** doesn't allow `0.0.0.0/0`, or `MONGO_URI` is wrong |
| Render logs: `bad auth : authentication failed` | Wrong user/password in `MONGO_URI` |
| Requests go to `localhost:3001` | `NEXT_PUBLIC_API_URL` wasn't set on Vercel before building → set it and **Redeploy** |
| Password-reset links point to localhost | Set `FRONTEND_URL` on Render to your Vercel address |
| Atlas storage full | Free tier is 512 MB; uploaded images are stored in the database (GridFS) |

## What runs where (reference)

| Setting | Where it's set | Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Vercel → Environment Variables | Render address + `/api` |
| `MONGO_URI` | Render → Environment | Atlas connection string |
| `JWT_SECRET` | Render (auto-generated) | — |
| `ENV` | `render.yaml` | `production` |
| `CORS_ORIGINS`, `FRONTEND_URL` | Render → Environment | Vercel address |
| `CORS_ORIGIN_REGEX` | `render.yaml` | allows Vercel preview deployments `connectly-*.vercel.app` |
