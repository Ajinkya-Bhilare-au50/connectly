# Docker Guide — learning containerization with Connectly

A step-by-step path from "what is a container?" to deploying Connectly with Docker.
Do one lesson at a time, try everything on your machine, then move on.

## Progress

- [x] Lesson 1 — Mental model + install ✅
- [x] Lesson 2 — Running other people's images (MongoDB in a container) ✅
- [x] Lesson 3 — Data & configuration (volumes, environment variables) ✅
- [ ] **Lesson 4** — Your first Dockerfile (FastAPI backend)
- [ ] Lesson 5 — Multi-stage builds (Next.js frontend)
- [ ] Lesson 6 — Networking (containers talking to each other)
- [ ] Lesson 7 — Docker Compose (the whole stack, one command)
- [ ] Lesson 8 — Production habits (small, secure images; secrets; health checks)
- [ ] Lesson 9 — Registries (Docker Hub / GitHub Container Registry)
- [ ] Lesson 10 — Deployment (real server, HTTPS, GitHub Actions)
- [ ] Lesson 11 — What's next (Kubernetes: when and why)

## Connectly's Docker setup (ready to use)

The whole app is already containerized — the remaining lessons explain *how and why* it works, piece by
piece (multi-stage builds → Lesson 5, networking → Lesson 6, Compose → Lesson 7, production habits → Lesson 8).

| File | What it is |
|---|---|
| `docker-compose.yml` | The three services (mongo, backend, frontend), their network and the `mongo-data` volume |
| `backend/Dockerfile` | Your Lesson 4 Dockerfile + a non-root user, a health check and `--proxy-headers` |
| `frontend/Dockerfile` | Multi-stage build: install → build → small runtime image (Next.js *standalone* output) |
| `*/.dockerignore` | Keeps secrets, `node_modules`, `.venv`, build output out of the images |
| `.env.example` → `.env` | Settings for Compose: database password, JWT secret, ports, public URLs (`.env` is git-ignored) |

```
browser ──► frontend  (Next.js, :3000)
browser ──► backend   (FastAPI, :3001) ──► mongo (MongoDB, private network only — no port on your PC)
                                             └── volume connectly_mongo-data (survives `down`)
```

**Run it** (from the project folder, in Windows Terminal):

```powershell
docker compose up -d --build     # build images + start everything (first time ~2 min)
docker compose ps                # all three should say (healthy)
```

Open http://localhost:3000. Stop your *local* backend/frontend first — they use the same ports.

**Everyday commands**

| Command | What it does |
|---|---|
| `docker compose ps` | Status and health of each service |
| `docker compose logs -f backend` | Follow one service's logs (Ctrl+C stops following) |
| `docker compose up -d --build` | Rebuild after code changes and restart what changed |
| `docker compose restart backend` | Restart one service |
| `docker compose down` | Stop and remove containers + network — **data is kept** in the volume |
| `docker compose down -v` | ⚠️ Also delete the volume — **all data in the container database is lost** |
| `docker compose exec backend sh` | Open a shell inside the running backend |

**Data in the container database**

The `mongo` container starts empty. Load demo content (only works with `APP_ENV=development`):

```powershell
Invoke-WebRequest -Method Post http://localhost:3001/testData/seed -UseBasicParsing
docker compose exec backend python -m scripts.generate_people
```

To use **MongoDB Atlas** instead, set `MONGO_URI=…` in `.env` (see `.env.example`) and run
`docker compose up -d` — the backend then ignores the mongo container's database.

**Settings that matter (`.env`)**

- `MONGO_PASSWORD`, `JWT_SECRET` — random, generated for you; letters/numbers only. Never commit `.env`.
- `MONGO_PASSWORD` only applies the first time the volume is created (Lesson 3 gotcha).
- `PUBLIC_API_URL` is **baked into the frontend at build time** (`NEXT_PUBLIC_…`). After changing it, rebuild:
  `docker compose up -d --build frontend`.
- `APP_ENV=production` when deploying (turns off the `/testData` routes).

## Roadmap

| # | Lesson | You'll be able to… |
|---|---|---|
| 1 | Mental model + install | Explain images, containers and registries; run your first container |
| 2 | Running other people's images | Run MongoDB in a container; use ports, logs, `exec`, stop/remove |
| 3 | Data & configuration | Keep data with volumes; pass settings with environment variables |
| 4 | Your first Dockerfile | Containerize the **FastAPI backend**; understand layers and caching |
| 5 | Multi-stage builds | Containerize the **Next.js frontend** as a small production image |
| 6 | Networking | Let frontend → backend → database find each other by name |
| 7 | Docker Compose | Start the whole stack with one command |
| 8 | Production habits | Small & secure images, non-root users, no secrets in images, health checks |
| 9 | Registries | Push images to Docker Hub or the GitHub Container Registry |
| 10 | Deployment | Run it on a real server with HTTPS; build images automatically with GitHub Actions |
| 11 | What's next | When you'd need Kubernetes (and when you wouldn't) |

---

## Lesson 1 — The mental model

### The problem

Today, running Connectly on another computer means installing the right Python version, creating a
venv, `pip install`, the right Node version, `npm install`, setting environment variables… Any
difference between machines ("works on my machine!") breaks things.

**Docker packages an app *together with everything it needs to run*** into one unit that runs the
same way everywhere — your laptop, a teammate's Mac, or a cloud server.

### The four words

| Word | Meaning | Analogy |
|---|---|---|
| **Image** | A read-only *template*: e.g. "Python 3.12 + my backend code + its packages" | a **class** |
| **Container** | A *running instance* of an image. One image → many containers | an **object** |
| **Dockerfile** | The *recipe* (a text file) that describes how to build an image | source code |
| **Registry** | An *online store* for images (Docker Hub, GitHub Container Registry). You `pull` and `push` | npm / PyPI |

```
Dockerfile  ──docker build──▶  Image  ──docker run──▶  Container
                                 │  ▲
                        docker push  docker pull
                                 ▼  │
                              Registry
```

### Container vs. virtual machine

- A **virtual machine** runs a whole operating system: heavy, minutes to boot, gigabytes in size.
- A **container** shares the host's operating-system kernel and only isolates the app's files,
  processes and network: starts in about a second, often a few hundred MB.
- On Windows, Docker Desktop runs one small Linux VM (WSL 2) behind the scenes; all your
  containers share it.

### How this maps to Connectly (where we're heading)

```
┌──────────── docker compose ────────────┐
│  frontend   (Next.js)    :3000          │
│  backend    (FastAPI)    :3001          │
│  mongo      (MongoDB)    :27017 + data  │  ← or keep using Atlas
└─────────────────────────────────────────┘
```

Two things about this project worth remembering:

- Uploads are stored **inside MongoDB (GridFS)**, so the backend keeps no files of its own —
  that makes it easy to containerize (it's "stateless").
- `NEXT_PUBLIC_API_URL` is baked into the frontend **at build time**, not at run time. We'll handle
  this in Lesson 5.

### Hands-on (about 20 minutes)

**Step 1 — Install Docker Desktop**

1. Download from https://www.docker.com/products/docker-desktop/ and run the installer.
   Keep **"Use WSL 2"** ticked.
2. Restart if asked, open Docker Desktop, and wait until it says *Engine running*.

**Step 2 — Check it works** (PowerShell)

```powershell
docker --version
docker run hello-world
```

Read the `hello-world` output carefully — it explains, step by step, exactly what Docker just did
(pulled the image, created a container, ran it).

**Step 3 — Run something real**

```powershell
docker run --name web -d -p 8080:80 nginx
```

Open http://localhost:8080 — the nginx welcome page is being served from a container. Then:

```powershell
docker ps            # running containers
docker logs web      # its output
docker stop web      # stop it
docker ps -a         # all containers, including stopped ones
docker rm web        # delete the container
docker images        # images you've downloaded
```

### Reading the `hello-world` output

| Line | What it means |
|---|---|
| `Unable to find image 'hello-world:latest' locally` | Not downloaded yet. **`:latest` is the tag** — if you don't name a version, Docker assumes `latest` |
| `Pulling from library/hello-world` | Downloading from Docker Hub. `library/` = an **official** image |
| `4f55086f7dd0: Pull complete` | Images are made of **layers**, downloaded separately (Lesson 4) |
| `Digest: sha256:…` | A fingerprint of the exact image content |
| `Hello from Docker!` | A **container** was created from the image, ran, printed this, and exited |

Run it a second time: no "Pulling…" — the image is now stored on your machine.

### Troubleshooting (things we hit during setup)

- **Which installer?** Intel/AMD 64-bit laptop → **Windows – AMD64**. ARM64 is only for ARM laptops (e.g. Snapdragon).
- **"Welcome to Windows Subsystem for Linux" window** after installing: just a tour — close it.
- **Docker sign-in "Authentication error / access_denied"**: an account with that email already exists with a
  password. Sign in with the password once (or reset it), or simply **skip sign-in** — it isn't needed until
  Lesson 9 (pushing images).
- **`docker : The term 'docker' is not recognized`**: Docker is installed, but this terminal was opened *before*
  the installer added it to PATH. Fixes, from quickest to most permanent:
  1. Reload PATH in the current window:
     `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`
  2. Close **all** Windows Terminal windows and open a new one (VS Code: quit VS Code completely and reopen).
  3. Restart the PC.
- **Typing commands:** run one command per line. Never paste lines from an error message (lines starting with
  `+` or `~~~~` are part of the error, not commands).
- **`pull access denied … repository does not exist`**: the image name is wrong (e.g. `hello-world3`). Check
  the spelling on https://hub.docker.com.
- **`The term '-v' (or '-p', '--name'…) is not recognized`**: you ran an *option* on its own. Options only
  work inside a full command (`docker run … -v …`). Fragments shown inside explanations or diagrams are for
  reading; run only the complete commands in the hands-on steps.

### The container lifecycle

```
docker run  →  Up (running)  →  docker stop  →  Exited  →  docker start  →  Up again
                                                  │
                                              docker rm  →  gone (the image stays)
```

- `docker run` **creates a new** container (and starts it). `docker start` restarts an **existing** stopped one.
- A stopped container serves nothing: the browser shows **ERR_CONNECTION_REFUSED**. Check with `docker ps -a`:
  `Exited (0)` = stopped cleanly; a non-zero code (e.g. `Exited (1)`) = it crashed → read `docker logs NAME`.
- Running `docker run --name web …` again while a stopped `web` exists fails ("name already in use") —
  either `docker start web` or `docker rm web` first.

### Command cheat sheet (so far)

| Command | What it does |
|---|---|
| `docker run IMAGE` | Create **and** start a container from an image (pulls it first if needed) |
| `--name NAME` | Give the container a name you can use instead of its ID |
| `-d` | Detached: run in the background and give you your terminal back |
| `-p HOST:CONTAINER` | Publish a port: `8080` on your PC → `80` inside the container |
| `docker ps` / `docker ps -a` | List running / all containers |
| `docker logs NAME` | Show a container's output |
| `docker stop NAME` / `docker rm NAME` | Stop / delete a container |
| `docker start NAME` | Start an existing stopped container again |
| `docker images` | List downloaded images |

### Check yourself

1. After `docker rm web`, is the **nginx image** gone too? (Check with `docker images`.)
2. In `-p 8080:80`, which number is on *your computer* and which is *inside the container*?
3. What does `-d` do? Try the `docker run` command without it and see what happens.

<details>
<summary>Answers (try first!)</summary>

1. **No.** `docker rm` deletes the *container* only. The image stays, so the next `docker run nginx`
   starts instantly. Remove images with `docker rmi nginx`.
2. **Left = your computer, right = inside the container.** `8080:80` means "traffic to port 8080 on
   my PC goes to port 80 in the container". Several containers can all listen on 80 inside, as long
   as each gets a different port on your PC.
3. `-d` runs the container **in the background**. Without it, the container's logs stream into your
   terminal and it stops when you press Ctrl+C.

</details>

---

## Lesson 2 — Running other people's images (MongoDB in a container)

**Goal:** run a real database in a container, look inside it, and point Connectly's backend at it —
without installing anything new on Windows.

### Concepts

**Official images.** Docker Hub hosts ready-made images for almost everything: `mongo`, `postgres`,
`redis`, `python`, `node`, `nginx`… Each has a page (e.g. https://hub.docker.com/_/mongo) listing its
**tags** (versions) and the **environment variables** it understands. Read that page before using an image.

**Tags = versions.** `mongo` means `mongo:latest` — whatever is newest *today*. That can change under you,
so pin a version: `mongo:7` (any 7.x) or `mongo:7.0.14` (exact). Rule of thumb:
experiments → `latest` is fine; anything you rely on → pin it.

**Ports can clash.** Only one program can listen on a given port of *your PC*. Your Windows MongoDB
service already uses **27017**, so the container is published on **27018**:

```
your PC :27018  ──►  container :27017   (MongoDB inside listens on its normal port)
your PC :27017  ──►  Windows MongoDB service (unchanged)
```

Inside the container MongoDB still uses 27017 — only the *host* side changes.

**`docker exec`** runs an extra command *inside* a running container — like opening a terminal in it.
`-it` = interactive + terminal (needed for shells like `mongosh` or `bash`).

**Containers are disposable.** By default, a container's data lives *inside the container*. Delete the
container → the data is gone. That's what Lesson 3 (volumes) fixes — this lesson lets you see the problem.

### Hands-on

Use **Windows Terminal**, one command at a time.

**Step 1 — Pull a pinned image and see its size**

```powershell
docker pull mongo:7
docker images
```

Compare the size of `mongo` with `hello-world` and `nginx`.

**Step 2 — Run MongoDB**

```powershell
docker run -d --name connectly-mongo -p 27018:27017 mongo:7
docker ps
docker logs connectly-mongo
```

In the logs, look for `"Waiting for connections"` and `"port":27017` — MongoDB is ready.

**Step 3 — Go inside with `exec`**

```powershell
docker exec -it connectly-mongo mongosh
```

You're now in the MongoDB shell *inside the container*. It first prints some startup messages:

| Message | Meaning | Worry? |
|---|---|---|
| Usage data / `disableTelemetry()` | mongosh can send anonymous usage stats | No — run `disableTelemetry()` to opt out |
| *XFS filesystem is strongly recommended* | Performance tip for production Linux servers | No, not for learning |
| ***Access control is not enabled*** | The database has **no username/password** — anyone who can reach the port can read/write everything | OK for practice, **never in production**. Fixed in Lesson 3 |

> ⚠️ `-p 27018:27017` publishes the port on *all* network interfaces, so devices on your Wi-Fi could reach
> this password-less database. Lesson 3 uses `-p 127.0.0.1:27018:27017` (your PC only) and adds credentials.

At the `test>` prompt, try:

```javascript
show dbs
use playground
db.notes.insertOne({ text: "Hello from inside a container", at: new Date() })
db.notes.find()
exit
```

`exit` leaves the shell — **the container keeps running** (check with `docker ps`).

> **Watch the prompt** — it tells you where you are:
>
> | Prompt | You're in | It accepts |
> |---|---|---|
> | `PS C:\Users\ajink>` | PowerShell (Windows) | `docker …` commands |
> | `test>` / `playground>` | mongosh, inside the container | `show dbs`, `db.notes.find()`, … |
>
> Typing `db.notes.find()` at the `PS` prompt gives *"An expression was expected after '('"* —
> go back in with `docker exec -it connectly-mongo mongosh` first.

If you see `'docker exec' requires at least 2 arguments` you left out the command (`mongosh`);
`No such container: connectly-mongo` means Step 2 hasn't been run yet.

**Step 4 — Point Connectly's backend at the container**

Your normal backend uses Atlas (from `backend/.env`). An environment variable set in the terminal
**overrides** `.env`, so you can switch databases for one session without editing any file.

1. Stop your normal backend if it's running (Ctrl+C in its window).
2. In a terminal:

   ```powershell
   cd C:\FullStack_Projects\twitter-clone-master\backend
   $env:MONGO_URI = "mongodb://localhost:27018/connectly-docker"
   .\.venv\Scripts\python.exe run.py
   ```

   You should see `Connected to MongoDB` — but now it's the container.
3. Start the frontend (`npm run dev` in `frontend`) and open http://localhost:3000.
   The feed is **empty** — it's a brand-new database.
4. Load demo data into the *container* database: open http://localhost:3001/api/docs → **POST /testData/seed**
   → *Try it out* → *Execute*. Refresh the site: the demo posts appear.
   (Safe: this only touches `connectly-docker` inside the container, not Atlas.)
5. Check from inside the container:

   ```powershell
   docker exec -it connectly-mongo mongosh connectly-docker --eval "db.tweets.countDocuments()"
   ```

**Step 5 — See why containers are "disposable"**

Stop the backend (Ctrl+C), then:

```powershell
docker rm -f connectly-mongo
docker run -d --name connectly-mongo -p 27018:27017 mongo:7
docker exec -it connectly-mongo mongosh connectly-docker --eval "db.tweets.countDocuments()"
```

The count is **0**. Removing the container removed its data. (`-f` = force: stop + remove in one step.)

**Step 6 — Back to normal**

Close that terminal (the `$env:MONGO_URI` override disappears with it), then start your backend the usual
way in a new terminal — it uses Atlas again. Leave `connectly-mongo` running for Lesson 3, or stop it with
`docker stop connectly-mongo`.

### Command cheat sheet (new in this lesson)

| Command | What it does |
|---|---|
| `docker pull IMAGE:TAG` | Download an image without running it |
| `docker run … mongo:7` | Use a pinned major version instead of `latest` |
| `docker exec -it NAME CMD` | Run a command inside a running container, interactively (`mongosh`, `sh`, `bash`) |
| `docker exec NAME CMD` | Run a one-off command inside it (no `-it` needed for non-interactive commands) |
| `docker rm -f NAME` | Stop and remove in one step |
| `docker logs -f NAME` | Follow logs live (Ctrl+C to stop following) |
| `$env:NAME = "value"` | (PowerShell) set an environment variable for this terminal only |

### Check yourself

1. Why did we publish MongoDB on **27018** instead of 27017? Which side of `-p 27018:27017` would you change
   if another program also used 27018?
2. What's the difference between `docker run` and `docker exec`?
3. After `docker rm -f connectly-mongo`, the demo data was gone. Where was it stored before that?
4. Why is `mongo:7` safer than `mongo` (no tag) for a project you rely on?

<details>
<summary>Answers (try first!)</summary>

1. Your Windows MongoDB service already listens on 27017 on your PC, and two programs can't share a host
   port. Only the **left (host)** side changes — e.g. `-p 27019:27017`. The right side is the port *inside*
   the container, which MongoDB always uses.
2. `docker run` **creates a new container** from an image. `docker exec` runs an **extra command inside an
   existing, running** container.
3. Inside the container's own writable layer (its private filesystem). It lives and dies with the
   container — Lesson 3 moves data into a **volume** so it survives.
4. `mongo` = `mongo:latest`, which jumps to new major versions over time and can break your app without any
   change on your side. `mongo:7` stays on version 7.

</details>

### What you saw in Step 5

The count went from **30 → 0**. Deleting the container deleted its data:

```
container  ─┬─ writable layer   ← your data lived HERE (deleted with the container)
            └─ image layers     ← mongo:7, read-only (shared, never changes)
```

An image is a fixed template; each container gets a thin private writable layer on top, which lives and dies
with the container. Fine for nginx — not for a database. → Lesson 3.

---

## Lesson 3 — Data & configuration (volumes, environment variables)

**Goal:** keep MongoDB's data when the container is deleted, protect it with a password, keep secrets out
of your commands, and share files from Windows with a container.

### Concepts

**Where does an app keep its data?** Every image's Docker Hub page tells you. For `mongo` it's the folder
**`/data/db`** inside the container. If that folder lives *outside* the container, the data survives.

**Three ways to give a container storage**

| Type | Syntax | Lives in | Use it for |
|---|---|---|---|
| **Named volume** | `-v connectly-mongo-data:/data/db` | Storage managed by Docker | **Databases** and any data you want to keep. The default choice |
| **Bind mount** | `-v C:\path\on\pc:/path/in/container` | A folder on your PC you choose | Sharing files you edit (code, config) with a container — mostly in development |
| *(none)* | — | The container's writable layer | Throwaway data — gone on `docker rm` |

```
          docker rm -f connectly-mongo
container ───────────────────────────────►  deleted
   │ /data/db
   ▼  (mounted)
volume "connectly-mongo-data"  ───────────►  still there ✔  → attach it to a new container
```

**Environment variables configure containers.** Images read settings from environment variables. The
`mongo` image understands:

- `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` — create an admin user.

> ⚠️ **Gotcha:** `MONGO_INITDB_*` variables only take effect when the data folder is **empty** (the very first
> start). With an existing volume they're ignored — changing the password later in the command does *not*
> change the user in the database.

**Pass variables two ways**

- `-e NAME=value` — on the command line (visible in your shell history and in `docker inspect`).
- `--env-file FILE` — read many variables from a file. Keep that file **out of Git** (your project's
  `.gitignore` already ignores files named `.env.*`).

**Publish only to your own PC:** `-p 127.0.0.1:27018:27017` instead of `-p 27018:27017` — then nothing else on
your network can reach the port.

### Hands-on

Windows Terminal, one command at a time. Make sure your normal backend (on Atlas) isn't connected to the
container — it doesn't matter if it's running.

**Step 1 — Start fresh**

```powershell
docker rm -f connectly-mongo
docker volume ls
```

**Step 2 — Create a named volume**

```powershell
docker volume create connectly-mongo-data
docker volume ls
docker volume inspect connectly-mongo-data
```

`inspect` shows `"Mountpoint"` — where Docker keeps it inside its Linux VM. You don't need to touch that
folder; Docker manages it. (Also visible in Docker Desktop → **Volumes**.)

**Step 3 — Put the credentials in an env file**

In the project folder, create a file named **`.env.mongo`**:

```powershell
cd C:\FullStack_Projects\twitter-clone-master
notepad .env.mongo
```

Put these two lines in it (choose your own password), save, close:

```
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=change-me-123
```

Check Git will ignore it:

```powershell
git status --short
```

`.env.mongo` must **not** be listed.

**Step 4 — Run MongoDB with the volume, the env file, and a localhost-only port** (one line)

```powershell
docker run -d --name connectly-mongo -p 127.0.0.1:27018:27017 -v connectly-mongo-data:/data/db --env-file .env.mongo mongo:7
```

Read it piece by piece: name · localhost-only port · **volume mounted at `/data/db`** · **settings from the
env file** · pinned image.

**Step 5 — Confirm the password is required**

```powershell
docker exec -it connectly-mongo mongosh --eval "show dbs"
```

→ an error like *"requires authentication"*. Now with credentials:

```powershell
docker exec -it connectly-mongo mongosh -u admin -p change-me-123 --authenticationDatabase admin --eval "show dbs"
```

**Step 6 — Point Connectly at it** (new terminal; the URL now includes the user and password)

```powershell
cd C:\FullStack_Projects\twitter-clone-master\backend
$env:MONGO_URI = "mongodb://admin:change-me-123@localhost:27018/connectly-docker?authSource=admin"
.\.venv\Scripts\python.exe run.py
```

Seed it: http://localhost:3001/api/docs → **POST /testData/seed** → *Execute*. Then stop the backend (Ctrl+C).

**Step 7 — The real test: delete the container, keep the data**

```powershell
docker exec connectly-mongo mongosh -u admin -p change-me-123 --authenticationDatabase admin connectly-docker --quiet --eval "db.tweets.countDocuments()"
docker rm -f connectly-mongo
docker run -d --name connectly-mongo -p 127.0.0.1:27018:27017 -v connectly-mongo-data:/data/db --env-file .env.mongo mongo:7
docker exec connectly-mongo mongosh -u admin -p change-me-123 --authenticationDatabase admin connectly-docker --quiet --eval "db.tweets.countDocuments()"
```

Predict before the last command: **30 or 0?** (Compare with Lesson 2, Step 5.)

**Step 8 — A bind mount: share a folder from Windows (read-only)**

```powershell
docker run --rm -v C:\FullStack_Projects\twitter-clone-master\backend\data:/seed:ro alpine ls -l /seed
```

- `-v C:\…\backend\data:/seed` — your Windows folder appears at `/seed` in the container.
- `:ro` — read-only: the container can read the files but not change them.
- `--rm` — delete the container automatically when it exits (perfect for one-off commands).
- `alpine` — a tiny (~8 MB) Linux image, handy for quick experiments.

You should see `database-seed.json` listed — a file from your PC, seen from inside a container.

Now prove `:ro` works — try to create a file:

```powershell
docker run --rm -v C:\FullStack_Projects\twitter-clone-master\backend\data:/seed:ro alpine touch /seed/test.txt
```

→ `touch: /seed/test.txt: Read-only file system`, and nothing appears in the Windows folder.

> If a `docker run` that downloads a new image fails with
> `error getting credentials … "docker-credential-desktop": executable file not found in %PATH%`,
> that terminal has the old PATH (same cause as *"docker is not recognized"* in Lesson 1) —
> open a new Windows Terminal or reload PATH.

**Step 9 — Clean up (and see what deletes what)**

```powershell
docker rm -f connectly-mongo
docker volume ls
```

The volume is still there — removing a container **never** removes a named volume. Keep it for the next
lessons. (To really delete it: `docker volume rm connectly-mongo-data` — that *does* destroy the data.)

### Command cheat sheet (new in this lesson)

| Command | What it does |
|---|---|
| `docker volume create NAME` | Create a named volume |
| `docker volume ls` / `inspect NAME` | List volumes / show details |
| `docker volume rm NAME` | Delete a volume **and its data** (only when no container uses it) |
| `-v VOLUME:/path` | Mount a named volume at `/path` inside the container |
| `-v C:\folder:/path` | Bind-mount a Windows folder (add `:ro` for read-only) |
| `-e NAME=value` | Set one environment variable |
| `--env-file FILE` | Read environment variables from a file |
| `-p 127.0.0.1:HOST:CONTAINER` | Publish a port to your PC only |
| `docker run --rm …` | Remove the container automatically when it exits |

### Check yourself

1. After Step 7, why was the data still there this time but not in Lesson 2?
2. You change the password in `.env.mongo` and recreate the container with the same volume. Does the
   database password change? Why?
3. When would you choose a **bind mount** over a **named volume**?
4. Why is `--env-file .env.mongo` better than `-e MONGO_INITDB_ROOT_PASSWORD=…` in the command?
5. What does `docker volume rm connectly-mongo-data` do that `docker rm -f connectly-mongo` doesn't?

<details>
<summary>Answers (try first!)</summary>

1. MongoDB writes to `/data/db`, and that folder is now the **named volume**, which lives outside the
   container. The new container mounted the same volume and found the data. In Lesson 2 `/data/db` was inside
   the container's writable layer.
2. **No.** `MONGO_INITDB_*` only runs when `/data/db` is empty (first start). The volume already has data, so
   the old user and password stay. To change it you'd update the user inside MongoDB, or start over with a new
   (empty) volume.
3. When *you* edit the files on your PC and the container should see them right away — source code during
   development, config files, or input data like the seed file. Named volumes are for data the container owns,
   such as a database.
4. The password doesn't end up in your shell history or in a command someone might copy, and the file can be
   kept out of Git. (Note: it's still visible to anyone who can run `docker inspect` on your machine —
   production secrets need more care; Lesson 8.)
5. It destroys the **data**. Removing a container only removes the container; the named volume — and
   everything in it — stays until you delete the volume itself.

</details>

### What you saw

- Step 7 kept **30** posts after recreating the container — the data lives in the volume, not the container.
- Step 8 showed a Windows folder inside a Linux container (bind mount), and `:ro` blocked writes
  (*"Read-only file system"*) — give containers only the access they need (*least privilege*).
- Step 9: the container is gone, the volume stays. **Containers are disposable; volumes are durable.**

---

## Lesson 4 — Your first Dockerfile (FastAPI backend)

**Goal:** stop *using* other people's images and **build your own** — package Connectly's backend so it runs
the same anywhere, with no Python or venv installed.

### Concepts

**A Dockerfile is a recipe.** Each instruction does one thing, top to bottom:

| Instruction | What it does |
|---|---|
| `FROM image` | Start from an existing image (every Dockerfile begins with this) |
| `WORKDIR /app` | Create `/app` (if needed) and make it the current folder for what follows |
| `COPY src dest` | Copy files from your project (the *build context*) into the image |
| `RUN command` | Run a command **while building** (e.g. install packages) — its result is saved in the image |
| `ENV NAME=value` | Set an environment variable for the build and for the running container |
| `EXPOSE 3001` | *Document* which port the app listens on (it doesn't publish it — `-p` does that) |
| `CMD ["…"]` | The command that runs **when a container starts** (not during the build) |

> **`RUN` vs `CMD`:** `RUN pip install …` happens once, at build time, and is baked into the image.
> `CMD uvicorn …` happens every time a container starts.

**Layers and the build cache.** Each instruction creates a **layer**. When you rebuild, Docker reuses
(`CACHED`) every layer whose inputs haven't changed — **until the first one that did**; everything after
that is rebuilt. So the order matters:

```
FROM python:3.12-slim                    ← rarely changes
COPY requirements.txt .                  ← changes when you add a package
RUN pip install -r requirements.txt      ← slow (~10 s) — cached unless requirements.txt changed
COPY . .                                 ← changes on every code edit
```

Copying **only `requirements.txt` first** means a code edit rebuilds just the last, tiny step — instead of
reinstalling every package each time. This is the most important Dockerfile habit.

**The build context and `.dockerignore`.** `docker build .` sends the folder `.` (the *context*) to Docker.
`.dockerignore` lists what to leave out — like `.gitignore`. For the backend that's:

- `.venv` — your Windows virtualenv (huge, and useless in a Linux image),
- `__pycache__`, `*.pyc` — compiled files,
- **`.env`** — your Atlas password and JWT secret. **Secrets must never be baked into an image**: anyone who
  gets the image could read them. Settings are passed in at **run** time instead (`--env-file`).

**Why `--host 0.0.0.0`?** Inside a container, `127.0.0.1` means "this container only". Docker's port
forwarding arrives from *outside* the container, so the app must listen on **`0.0.0.0`** (all interfaces) or
it's unreachable — even with `-p`. (You'll prove this in Step 7.)

**Two Python settings you'll see everywhere:**

- `PYTHONUNBUFFERED=1` — print logs immediately (otherwise `docker logs` can lag or miss lines).
- `PYTHONDONTWRITEBYTECODE=1` — don't write `.pyc` files inside the container.

### Hands-on

Windows Terminal, one command at a time.

> **Create both files in VS Code**, not Notepad — Notepad tends to save `Dockerfile` as `Dockerfile.txt`, which
> Docker won't find. In VS Code's Explorer: right-click the **`backend`** folder → **New File…** → type the name
> exactly → paste the content → **Ctrl+S**.

**Step 1 — Create `backend/.dockerignore`** (name starts with a dot, no extension)

```
.venv
__pycache__
*.pyc
.env
.env.*
!.env.example
.gitignore
```

**Step 2 — Create `backend/Dockerfile`** (capital **D**, **no extension**)

```dockerfile
# 1. Start from an official, small Python image (pinned version)
FROM python:3.12-slim

# 2. Python settings for containers
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 3. All following commands run in /app
WORKDIR /app

# 4. Install dependencies first (cached until requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the application code (changes most often → last)
COPY . .

# 6. Document the port, and start the API on all interfaces
EXPOSE 3001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3001"]
```

Check both files exist with the right names (in Windows Terminal):

```powershell
cd C:\FullStack_Projects\twitter-clone-master\backend
dir -Force Dockerfile, .dockerignore
```

Both must be listed with **no `.txt`** at the end. (`-Force` shows files starting with a dot.)

> ⚠️ **Exact spelling: `Dockerfile`** — capital **D**, lowercase **f**. Windows ignores upper/lower case, but
> the build runs on **Linux**, where `DockerFile` ≠ `Dockerfile` → *"failed to read dockerfile: open Dockerfile:
> no such file or directory"*. Fix a wrong case in two steps (Windows won't rename case-only in one):
>
> ```powershell
> Rename-Item DockerFile Dockerfile.tmp
> Rename-Item Dockerfile.tmp Dockerfile
> ```

**Step 3 — Build the image**

```powershell
docker build -t connectly-backend:1.0 .
```

- `-t connectly-backend:1.0` — *tag*: name `connectly-backend`, version `1.0`.
- `.` — the build context: this folder.

Watch the numbered steps (`[1/5] FROM …`, `[4/5] RUN pip install …`). The first build downloads Python and
installs packages (about 30 s–1 min).

```powershell
docker images connectly-backend
```

About **220 MB** — Python + your packages + your code.

**Step 4 — Look inside: is the secret really left out?**

```powershell
docker run --rm connectly-backend:1.0 ls -A /app
```

You'll see `app`, `data`, `requirements.txt`, `run.py`, `scripts`, `.env.example` — **no `.env`, no `.venv`**.
(Adding `ls -A /app` after the image name *replaces* the `CMD` for this one run.)

**Step 5 — Run your backend container**

Stop your normal backend first (Ctrl+C in its window — port 3001 must be free), then:

```powershell
docker run -d --name connectly-api -p 3001:3001 --env-file .env connectly-backend:1.0
docker logs connectly-api
```

Look for `Connected to MongoDB`. The settings (Atlas URL, JWT secret…) came from `--env-file .env` **at run
time** — they're not in the image.

Open http://localhost:3001/api/health → `{"status":"ok"}`, then http://localhost:3001/api/docs.
Start the frontend as usual (`npm run dev`) and open http://localhost:3000 — **the whole app now runs on a
containerized backend**, using your Atlas data.

Watch requests arrive live while you click around the site:

```powershell
docker logs -f connectly-api
```

(Ctrl+C stops *following* the logs — the container keeps running.)

**Step 6 — See the build cache work**

1. Rebuild with no changes:

   ```powershell
   docker build -t connectly-backend:1.0 .
   ```

   Every step says `CACHED` — near-instant.
2. Change **code**: open `backend/run.py` in VS Code, add a comment line at the end (e.g. `# cache test`),
   save, rebuild. Only `COPY . .` reruns; `pip install` stays `CACHED`.
3. Change **dependencies**: add a line `# cache test` at the end of `requirements.txt`, save, rebuild.
   Now `pip install` runs again — everything after the changed layer is rebuilt.
4. Remove both test lines afterwards.

See the layers and their sizes:

```powershell
docker history connectly-backend:1.0
```

**Step 7 — Prove why `0.0.0.0` matters** (override the `CMD` to listen on `127.0.0.1`)

```powershell
docker rm -f connectly-api
docker run -d --name connectly-api -p 3001:3001 --env-file .env connectly-backend:1.0 uvicorn app.main:app --host 127.0.0.1 --port 3001
```

Open http://localhost:3001/api/health → **fails**, even though `-p` is set. From *inside* the container it
works:

```powershell
docker exec connectly-api python -c "import urllib.request;print(urllib.request.urlopen('http://127.0.0.1:3001/api/health').read().decode())"
```

The app is only listening to itself. Put it back the right way:

```powershell
docker rm -f connectly-api
docker run -d --name connectly-api -p 3001:3001 --env-file .env connectly-backend:1.0
```

**Step 8 — Finish up**

When you're done, stop the container and go back to your normal backend:

```powershell
docker rm -f connectly-api
.\.venv\Scripts\python.exe run.py
```

Keep the `connectly-backend:1.0` image — we'll reuse it.

### Command cheat sheet (new in this lesson)

| Command | What it does |
|---|---|
| `docker build -t NAME:TAG .` | Build an image from the `Dockerfile` in this folder |
| `docker build -f path\Dockerfile …` | Use a Dockerfile with a different name/location |
| `docker history IMAGE` | Show an image's layers and their sizes |
| `docker run IMAGE CMD …` | Run the image but **replace** its default `CMD` for this run |
| `docker logs -f NAME` | Follow logs live |
| `docker rmi IMAGE` | Delete an image (no container may be using it) |

### Check yourself

1. Why does the Dockerfile copy `requirements.txt` and run `pip install` **before** `COPY . .`?
2. What's the difference between `RUN` and `CMD`?
3. Why is `.env` in `.dockerignore`, and how does the container still get the Atlas URL?
4. You set `-p 3001:3001` but the app listens on `127.0.0.1`. Why can't your browser reach it?
5. Does `EXPOSE 3001` make the port reachable from your PC?

<details>
<summary>Answers (try first!)</summary>

1. Layer caching: Docker reuses layers until the first changed one. Code changes often; dependencies rarely.
   With requirements first, a code edit only rebuilds `COPY . .` and `pip install` stays cached. With
   `COPY . .` first, **every** code edit would reinstall all packages.
2. `RUN` executes **at build time** and its result is saved into the image (e.g. installed packages). `CMD` is
   the command a **container runs when it starts** — it doesn't run during the build.
3. Anything copied into an image can be read by anyone who has the image — secrets would leak. Settings are
   given at **run** time with `--env-file .env` (or `-e`), and the app reads them from environment variables.
4. Inside the container, `127.0.0.1` means "only connections from inside this container". Port forwarding
   arrives from outside (through the container's network interface), so nothing is listening there. Listening on
   `0.0.0.0` accepts connections on all interfaces.
5. **No.** `EXPOSE` is documentation (and a hint for tools). Only `-p` (publishing) makes a port reachable from
   your PC.

</details>

---

*Next: Lesson 5 — multi-stage builds: a small production image for the Next.js frontend.*
