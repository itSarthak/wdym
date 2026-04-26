# CI/CD Setup

## Overview

Three GitHub Actions workflows handle the full pipeline:

| Workflow | File | Trigger |
|---|---|---|
| CI | `ci.yml` | Every pull request to `main` |
| Deploy Frontend | `deploy-frontend.yml` | Push to `main` touching `client/**` or `vercel.json` |
| Deploy Backend | `deploy-backend.yml` | Push to `main` touching `server/**` |

**Why this structure:**
- Path-based triggers mean a CSS change never redeploys the backend and a schema change never rebuilds the frontend. Each pipeline only runs when it has to.
- CI runs on PRs (not on push) so you catch type errors before they land on `main`.
- Deploy workflows run on push to `main` (after merge) rather than on PRs, so staging environments aren't needed for this scale.
- Type-check is repeated in each deploy workflow as a gate — this catches direct pushes to `main` that bypass the PR workflow.

---

## Workflows in Detail

### `ci.yml` — Pull Request checks

Runs two parallel jobs on every PR:

- **check-client**: `npm ci` → `tsc --noEmit` inside `client/`
- **check-server**: `npm ci` → `tsc --noEmit` inside `server/`

Both jobs use npm cache keyed to their respective `package-lock.json` so subsequent runs are fast.

**Why only type-check, no tests?** The project currently has no test suite. Add a `npm test` step here when tests exist.

---

### `deploy-frontend.yml` — Vercel

Triggers on push to `main` when any file under `client/` or `vercel.json` changes.

Steps:
1. **Type-check** — fail fast before touching Vercel if TypeScript is broken
2. **Install Vercel CLI** — installs globally; no version pin so it always uses latest stable
3. **`vercel pull`** — downloads project metadata and environment variables from Vercel into `.vercel/project.json`
4. **`vercel build --prod`** — builds the production bundle locally on the runner using Vercel's build pipeline (respects `vercel.json` rewrites and your dashboard build settings)
5. **`vercel deploy --prebuilt --prod`** — uploads the already-built artifact; Vercel doesn't rebuild, just deploys

**Why prebuilt?** `vercel deploy --prebuilt` separates build from deploy. If the deploy step fails you can retry without rebuilding. It also makes the log cleaner.

**Why not use Vercel's native GitHub integration?** Vercel's integration deploys on every push to every branch regardless of which files changed. It has no path filtering. Using the CLI via GitHub Actions gives full control: only `client/**` changes trigger a deploy.

---

### `deploy-backend.yml` — Koyeb

Triggers on push to `main` when any file under `server/` changes (including `server/prisma/`).

Steps:
1. **Type-check** — same gate as frontend; won't trigger Koyeb if the code doesn't compile
2. **Trigger Koyeb redeploy** — single `curl` call to Koyeb's REST API; Koyeb pulls the latest commit from GitHub, rebuilds, and redeploys

**Why curl instead of Koyeb CLI?** The CLI requires installation and authentication setup. A single authenticated HTTP call is simpler, has no version dependencies, and is trivially auditable.

**Why not use Koyeb's native GitHub auto-deploy?** Same reason as Vercel — no path filtering. Koyeb would redeploy on every push including pure frontend changes. Disabling auto-deploy and triggering via API gives path-based control.

**Note on `prisma db push`:** The server's `start` script runs `npx prisma db push && node dist/index.js`. This means every deploy automatically applies schema changes to the database before the server starts. No separate migration step needed in CI.

---

## Secrets Required

Add these in **GitHub → Repository Settings → Secrets and variables → Actions**:

| Secret | Used by | How to get it |
|---|---|---|
| `VERCEL_TOKEN` | deploy-frontend | Vercel dashboard → Settings → Tokens → Create |
| `VERCEL_ORG_ID` | deploy-frontend | Run `vercel whoami --json` or check `.vercel/project.json` after first `vercel link` |
| `VERCEL_PROJECT_ID` | deploy-frontend | Same as above — `projectId` field in `.vercel/project.json` |
| `KOYEB_API_KEY` | deploy-backend | Koyeb dashboard → Account → API access → Create API key |
| `KOYEB_SERVICE_ID` | deploy-backend | See below |

### Getting `KOYEB_SERVICE_ID`

Option A — Koyeb dashboard: open your service, look at the URL: `https://app.koyeb.com/apps/<app>/services/<service-id>`

Option B — Koyeb CLI:
```bash
koyeb service get <your-service-name> --output json | jq -r '.id'
```

---

## One-Time Configuration

### Vercel

1. **Disable automatic GitHub integration** so Vercel doesn't also deploy on every push:
   - Go to your Vercel project → **Settings → Git**
   - Under "Ignored Build Step", enter: `exit 1`
   - This tells Vercel's webhook to skip all builds; GitHub Actions handles deploys instead

2. **Verify build settings** in Vercel project → Settings → General:
   - Build Command: `cd client && npm ci && npm run build`
   - Output Directory: `client/dist`
   - Install Command: *(leave blank — the build command handles it)*
   - Root Directory: *(leave as `/` since `vercel.json` is at the repo root)*

3. **Link the project locally** once so you can get `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`:
   ```bash
   cd /path/to/wdym
   vercel link
   cat .vercel/project.json
   ```
   Copy `orgId` → `VERCEL_ORG_ID`, `projectId` → `VERCEL_PROJECT_ID`.

4. **Set environment variables** in Vercel dashboard → Settings → Environment Variables:
   - `VITE_API_URL` = your Koyeb backend URL (e.g. `https://wdym-api-xxx.koyeb.app`)

### Koyeb

1. **Create (or verify) your service** connected to the GitHub repo:
   - Source: GitHub → `your-username/wdym` → branch `main`
   - Builder: Buildpack (auto-detects Node.js) OR Dockerfile if you have one
   - Run command: `npm start` (which runs `npx prisma db push && node dist/index.js`)
   - Build command: `npm ci && npm run build`
   - Work directory: `server`

2. **Disable auto-deploy** so Koyeb doesn't deploy on every push independently:
   - In your Koyeb service settings → **Deployment** → turn off "Auto-deploy on push"
   - GitHub Actions will now be the only trigger

3. **Set environment variables** in Koyeb service → Settings → Environment:
   - `DATABASE_URL` — your Koyeb PostgreSQL connection string
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `CLIENT_URL` — your Vercel frontend URL (e.g. `https://wdym.vercel.app`)
   - `PORT` = `8000` (Koyeb expects port 8000 by default; update `server/src/index.ts` if needed)
   - `GEMINI_API_KEY`
   - `ANTHROPIC_API_KEY`

4. **Get the service ID** and add it to GitHub secrets as `KOYEB_SERVICE_ID`.

---

## Flow Diagram

```
Push to main
     │
     ├─ changed client/** or vercel.json?
     │       │
     │       └─ deploy-frontend.yml
     │               ├─ tsc --noEmit (gate)
     │               ├─ vercel pull
     │               ├─ vercel build --prod
     │               └─ vercel deploy --prebuilt --prod  →  Vercel CDN
     │
     └─ changed server/**?
             │
             └─ deploy-backend.yml
                     ├─ tsc --noEmit (gate)
                     └─ POST /v1/services/:id/redeploy  →  Koyeb rebuilds from GitHub
```

```
Pull request to main
     │
     └─ ci.yml
             ├─ check-client: tsc --noEmit
             └─ check-server: tsc --noEmit
```

---

## Adding Branch Protection (Recommended)

Once CI is running, go to **GitHub → Settings → Branches → Add rule** for `main`:

- Require status checks to pass: `Type-check client`, `Type-check server`
- Require branches to be up to date before merging
- Restrict who can push to matching branches

This makes the type-check jobs a hard gate — PRs with broken types cannot be merged.
