# Connectly — Next.js · FastAPI · MongoDB

A social network: posts with photos, videos, polls and events, hashtags & trends, notifications,
direct messages, lists, bookmarks, light/dark themes. UI follows `DDEsign.md`.

```
frontend/   Next.js 16 (App Router, React 19, styled-components, TanStack Query)  → http://localhost:3000
backend/    FastAPI + PyMongo (async)                                           → http://localhost:3001/api
MongoDB     any MongoDB (local or Atlas); files are stored in MongoDB (GridFS)
```

## Deploy

Free hosting with Vercel (frontend) + Render (backend container) + MongoDB Atlas: see [DEPLOY.md](DEPLOY.md).

## Run with Docker (everything in containers)

Requires Docker Desktop. From the project folder:

```powershell
Copy-Item .env.example .env      # first time only — then set MONGO_PASSWORD and JWT_SECRET
docker compose up -d --build
```

Open http://localhost:3000 (API docs: http://localhost:3001/api/docs). MongoDB runs in a container with its
data in the `connectly_mongo-data` volume. See [dockerguide.md](dockerguide.md) for all commands, loading demo
data, and using Atlas instead.

## Run without Docker

### 1. Backend

Windows PowerShell — run each line separately (PowerShell 5.1 does not support `&&`):

```powershell
cd backend
python -m venv .venv                        # first time only
.\.venv\Scripts\python.exe -m pip install -r requirements.txt   # first time only
Copy-Item .env.example .env                 # first time only, then set MONGO_URI and JWT_SECRET
.\.venv\Scripts\python.exe run.py
```

macOS / Linux:

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
.venv/bin/python run.py
```

Interactive API docs: http://localhost:3001/api/docs

### 2. Frontend

```powershell
cd frontend
npm install                                 # first time only
Copy-Item .env.example .env.local           # first time only (NEXT_PUBLIC_API_URL=http://localhost:3001/api)
npm run dev
```

### Seed data (development only)

`POST http://localhost:3001/testData/seed` **deletes this app's data** (users, profiles, posts, uploads,
notifications, messages, lists) and loads `backend/data/database-seed.json`.
These routes only exist when `ENV=development` or `ENV=test`.
The demo accounts' password is `SEED_DEFAULT_USER_PASSWORD` in `backend/.env`.

### Password reset emails

No email service is configured. The reset link is written to the backend log, and in
`ENV=development` it is also shown on the "Forgot password" screen. Set `FRONTEND_URL` in
`backend/.env` so links point at your site. Plug an email provider into
`app/routers/auth.py → forgot_password` before going to production.

## Backend layout

| File | Purpose |
|---|---|
| `app/main.py` | App, CORS, gzip, routers under `/api` |
| `app/config.py` | Settings from `.env` |
| `app/db.py` | Mongo connection + indexes (incl. TTL for reset tokens) |
| `app/security.py` | bcrypt passwords, JWT |
| `app/deps.py` | `get_current_user`, `get_optional_user`, `require_rights(...)` |
| `app/schemas.py` | Request validation (Pydantic) |
| `app/errors.py` | Errors as `{"message": ...}`; invalid input → 400 |
| `app/social.py` | Hashtags/mentions, notifications, per-viewer poll results |
| `app/uploads.py` | Image & video storage in MongoDB GridFS |
| `app/routers/` | `auth`, `users`, `profiles`, `tweets`, `uploads`, `notifications`, `conversations`, `lists`, `test_data` |

## API

| Method | Path | Auth |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | public |
| POST | `/api/auth/forgot-password` `{email}` (same answer whether or not the account exists) | public |
| POST | `/api/auth/reset-password` `{token, password}` (token: 30 min, single use) | public |
| GET / POST | `/api/users` | admin |
| GET / PATCH / DELETE | `/api/users/{userId}` | owner or admin |
| GET | `/api/profiles` (filters: `following`, `followers`, `likes`, `retweets`, `q`), `/api/profiles/{userId}`, `/api/profiles/by-username/{username}` | public |
| PATCH | `/api/profiles/{userId}` | owner or admin |
| POST / DELETE | `/api/profiles/follow/{userId}` | logged in |
| GET | `/api/tweets` (filters: `author`, `likes`, `retweets`, `replyTo`, `q`, `hashtag`, `includeReplies`, `hasImage`, `hasMedia`), `/api/tweets/{tweetId}` | public |
| GET | `/api/tweets/trending` (most engagement), `/api/tweets/trends` (top hashtags + post counts) | public |
| GET | `/api/tweets/feed` | logged in |
| POST | `/api/tweets` `{text, image? \| video? \| poll? \| event?, replyTo?}` | logged in |
| POST | `/api/tweets/{tweetId}/vote` `{option}` (one anonymous vote per person) | logged in |
| PATCH / DELETE | `/api/tweets/{tweetId}` | author or admin |
| POST / DELETE | `/api/tweets/like/{id}`, `/api/tweets/retweet/{id}`, `/api/tweets/bookmark/{id}` | logged in |
| GET | `/api/tweets/bookmarks`, `/api/tweets/bookmarks/ids` (private) | logged in |
| GET | `/api/notifications` (`type=mention,reply`, `unreadOnly`), `/api/notifications/unread-count` | logged in |
| POST | `/api/notifications/read-all`, `/api/notifications/{id}/read` | logged in |
| GET / POST | `/api/conversations` (POST `{userId}` opens or reuses a chat), `/api/conversations/unread-count` | logged in |
| GET / POST | `/api/conversations/{id}/messages` (`before`/`after` for history & polling), POST `/api/conversations/{id}/read` | participants |
| GET / POST | `/api/lists`; GET / PATCH / DELETE `/api/lists/{id}` | owner (public lists readable by all) |
| GET | `/api/lists/{id}/members`, `/api/lists/{id}/tweets`; POST / DELETE `/api/lists/{id}/members/{userId}` | owner to edit |
| POST | `/api/uploads` (multipart `file`) → `{url, kind}` | logged in |
| GET | `/api/uploads/{id}` (cached forever; supports Range for video seeking) | public |

### Posts, media & privacy

- Upload first, then use the returned URL in the post / avatar / cover.
- Images: JPEG, PNG, GIF, WebP ≤ 5 MB, resized in the browser (strips EXIF/GPS). Videos: MP4/WebM ≤ 50 MB.
  The real file type is checked on the server; you can only attach your own uploads.
- `#hashtags` and `@mentions` are extracted on the server; mentioned people get a notification.
- Poll votes are anonymous (only counts are returned, plus the viewer's own choice).
- Bookmarks and private lists are never returned to anyone but their owner.
- Deleting a post or an account cleans up its uploads, notifications, messages and list memberships.

## Frontend routes

| URL | Page |
|---|---|
| `/` | Home: "For you" / "Following" tabs + composer (Photo, Video, Poll, Event) |
| `/explore` (`?q=`, `?hashtag=`, `?tab=people\|hashtags`) | Search posts, people and hashtags; trending when empty |
| `/notifications` | All / Mentions, unread highlighting, mark all as read |
| `/messages`, `/messages/[id]` | Conversation list + chat (polls for new messages) |
| `/bookmarks` | Your saved posts (private) |
| `/lists`, `/lists/[id]` | Your lists; list timeline and members |
| `/profile/[userId]` (+ `/with_replies`, `/media`, `/likes`, `/following`, `/followers`) | Profile with tabs |
| `/u/[username]` | Resolves `@mention` links to the profile |
| `/[userId]/status/[tweetId]` | Post + replies (opens as a modal inside the app) |
| `/compose/tweet` | Create Post (modal inside the app; confirms before discarding a draft) |
| `/signin`, `/signup`, `/forgot-password`, `/reset-password` | Authentication (split layout) |
| `/settings`, `/edit-profile` | Account, display (light/dark/system), delete account |
| `/help`, `/terms`, `/privacy` | Help & Support, Terms of Service, Privacy Policy (templates) |
