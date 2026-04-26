# wdym — Architecture Reference

Quick-start reference for coding agents. Read this before touching any file.

---

## What it is

A dark-mode survey builder. Users land on the marketing page → sign up with email verification → build a survey on a drag-and-drop canvas → publish/unpublish it → share a public link → preview it → view analytics with logic debugger.

---

## Stack

| Layer         | Technology                                                                               |
| ------------- | ---------------------------------------------------------------------------------------- |
| Backend       | Node.js + Express 5, TypeScript                                                          |
| ORM           | Prisma 5 + PostgreSQL                                                                    |
| Auth          | JWT — access token 15 min, refresh token 7 days, bcrypt passwords, OTP email verification |
| Cache / OTP   | Redis (RedisLabs cloud) — OTP storage + rate-limit counters                             |
| Email         | Nodemailer → Gmail SMTP                                                                  |
| Validation    | Zod (server-side only)                                                                   |
| Frontend      | React 19 + Vite 6                                                                        |
| Styling       | Tailwind CSS v4 — configured via `@tailwindcss/vite` plugin, **no `tailwind.config.js`** |
| Animation     | Framer Motion                                                                            |
| State         | Zustand (3 stores: auth, builder, survey)                                                |
| Routing       | TanStack Router v1                                                                       |
| Data fetching | TanStack Query v5                                                                        |
| Canvas        | @xyflow/react v12 (React Flow)                                                           |
| Icons         | Lucide React — **only icon library used**                                                |
| Env loading   | `dotenv` — loaded via `import 'dotenv/config'` as the first import in `server/src/index.ts` |

---

## Directory layout

```
wdym/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Type-check both sides on every PR
│       ├── deploy-frontend.yml    # Vercel deploy on client/** changes to main
│       └── deploy-backend.yml     # Koyeb redeploy on server/** changes to main
├── architecture.md                # This file
├── ci-cd.md                       # CI/CD setup guide and what to configure
├── vercel.json                    # SPA rewrites for Vercel
├── server/
│   ├── prisma/
│   │   └── schema.prisma          # Single source of truth for DB models
│   └── src/
│       ├── index.ts               # Express entry — loads dotenv first, connects Redis, port 4000
│       ├── controllers/
│       │   ├── auth.ts            # register, login, refresh, verifyOtp, resendOtp
│       │   ├── surveys.ts         # CRUD + publish + unpublish + analytics
│       │   ├── public.ts          # unauthenticated survey view + response tracking
│       │   └── generate.ts        # AI survey generation (Gemini + Claude)
│       ├── routes/
│       │   ├── auth.ts            # /auth/*
│       │   ├── surveys.ts         # /surveys/* (all require auth middleware)
│       │   └── public.ts          # /s/* (no auth)
│       ├── middleware/
│       │   ├── auth.ts            # JWT verify → attaches req.userId
│       │   └── cors.ts            # CORS config
│       └── lib/
│           ├── prisma.ts          # Singleton Prisma client
│           ├── redis.ts           # Redis client (createClient with REDIS_URL), connectRedis()
│           └── mail.ts            # Nodemailer transporter, sendOtpEmail(to, otp)
└── client/
    └── src/
        ├── main.tsx               # React root, RouterProvider, QueryClientProvider
        ├── router.tsx             # All routes — includes redirectIfAuth guard
        ├── pages/
        │   ├── Landing.tsx        # Public marketing page at /
        │   ├── Login.tsx          # Two-step: credentials → OTP if unverified
        │   ├── Register.tsx       # Two-step: credentials → OTP verification
        │   ├── Dashboard.tsx      # Survey list — create/delete/preview/unpublish
        │   ├── Builder.tsx        # Loads survey, wraps DragCanvas, Settings + Preview buttons
        │   ├── Preview.tsx        # Auth-guarded survey preview — no responses stored
        │   ├── Survey.tsx         # Public respondent view
        │   └── Analytics.tsx      # Overview / Segments / Responses tabs + Logic Debugger
        ├── components/
        │   ├── auth/
        │   │   └── OtpBoxes.tsx        # 6-box OTP input with paste + auto-advance
        │   ├── builder/
        │   │   ├── DragCanvas.tsx      # ReactFlowProvider → FlowCanvas
        │   │   ├── BlockNode.tsx       # Custom RF node renderer
        │   │   ├── BlockPalette.tsx    # Floating left palette (drag source)
        │   │   ├── NodeConfigPanel.tsx # Floating right config panel
        │   │   ├── LogicEdge.tsx       # Custom RF edge with delete button
        │   │   ├── CommandPalette.tsx  # Cmd+K search
        │   │   ├── GenerateModal.tsx   # AI generation modal (⌘G)
        │   │   └── SettingsModal.tsx   # Survey-level settings modal
        │   ├── landing/
        │   │   ├── Hero.tsx            # Two-column hero with coded builder mock
        │   │   ├── Marquee.tsx         # CSS-only scrolling feature strip
        │   │   ├── Features.tsx        # Bento-style feature cards
        │   │   ├── HowItWorks.tsx      # 3-step explainer
        │   │   └── Footer.tsx          # Wordmark + links
        │   ├── survey/
        │   │   ├── PublicSurveyRenderer.tsx  # Drives survey flow; accepts preview?: boolean
        │   │   ├── QuestionBlock.tsx
        │   │   ├── RatingBlock.tsx
        │   │   ├── MatrixBlock.tsx
        │   │   ├── StatementBlock.tsx
        │   │   └── RecallBlock.tsx
        │   └── ui/
        │       ├── Button.tsx
        │       ├── Input.tsx           # forwardRef — supports ref prop
        │       ├── Modal.tsx
        │       ├── Badge.tsx
        │       └── ThemeToggle.tsx
        ├── store/
        │   ├── auth.ts     # user, accessToken, refreshToken — persisted to localStorage (key: wdym-auth)
        │   ├── builder.ts  # nodes, edges, title, settings, isDirty, selectedNodeId
        │   ├── survey.ts   # respondent in-progress state
        │   └── theme.ts    # dark/light toggle
        └── lib/
            ├── api.ts      # axios instance (api) + publicApi; auto token refresh on 401
            └── utils.ts    # shared helpers (debounce, formatDate, cn)
```

### Ignore these completely

| Path                        | Reason                          |
| --------------------------- | ------------------------------- |
| `server/node_modules/`      | dependencies                    |
| `client/node_modules/`      | dependencies                    |
| `server/dist/`              | compiled output, never edit     |
| `client/dist/`              | Vite build output, never edit   |
| `server/prisma/migrations/` | auto-generated, never hand-edit |
| `client/package-lock.json`  | lockfile                        |
| `server/package-lock.json`  | lockfile                        |
| `package-lock.json`         | root lockfile                   |
| `client/src/vite-env.d.ts`  | Vite type shim, don't touch     |

---

## Database models

### User

| Field         | Type        | Notes                                                                  |
| ------------- | ----------- | ---------------------------------------------------------------------- |
| id            | String UUID | PK                                                                     |
| email         | String      | unique                                                                 |
| password      | String      | bcrypt hash                                                            |
| emailVerified | Boolean     | `@default(true)` — existing users are pre-verified; new users start as `false` |
| createdAt     | DateTime    |                                                                        |

### Survey

| Field       | Type        | Notes                                                                                  |
| ----------- | ----------- | -------------------------------------------------------------------------------------- |
| id          | String UUID | PK                                                                                     |
| slug        | String      | unique, used in public URL `/s/:slug`                                                  |
| title       | String      |                                                                                        |
| blocks      | Json        | `BlockNode[]` from React Flow — array of `{id, position, data:{blockType, config}}`    |
| edges       | Json        | `Edge[]` from React Flow — array of `{id, source, target, sourceHandle, type:'logic'}` |
| settings    | Json        | Survey-level settings object (theme, etc.) — `@default({})`                           |
| views       | Int         | incremented on every `GET /s/:slug`                                                    |
| published   | Boolean     | gate for public access                                                                 |
| publishedAt | DateTime?   | null when unpublished                                                                  |
| userId      | String      | FK → User                                                                              |

### Response

| Field       | Type        | Notes                                                                   |
| ----------- | ----------- | ----------------------------------------------------------------------- |
| id          | String UUID | PK                                                                      |
| surveyId    | String      | FK → Survey (cascade delete)                                            |
| answers     | Json        | `Record<field, value>` — keys are `config.field` strings from blocks    |
| completed   | Boolean     | false while in-progress, true on final submit                           |
| lastBlockId | String?     | last block the respondent interacted with — used for drop-off analytics |
| createdAt   | DateTime    |                                                                         |

---

## API routes

### Auth — `/auth/*` (no middleware)

```
POST /auth/register      { email, password }      → { requiresVerification: true, userId }
POST /auth/login         { email, password }      → { user, accessToken, refreshToken }
                                                     OR 403 { requiresVerification: true, userId }
POST /auth/refresh       { refreshToken }          → { accessToken }
POST /auth/verify-otp    { userId, otp }           → { user, accessToken, refreshToken }
POST /auth/resend-otp    { userId }                → { ok: true }
```

**OTP rules:**
- OTP is 6 digits, valid for 5 minutes (stored in Redis `otp:{userId}`, TTL 300s)
- Max **5 wrong attempts** per 15-minute window (`otp:attempts:{userId}`, TTL 900s) → 429 with minutes remaining
- Max **3 resends** per hour (`otp:resend:{userId}`, TTL 3600s) → 429 with minutes remaining
- Resending resets the attempt counter so the user gets a fresh 5 tries
- Login with unverified account: issues a fresh OTP if none exists, returns 403
- All validation errors return `{ error: string }` — never a Zod flatten object

### Surveys — `/surveys/*` (all require `Authorization: Bearer <accessToken>`)

```
GET    /surveys                  → Survey[] (title, slug, published, views, _count.responses)
POST   /surveys                  { title? } → Survey
GET    /surveys/:id              → Survey (full, with blocks/edges/settings)
PATCH  /surveys/:id              { title?, blocks?, edges?, settings? } → Survey
DELETE /surveys/:id              → 204
POST   /surveys/:id/publish      → Survey + { url: '/s/:slug' }
POST   /surveys/:id/unpublish    → Survey (published: false, publishedAt: null)
GET    /surveys/:id/analytics    → AnalyticsData (see below)
POST   /surveys/:id/generate     { prompt, model } → { title, nodes, edges }
```

**Analytics response shape:**

```ts
{
  title, views, blocks, edges, publishedAt, published,
  stats: { views, completed, started, forfeited, completionRate, viewToStart },
  dropOff: { blockId, count }[],       // incomplete responses grouped by lastBlockId
  responses: { id, createdAt, answers }[]  // completed only
}
```

### Public — `/s/*` (no auth)

```
GET   /s/:slug                    → { id, title, slug, blocks, edges }  (increments views)
POST  /s/:slug/response           { answers, lastBlockId? } → { id }    (creates partial response)
PATCH /s/:slug/response/:id       { answers, lastBlockId?, completed? } → { ok: true }
```

---

## Block types

All blocks live in `survey.blocks` as React Flow nodes. The `data` field always has shape `{ blockType: BlockType, config: BlockConfig }`.

| blockType      | Purpose                                                | Config fields                                                               |
| -------------- | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| `question`     | Text or multiple-choice question                       | `label, field, questionType ('text'│'multiple_choice'), required, options?` |
| `rating`       | NPS or star rating                                     | `label, field, style ('nps'│'stars'), required`                             |
| `matrix`       | Grid rating                                            | `label, field, rows[], columns[], required`                                 |
| `statement`    | Read-only text slide                                   | `text, buttonLabel`                                                         |
| `recall`       | Question referencing a previous answer via `{{field}}` | `label, field, recallField, questionType, options?, required`               |
| `hidden_field` | Captures URL query param                               | `field, paramName, defaultValue`                                            |
| `if_else`      | Conditional branch (2 outputs: `true`/`false` handles) | `field, operator, value`                                                    |
| `switch`       | Multi-branch (N outputs, one per case)                 | `field, cases[{value,label}]`                                               |
| `end`          | Terminal node                                          | `message`                                                                   |

**Interactive blocks** (produce answers): `question`, `rating`, `matrix`, `recall`, `hidden_field`  
**Logic blocks** (no answers): `if_else`, `switch`, `end`, `statement`

The `field` property on interactive blocks is the key used in `Response.answers`. It must be unique within a survey.

---

## State management

### `useBuilderStore` (`store/builder.ts`)

Zustand store, **not persisted**. Loaded from server on builder mount.

- `nodes / edges / title / settings` — React Flow state + survey settings
- `isDirty` — true whenever nodes/edges/title/settings change; triggers debounced auto-save
- `selectedNodeId` — drives `NodeConfigPanel`
- Key actions: `addNode`, `deleteNode`, `deleteEdge`, `updateNodeConfig`, `loadSurvey`, `markClean`, `setTitle`

### `useAuthStore` (`store/auth.ts`)

Persisted to `localStorage` under key `wdym-auth`.

- `accessToken` — attached to every `api` request
- `refreshToken` — used by `api.ts` interceptor to silently refresh on 401

### `useSurveyStore` (`store/survey.ts`)

Respondent-side state: current block, collected answers, response session ID.

### `useThemeStore` (`store/theme.ts`)

Dark/light toggle state.

---

## Auth flow

### Registration (new accounts)

1. `POST /auth/register` → creates user with `emailVerified: false`, sends OTP email, returns `{ requiresVerification, userId }` (no tokens)
2. Frontend slides to OTP step (6-box input, `OtpBoxes.tsx`)
3. `POST /auth/verify-otp { userId, otp }` → validates OTP from Redis, marks `emailVerified: true`, returns tokens
4. `useAuthStore.setAuth(...)` → navigate to `/dashboard`

### Login (existing accounts)

1. `POST /auth/login` → if `emailVerified: true`, returns tokens normally
2. If `emailVerified: false` → issues fresh OTP (if no active one), returns 403 `{ requiresVerification, userId }`
3. Frontend slides to OTP step — same flow as registration

### Token lifecycle

- `api.ts` request interceptor injects `Authorization: Bearer <accessToken>`
- `api.ts` response interceptor catches 401 → calls `POST /auth/refresh` → retries original request
- If refresh fails → `logout()` + redirect to `/login`

### Route guards (`router.tsx`)

- `requireAuth()` — redirects to `/login` if no `accessToken` (used on dashboard, builder, analytics, preview)
- `redirectIfAuth()` — redirects to `/dashboard` if authenticated (used on `/`, `/login`, `/register`)

---

## Preview flow

`/preview/:id` — auth-guarded page (only the survey owner can preview).

- Fetches survey via `api.get('/surveys/:id')` (authenticated, so draft surveys work)
- Renders `<PublicSurveyRenderer preview={true} onSubmit={() => {}} onProgress={() => {}} />`
- No responses created or updated — all callbacks are no-ops
- `PublicSurveyRenderer` detects `preview={true}` and shows "Preview complete — no response was saved." on completion instead of the normal thank-you message
- Accessible from Dashboard (Play icon, opens in new tab) and Builder top bar (Play button)

---

## Survey response flow (public)

1. Respondent opens `/s/:slug` → `GET /s/:slug` (views +1)
2. `PublicSurveyRenderer` resolves block order by walking `edges` from the start node (block with no incoming edges)
3. On first answer → `POST /s/:slug/response { answers, lastBlockId }` → returns `{ id }` stored in `sessionStorage`
4. On each subsequent answer → `PATCH /s/:slug/response/:id { answers, lastBlockId }`
5. On final submit → `PATCH` with `{ completed: true }`
6. If respondent closes mid-survey → `completed=false`, `lastBlockId` records where they stopped

---

## Analytics — Logic Debugger

Inside the Responses tab, each response row has an "Answers | Logic trace" toggle.

The trace replays the exact survey flow for that response:
- Walks blocks from start using the same `if_else` / `switch` evaluation logic as `PublicSurveyRenderer`
- For each block, records: what was answered, which condition evaluated TRUE/FALSE, which branch was taken, which was skipped
- Uses a `visited` Set to prevent infinite loops on cyclic graphs

Key types in `Analytics.tsx`:
```ts
type TraceStatus = 'answered' | 'skipped' | 'shown' | 'branch_true' | 'branch_false' | 'switch_match' | 'switch_miss' | 'terminal'
interface TraceStep { blockId, blockType, label, status, answer?, conditionText?, conditionResult?, matchedCase?, branchTaken?, skippedBranchLabel? }
```

---

## Design constraints — must follow

- **Dark mode only** in design intent (ThemeToggle exists but dark is default/primary)
- Color palette: bg `#000` dark / `#fff` light · surface `#0a0a0a` / `#fafafa` · border `#1a1a1a` / `#f4f4f5` · muted text `#888` / `#a1a1aa`
- **No sidebars** in the builder — floating left palette, floating right config panel
- **Lucide React only** for icons — no emojis, no other icon libs
- **No Tailwind config file** — all config is in `vite.config.ts` via `@tailwindcss/vite`
- Dynamic Tailwind classes (e.g. `grid-cols-${n}`) do **not** work — use ternaries with full class strings
- Inline styles acceptable for dynamic colors/opacities that Tailwind can't express
- Zod validation errors must always return `{ error: string }` to the client — never `error.flatten()` (which returns an object that crashes React rendering)

---

## Redis usage

Redis is used exclusively for OTP management. All keys are scoped by `userId`.

| Key                      | Value          | TTL      | Purpose                            |
| ------------------------ | -------------- | -------- | ---------------------------------- |
| `otp:{userId}`           | 6-digit string | 300s     | The active OTP                     |
| `otp:attempts:{userId}`  | integer count  | 900s     | Wrong-guess counter (max 5)        |
| `otp:resend:{userId}`    | integer count  | 3600s    | Resend counter (max 3/hour)        |

On successful verification: all three keys are deleted. On resend: `otp:{userId}` is overwritten and `otp:attempts:{userId}` is deleted (fresh 5 tries).

---

## Environment variables

### Server (`server/.env`)

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
GEMINI_API_KEY=...              # AI generation
ANTHROPIC_API_KEY=...           # AI generation
PORT=4000                       # optional, defaults to 4000

# Email (Gmail SMTP)
JAVA_MAIL_HOST=smtp.gmail.com
JAVA_MAIL_PORT=587
JAVA_MAIL_USERNAME=...          # Gmail address
JAVA_MAIL_PASSWORD=...          # Gmail app password

# Redis
REDIS_URL=redis://...           # Full connection string — used directly by createClient({ url })
```

**Important:** `import 'dotenv/config'` MUST be the first import in `server/src/index.ts`. All other modules (especially `redis.ts`) call `createClient` at module evaluation time, so dotenv must run first. Using the individual `REDIS_SOCKET_HOST/PORT` fields on the `socket` option does not work reliably — always use `REDIS_URL`.

### Client (`client/.env`)

```
VITE_API_URL=http://localhost:4000   # optional, defaults to this
```

---

## CI/CD

Three GitHub Actions workflows. Full setup guide in `ci-cd.md`.

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `ci.yml` | PR to `main` | `tsc --noEmit` on both client and server in parallel |
| `deploy-frontend.yml` | Push to `main`, `client/**` or `vercel.json` changed | Type-check → Vercel CLI pull/build/deploy |
| `deploy-backend.yml` | Push to `main`, `server/**` changed | Type-check → `POST /v1/services/:id/redeploy` to Koyeb |

**Required GitHub secrets:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `KOYEB_API_KEY`, `KOYEB_SERVICE_ID`

---

## Dev commands

```bash
# Server
cd server && npm run dev          # tsx watch, hot reload, loads .env via dotenv

# Client
cd client && npm run dev          # Vite dev server, port 5173

# DB schema changes — run after editing prisma/schema.prisma
cd server && npx prisma db push   # push schema (no migration file)
cd server && npx prisma generate  # regenerate Prisma client (required after schema change)
cd server && npx prisma studio    # visual DB browser

# Type check
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit
```
