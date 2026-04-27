# wdym

A workspace-based survey builder. Build surveys on a drag-and-drop canvas, publish them, and track responses with analytics.

---

## Prerequisites

Install these before anything else:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | https://nodejs.org (or `nvm`/`fnm`) |
| npm | 9+ | comes with Node |
| PostgreSQL | 14+ | see options below |
| Redis | 6+ | see options below |

---

## 1 — Get the code

```bash
git clone <repo-url>
cd wdym
npm install          # installs concurrently (used for the root dev command)
```

---

## 2 — Start PostgreSQL and Redis

Pick whichever approach fits your setup. You only need to do one.

### Option A — Docker (easiest, any OS)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
# From the project root
docker compose up -d postgres redis
```

Add a `postgres` and `redis` service to `docker-compose.yml` if they aren't there yet — or use this standalone command:

```bash
docker run -d --name wdym-pg  -e POSTGRES_DB=wdym -e POSTGRES_USER=wdym -e POSTGRES_PASSWORD=wdym -p 5432:5432 postgres:16-alpine
docker run -d --name wdym-redis -p 6379:6379 redis:7-alpine
```

Connection strings for `.env`:
```
DATABASE_URL=postgresql://wdym:wdym@localhost:5432/wdym
REDIS_URL=redis://localhost:6379
```

### Option B — Homebrew (macOS)

```bash
brew install postgresql redis
brew services start postgresql
brew services start redis
createdb wdym
```

Connection strings:
```
DATABASE_URL=postgresql://localhost:5432/wdym
REDIS_URL=redis://localhost:6379
```

### Option C — Native install (Linux)

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install postgresql redis-server
sudo systemctl start postgresql redis-server
sudo -u postgres createdb wdym
```

Connection strings:
```
DATABASE_URL=postgresql://postgres@localhost:5432/wdym
REDIS_URL=redis://localhost:6379
```

### Option D — Native install (Windows)

1. Download and install [PostgreSQL](https://www.postgresql.org/download/windows/) — the installer includes pgAdmin
2. Download and install [Redis for Windows](https://github.com/tporadowski/redis/releases) (community build)
3. Start both services from the Windows Services panel or the installers' shortcuts
4. Create the database: open pgAdmin or run `psql -U postgres -c "CREATE DATABASE wdym;"`

Connection strings:
```
DATABASE_URL=postgresql://postgres:<your-password>@localhost:5432/wdym
REDIS_URL=redis://localhost:6379
```

### Option E — Cloud services (no local install)

Use managed services — free tiers work fine for development:

- **PostgreSQL:** [Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway](https://railway.app)
- **Redis:** [Redis Cloud](https://redis.io/try-free/), [Upstash](https://upstash.com)

Copy the connection strings they provide directly into your `.env`.

---

## 3 — Configure environment variables

```bash
cp server/.env.example server/.env
```

Then edit `server/.env`:

```env
# Database — use the connection string from step 2
DATABASE_URL=postgresql://wdym:wdym@localhost:5432/wdym

# Redis — use the connection string from step 2
REDIS_URL=redis://localhost:6379

# JWT — generate two random secrets (any long random string works)
JWT_SECRET=replace-with-a-long-random-string
JWT_REFRESH_SECRET=replace-with-a-different-long-random-string

# MFA encryption — must be exactly 64 hex characters (32 bytes)
# Generate one: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
MFA_ENCRYPTION_KEY=

# CORS — URL of the frontend dev server
CLIENT_URL=http://localhost:5173

# Invite links — same as CLIENT_URL in dev
FRONTEND_URL=http://localhost:5173

# Port (optional, defaults to 4000)
PORT=4000

# Email — Gmail SMTP (create an App Password at myaccount.google.com/apppasswords)
JAVA_MAIL_HOST=smtp.gmail.com
JAVA_MAIL_PORT=587
JAVA_MAIL_USERNAME=your-gmail@gmail.com
JAVA_MAIL_PASSWORD=your-app-password
```

For the client, create `client/.env` only if you need a non-default API URL:

```env
# Only needed if your server runs somewhere other than localhost:4000
VITE_API_URL=http://localhost:4000
```

**Generating secrets quickly:**

```bash
# JWT secrets (run twice for two different values)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# MFA encryption key (must be exactly 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4 — Set up the database

```bash
cd server
npm install
npx prisma db push      # creates all tables
npx prisma generate     # generates the Prisma client
```

> **Every time you change `prisma/schema.prisma`** you must run both commands again.

---

## 5 — Install client dependencies

```bash
cd ../client
npm install
```

---

## 6 — Start everything

### All at once (from the project root)

```bash
npm run dev
```

This runs server and client concurrently with color-coded output. Requires both `server/.env` to exist and dependencies to be installed in both directories.

### Separately (two terminals)

**Terminal 1 — server:**
```bash
cd server
npm run dev
# Runs on http://localhost:4000
```

**Terminal 2 — client:**
```bash
cd client
npm run dev
# Runs on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173).

---

## Common issues

### `REDIS_URL` not connecting

- Make sure Redis is actually running: `redis-cli ping` should return `PONG`
- On Windows, check that the Redis service is started in Services panel
- Cloud Redis URLs often require `rediss://` (TLS) — use the exact string the provider gives you

### `DATABASE_URL` connection refused

- Check PostgreSQL is running: `pg_isready` (macOS/Linux) or check Services (Windows)
- On Linux the default user may need a password — try `sudo -u postgres psql` to confirm access
- If you used Docker, confirm the container is up: `docker ps`

### `MFA_ENCRYPTION_KEY` error on startup

The server will throw on the first MFA-related request if this is missing or wrong length. Generate it with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
It must be exactly 64 characters.

### `prisma generate` not run / stale types

If you see TypeScript errors about missing Prisma fields, or runtime errors like `The column X does not exist`, run:
```bash
cd server && npx prisma db push && npx prisma generate
```

### Port already in use

Change the port in `server/.env` (`PORT=4001`) and update `client/.env` (`VITE_API_URL=http://localhost:4001`).

---

## Useful commands

```bash
# From server/
npm run dev              # start server with hot reload
npm run build            # compile TypeScript to dist/
npm run db:push          # sync schema to DB
npm run db:generate      # regenerate Prisma client
npm run db:studio        # open Prisma Studio (visual DB browser) at localhost:5555
npx tsc --noEmit         # type-check without building

# From client/
npm run dev              # Vite dev server
npm run build            # production build → client/dist/
npx tsc --noEmit         # type-check without building

# From project root
npm run dev              # run server + client together
```

---

## Project structure

See [`architecture.md`](./architecture.md) for a full breakdown of every file, all API routes, data models, and design constraints.
