# wdym — Architecture Reference

Quick-start reference for coding agents. Read this before touching any file.

---

## What it is

A dark-mode survey builder. Users land on the marketing page → sign up with email verification → create or join a workspace → build a survey on a drag-and-drop canvas → publish/unpublish it → share a public link → preview it → view analytics with logic debugger.

Surveys are workspace-scoped: a user only sees surveys belonging to their active workspace. Switching workspaces shows a different survey list.

---

## Stack

| Layer         | Technology                                                                                |
| ------------- | ----------------------------------------------------------------------------------------- |
| Backend       | Node.js + Express 5, TypeScript                                                           |
| ORM           | Prisma 5 + PostgreSQL                                                                     |
| Auth          | JWT — access token 15 min, refresh token 7 days, bcrypt passwords, OTP email verification |
| MFA           | TOTP via `otplib` v13 (authenticator apps); AES-256-GCM encrypted secrets at rest         |
| Cache / OTP   | Redis (RedisLabs cloud) — OTP, MFA temp tokens, rate-limit counters                       |
| Email         | Nodemailer → Gmail SMTP                                                                   |
| Validation    | Zod (server-side only)                                                                    |
| Frontend      | React 19 + Vite 6                                                                         |
| Styling       | Tailwind CSS v4 — configured via `@tailwindcss/vite` plugin, **no `tailwind.config.js`**  |
| Animation     | Framer Motion                                                                             |
| State         | Zustand (4 stores: auth, builder, survey, theme)                                          |
| Routing       | TanStack Router v1                                                                        |
| Data fetching | TanStack Query v5                                                                         |
| Canvas        | @xyflow/react v12 (React Flow)                                                            |
| Icons         | Lucide React — **only icon library used**                                                 |
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
│       │   ├── auth.ts            # register, login, refresh, verifyOtp, resendOtp, changePassword
│       │   ├── surveys.ts         # CRUD + publish + unpublish + analytics (workspace-scoped)
│       │   ├── workspaces.ts      # list, create, get, delete, inviteToWorkspace, removeMember
│       │   ├── invites.ts         # getInvite (public), acceptInvite (authenticated)
│       │   ├── mfa.ts             # getMfaStatus, setupMfa, verifyMfaSetup, disableMfa, verifyMfaLogin
│       │   ├── public.ts          # unauthenticated survey view + response tracking
│       │   └── generate.ts        # AI survey generation (Gemini + Claude)
│       ├── routes/
│       │   ├── auth.ts            # /auth/*
│       │   ├── surveys.ts         # /surveys/* (all require auth middleware)
│       │   ├── workspaces.ts      # /workspaces/* (all require auth middleware)
│       │   ├── invites.ts         # /invite/* (getInvite public, acceptInvite authenticated)
│       │   ├── mfa.ts             # /mfa/* (verify public, rest authenticated)
│       │   └── public.ts          # /s/* (no auth)
│       ├── middleware/
│       │   ├── auth.ts            # JWT verify → attaches req.userId
│       │   └── cors.ts            # CORS config — allows Content-Type, Authorization, X-Workspace-Id
│       └── lib/
│           ├── prisma.ts          # Singleton Prisma client
│           ├── redis.ts           # Redis client (createClient with REDIS_URL), connectRedis()
│           ├── mail.ts            # Nodemailer transporter, sendOtpEmail(), sendInviteEmail()
│           └── encrypt.ts         # AES-256-GCM encrypt/decrypt for MFA secrets
└── client/
    └── src/
        ├── main.tsx               # React root, RouterProvider, QueryClientProvider
        ├── router.tsx             # All routes — requireAuth, requireWorkspace, redirectIfAuth guards
        ├── pages/
        │   ├── Landing.tsx        # Public marketing page at /
        │   ├── Login.tsx          # Three-step: credentials → OTP (if unverified) → MFA (if enabled)
        │   ├── Register.tsx       # Two-step: credentials → OTP verification
        │   ├── CreateWorkspace.tsx # Onboarding + "new workspace" flow — auto-selects created workspace
        │   ├── Dashboard.tsx      # Survey list scoped to active workspace — create/delete/preview/unpublish
        │   ├── WorkspaceSettings.tsx # 5-tab settings: Workspace · Profile · Appearance · Security · Notifications
        │   ├── InviteAccept.tsx   # Public invite landing — accepts if logged in, stores token for post-login
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
        │   ├── auth.ts     # user, workspace, workspaces[], tokens — persisted (key: wdym-auth, version: 1)
        │   ├── builder.ts  # nodes, edges, title, settings, isDirty, selectedNodeId
        │   ├── survey.ts   # respondent in-progress state
        │   └── theme.ts    # dark/light toggle
        └── lib/
            ├── api.ts      # axios instance (api) + publicApi; injects Authorization + X-Workspace-Id; auto token refresh on 401
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

| Field         | Type        | Notes                                                                           |
| ------------- | ----------- | ------------------------------------------------------------------------------- |
| id            | String UUID | PK                                                                              |
| email         | String      | unique                                                                          |
| password      | String      | bcrypt hash                                                                     |
| emailVerified | Boolean     | `@default(true)` — existing users pre-verified; new registrations start `false` |
| mfaEnabled    | Boolean     | `@default(false)`                                                               |
| mfaSecret     | String?     | AES-256-GCM encrypted TOTP secret (null when MFA disabled)                      |
| createdAt     | DateTime    |                                                                                 |

### MfaBackupCode

| Field     | Type        | Notes                                              |
| --------- | ----------- | -------------------------------------------------- |
| id        | String UUID | PK                                                 |
| userId    | String      | FK → User (cascade delete)                         |
| codeHash  | String      | bcrypt hash of the plain backup code               |
| used      | Boolean     | `@default(false)` — each code is single-use        |
| createdAt | DateTime    |                                                    |

### Workspace

| Field     | Type        | Notes                          |
| --------- | ----------- | ------------------------------ |
| id        | String UUID | PK                             |
| name      | String      |                                |
| slug      | String      | unique, URL-safe auto-generated |
| ownerId   | String      | FK → User                      |
| createdAt | DateTime    |                                |

### WorkspaceMember

| Field       | Type        | Notes                                   |
| ----------- | ----------- | --------------------------------------- |
| id          | String UUID | PK                                      |
| workspaceId | String      | FK → Workspace (cascade delete)         |
| userId      | String      | FK → User (cascade delete)              |
| createdAt   | DateTime    |                                         |

Unique constraint: `(workspaceId, userId)`.

### WorkspaceInvite

| Field       | Type        | Notes                                                      |
| ----------- | ----------- | ---------------------------------------------------------- |
| id          | String UUID | PK                                                         |
| workspaceId | String      | FK → Workspace (cascade delete)                            |
| email       | String      |                                                            |
| token       | String      | unique, 32-byte random hex — used in invite URL            |
| accepted    | Boolean     | `@default(false)`                                          |
| expiresAt   | DateTime    | 7 days from creation                                       |
| createdAt   | DateTime    |                                                            |

Unique constraint: `(workspaceId, email)` — one pending invite per email per workspace.

### Survey

| Field       | Type        | Notes                                                                                  |
| ----------- | ----------- | -------------------------------------------------------------------------------------- |
| id          | String UUID | PK                                                                                     |
| slug        | String      | unique, used in public URL `/s/:slug`                                                  |
| title       | String      |                                                                                        |
| blocks      | Json        | `BlockNode[]` from React Flow — array of `{id, position, data:{blockType, config}}`    |
| edges       | Json        | `Edge[]` from React Flow — array of `{id, source, target, sourceHandle, type:'logic'}` |
| settings    | Json        | Survey-level settings object — `@default({})`                                          |
| views       | Int         | incremented on every `GET /s/:slug`                                                    |
| published   | Boolean     | gate for public access                                                                 |
| publishedAt | DateTime?   | null when unpublished                                                                  |
| userId      | String      | FK → User (cascade delete)                                                             |
| workspaceId | String      | FK → Workspace (cascade delete) — surveys are workspace-scoped                         |

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

### Auth — `/auth/*`

```
POST /auth/register        { email, password }                   → { requiresVerification: true, userId }
POST /auth/login           { email, password }                   → { user, accessToken, refreshToken, workspaces[] }
                                                                    OR 403 { requiresVerification: true, userId }
                                                                    OR { requiresMfa: true, tempToken }
POST /auth/refresh         { refreshToken }                      → { accessToken }
POST /auth/verify-otp      { userId, otp }                       → { user, accessToken, refreshToken, workspaces[] }
POST /auth/resend-otp      { userId }                            → { ok: true }
POST /auth/change-password { currentPassword, newPassword }      → { ok: true }   (requires auth)
```

**OTP rules:**
- OTP is 6 digits, valid for 5 minutes (Redis `otp:{userId}`, TTL 300s)
- Max **5 wrong attempts** per 15-minute window → 429 with minutes remaining
- Max **3 resends** per hour → 429 with minutes remaining
- Resending a new OTP resets the attempt counter
- Login with unverified account: issues a fresh OTP if none exists, returns 403

### Workspaces — `/workspaces/*` (all require auth)

```
GET    /workspaces                          → Workspace[]
POST   /workspaces          { name }        → Workspace
GET    /workspaces/:id                      → WorkspaceDetail (members[], invites[])
DELETE /workspaces/:id                      → 204  (owner only; blocked if only workspace)
POST   /workspaces/:id/invite  { email }    → { ok: true, joined: false }
DELETE /workspaces/:id/members/:userId      → 204
```

**Invite rules:**
- Any member can invite; all invites go through the link — existing users are NOT auto-added.
- If the email is already a member → 409.
- The invite record is upserted (refreshes token + expiry if re-invited).

### Invites — `/invite/*`

```
GET  /invite/:token          → { workspaceName, email }         (public)
POST /invite/:token/accept   → { workspace }                    (requires auth)
```

Accepting: upserts `WorkspaceMember`, marks invite `accepted: true`.

### MFA — `/mfa/*`

```
POST /mfa/verify             { tempToken, code }   → { user, accessToken, refreshToken, workspaces[] }  (public — second login step)
GET  /mfa/status                                   → { enabled, backupCodesRemaining }  (auth)
POST /mfa/setup                                    → { qrCode, secret, otpauthUrl }     (auth)
POST /mfa/verify-setup       { code }              → { backupCodes: string[] }          (auth)
POST /mfa/disable            { code }              → { ok: true }                       (auth)
```

**MFA rules:**
- Setup: secret stored in Redis (`mfa:setup:{userId}`, TTL 600s) until verified.
- On confirm: secret encrypted with AES-256-GCM (`lib/encrypt.ts`) and persisted to `User.mfaSecret`; 8 backup codes generated, bcrypt-hashed, stored in `MfaBackupCode`.
- Login with MFA enabled: `POST /auth/login` returns `{ requiresMfa: true, tempToken }`. The `tempToken` is a 32-byte random hex string stored in Redis (`mfa:temp:{token}` → userId, TTL 300s) — **not a JWT**.
- `POST /mfa/verify` accepts a TOTP code OR a backup code (backup codes are single-use).
- Max **5 wrong attempts** per 15-minute window (`mfa:attempts:{userId}`, TTL 900s) → 429.
- `otplib` v13 functional API — use `generateSecret()`, `generateURI()`, `verifySync()`. No `authenticator` export. `verifySync` options do not accept a `type` field.

### Surveys — `/surveys/*` (all require auth + `X-Workspace-Id` header)

```
GET    /surveys                  → Survey[]  (filtered to active workspace)
POST   /surveys                  { title? }                              → Survey
GET    /surveys/:id              → Survey (full, with blocks/edges/settings)
PATCH  /surveys/:id              { title?, blocks?, edges?, settings? }  → Survey
DELETE /surveys/:id              → 204
POST   /surveys/:id/publish      → Survey + { url: '/s/:slug' }
POST   /surveys/:id/unpublish    → Survey
GET    /surveys/:id/analytics    → AnalyticsData
POST   /surveys/:id/generate     { prompt, model }                       → { title, nodes, edges }
```

`GET /surveys` and `POST /surveys` require the `X-Workspace-Id` header (the active workspace ID). The `api.ts` interceptor injects this automatically from `useAuthStore.workspace.id`.

**Analytics response shape:**

```ts
{
  title, views, blocks, edges, publishedAt, published,
  stats: { views, completed, started, forfeited, completionRate, viewToStart },
  dropOff: { blockId, count }[],
  responses: { id, createdAt, answers }[]
}
```

### Public — `/s/*` (no auth)

```
GET   /s/:slug                    → { id, title, slug, blocks, edges }  (increments views)
POST  /s/:slug/response           { answers, lastBlockId? }             → { id }
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

### `useAuthStore` (`store/auth.ts`)

Persisted to `localStorage` under key `wdym-auth` (version: 1).

```ts
interface AuthState {
  user: { id: string; email: string } | null
  workspace: Workspace | null        // active workspace
  workspaces: Workspace[]            // all workspaces user belongs to
  accessToken: string | null
  refreshToken: string | null
  setAuth(user, accessToken, refreshToken, workspaces: Workspace[]): void
  setWorkspace(w: Workspace): void   // switch active workspace
  addWorkspace(w: Workspace): void   // add without switching (unless no current)
  removeWorkspace(id: string): void  // auto-switches to first remaining
  setAccessToken(token: string): void
  logout(): void
}
```

`setAuth` keeps the previously active workspace if it still exists in the new workspaces list.

Version migration: v0 had a singular `workspace` field — v1 migrate converts it to `workspaces: [workspace]`.

### `useBuilderStore` (`store/builder.ts`)

Zustand store, **not persisted**. Loaded from server on builder mount.

- `nodes / edges / title / settings` — React Flow state + survey settings
- `isDirty` — true whenever nodes/edges/title/settings change; triggers debounced auto-save
- `selectedNodeId` — drives `NodeConfigPanel`
- Key actions: `addNode`, `deleteNode`, `deleteEdge`, `updateNodeConfig`, `loadSurvey`, `markClean`, `setTitle`

### `useSurveyStore` (`store/survey.ts`)

Respondent-side state: current block, collected answers, response session ID.

### `useThemeStore` (`store/theme.ts`)

Dark/light toggle state.

---

## Auth flow

### Registration

1. `POST /auth/register` → creates user with `emailVerified: false`, sends OTP, returns `{ requiresVerification, userId }`
2. Frontend shows OTP step (`OtpBoxes.tsx`)
3. `POST /auth/verify-otp` → validates OTP, marks `emailVerified: true`, returns `{ user, accessToken, refreshToken, workspaces[] }`
4. `setAuth(...)` → navigate to `/dashboard` (or `/create-workspace` if `workspaces` is empty)

### Login

1. `POST /auth/login` — three possible outcomes:
   - `emailVerified: false` → 403 `{ requiresVerification, userId }` → OTP step
   - `mfaEnabled: true` → `{ requiresMfa: true, tempToken }` → MFA step
   - Normal → `{ user, accessToken, refreshToken, workspaces[] }` → dashboard
2. **MFA step:** `POST /mfa/verify { tempToken, code }` → same success shape as normal login

### Pending invite flow

If a user follows an invite link while not logged in, the token is stored in `sessionStorage('pendingInvite')`. After successful login/register, `Login.tsx` checks for it and calls `POST /invite/:token/accept` before navigating to the dashboard.

### Token lifecycle

- `api.ts` request interceptor injects `Authorization: Bearer <accessToken>` and `X-Workspace-Id: <workspace.id>`
- `api.ts` response interceptor catches 401 → calls `POST /auth/refresh` → retries original request
- If refresh fails → `logout()` + redirect to `/login`

### Route guards (`router.tsx`)

| Guard                | Behaviour                                                                 | Used on                                  |
| -------------------- | ------------------------------------------------------------------------- | ---------------------------------------- |
| `requireAuth`        | Redirects to `/login` if no `accessToken`                                 | `/create-workspace`, builder, analytics, preview |
| `requireWorkspace`   | Redirects to `/login` (no token) or `/create-workspace` (no workspace)    | `/dashboard`, `/settings`, builder, analytics, preview |
| `redirectIfAuth`     | Redirects to `/dashboard` (has workspaces) or `/create-workspace` (none) | `/`, `/login`, `/register`              |

### Routes

```
/                     Landing (redirectIfAuth)
/login                Login (redirectIfAuth)
/register             Register (redirectIfAuth)
/create-workspace     CreateWorkspace (requireAuth — any authenticated user, including those with existing workspaces)
/dashboard            Dashboard (requireWorkspace)
/settings             WorkspaceSettings 5-tab (requireWorkspace)
/workspace/settings   alias → same component (requireWorkspace)
/builder/:id          Builder (requireWorkspace)
/analytics/:id        Analytics (requireWorkspace)
/preview/:id          Preview (requireWorkspace)
/s/:slug              Survey (public)
/invite/:token        InviteAccept (public)
```

---

## Workspace flow

Every user must belong to at least one workspace. Surveys, members, and invites are all workspace-scoped.

- **Creating a workspace:** `POST /workspaces { name }` → automatically creates a `WorkspaceMember` for the owner and sets the new workspace as the active one in the client store.
- **Switching workspaces:** `setWorkspace(w)` in the Zustand store — the query key `['surveys', workspace.id]` changes, triggering a fresh fetch for that workspace's surveys.
- **Inviting members:** Always sends an invite email with a link — no user is ever auto-added, even if they already have an account. They must click the link and accept.
- **Accepting an invite:** `POST /invite/:token/accept` (authenticated) → upserts `WorkspaceMember`, marks invite accepted, returns the workspace object. Client calls `addWorkspace(workspace)`.
- **Deleting a workspace:** Owner only. Blocked if the user's only workspace (must have ≥ 2 memberships total).
- **Leaving a workspace:** Any non-owner member can remove themselves via `DELETE /workspaces/:id/members/:userId`.

---

## Settings page (`/settings`)

Five tabs rendered inside `WorkspaceSettings.tsx`:

| Tab           | Contents                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| Workspace     | Member list, pending invites, invite by email, danger zone (delete)     |
| Profile       | Read-only email display with avatar initial                              |
| Appearance    | Dark / Light theme picker (card UI)                                      |
| Security      | TOTP MFA setup/disable + change password                                 |
| Notifications | Placeholder — "coming soon"                                              |

---

## Preview flow

`/preview/:id` — auth-guarded (owner only).

- Fetches survey via `api.get('/surveys/:id')` (authenticated, so draft surveys work)
- Renders `<PublicSurveyRenderer preview={true} />`
- No responses created — all callbacks are no-ops
- Shows "Preview complete — no response was saved." on completion

---

## Survey response flow (public)

1. Respondent opens `/s/:slug` → `GET /s/:slug` (views +1)
2. `PublicSurveyRenderer` resolves block order by walking `edges` from the start node (block with no incoming edges)
3. On first answer → `POST /s/:slug/response { answers, lastBlockId }` → returns `{ id }` stored in `sessionStorage`
4. On each subsequent answer → `PATCH /s/:slug/response/:id { answers, lastBlockId }`
5. On final submit → `PATCH` with `{ completed: true }`
6. If respondent closes mid-survey → `completed=false`, `lastBlockId` records drop-off point

---

## Analytics — Logic Debugger

Inside the Responses tab, each response row has an "Answers | Logic trace" toggle.

The trace replays the exact survey flow for that response:
- Walks blocks from start using the same `if_else` / `switch` evaluation logic as `PublicSurveyRenderer`
- Records: what was answered, which condition evaluated TRUE/FALSE, which branch was taken/skipped
- Uses a `visited` Set to prevent infinite loops on cyclic graphs

Key types in `Analytics.tsx`:
```ts
type TraceStatus = 'answered' | 'skipped' | 'shown' | 'branch_true' | 'branch_false' | 'switch_match' | 'switch_miss' | 'terminal'
interface TraceStep { blockId, blockType, label, status, answer?, conditionText?, conditionResult?, matchedCase?, branchTaken?, skippedBranchLabel? }
```

---

## Redis usage

| Key                       | Value          | TTL    | Purpose                                           |
| ------------------------- | -------------- | ------ | ------------------------------------------------- |
| `otp:{userId}`            | 6-digit string | 300s   | Active OTP for email verification                 |
| `otp:attempts:{userId}`   | integer count  | 900s   | Wrong OTP guess counter (max 5)                   |
| `otp:resend:{userId}`     | integer count  | 3600s  | OTP resend counter (max 3/hour)                   |
| `mfa:setup:{userId}`      | TOTP secret    | 600s   | Temp secret during MFA setup (before DB write)    |
| `mfa:temp:{token}`        | userId string  | 300s   | Temp login token issued when MFA is required      |
| `mfa:attempts:{userId}`   | integer count  | 900s   | Wrong MFA code counter (max 5)                    |

On successful OTP verify: `otp:*` keys deleted. On OTP resend: `otp:{userId}` overwritten, `otp:attempts:{userId}` deleted.  
On successful MFA login: `mfa:temp:{token}` and `mfa:attempts:{userId}` deleted.

---

## Design constraints — must follow

- **Dark mode primary** (ThemeToggle exists, dark is default)
- Color palette: bg `#000` dark / `#fff` light · surface `#0a0a0a` / `#fafafa` · border `#1a1a1a` / `#f4f4f5` · muted text `#888` / `#a1a1aa`
- **No sidebars** in the builder — floating left palette, floating right config panel
- **Lucide React only** for icons — no emojis, no other icon libs
- **No Tailwind config file** — all config is in `vite.config.ts` via `@tailwindcss/vite`
- Dynamic Tailwind classes (e.g. `grid-cols-${n}`) do **not** work — use ternaries with full class strings
- Inline styles acceptable for dynamic colors/opacities Tailwind can't express
- Zod validation errors must always return `{ error: string }` to the client — never `error.flatten()` (returns an object that crashes React rendering)
- CORS allowed headers: `Content-Type`, `Authorization`, `X-Workspace-Id` — add new custom headers to `server/src/middleware/cors.ts`

---

## Environment variables

### Server (`server/.env`)

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
MFA_ENCRYPTION_KEY=...          # 64-char hex string (32 bytes) — AES-256-GCM key for TOTP secrets
GEMINI_API_KEY=...              # AI generation
ANTHROPIC_API_KEY=...           # AI generation
PORT=4000                       # optional, defaults to 4000
CLIENT_URL=http://localhost:5173  # used by CORS middleware
FRONTEND_URL=http://localhost:5173  # used for invite link generation

# Email (Gmail SMTP)
JAVA_MAIL_HOST=smtp.gmail.com
JAVA_MAIL_PORT=587
JAVA_MAIL_USERNAME=...          # Gmail address
JAVA_MAIL_PASSWORD=...          # Gmail app password

# Redis
REDIS_URL=redis://...           # Full connection string — always use REDIS_URL, not individual socket fields
```

**Important:** `import 'dotenv/config'` MUST be the first import in `server/src/index.ts`. All other modules call `createClient` at module evaluation time.

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
cd server && npx prisma db push              # push schema to local DB
cd server && npx prisma generate             # regenerate Prisma client (REQUIRED after any schema change)
cd server && npx prisma studio               # visual DB browser

# Push to production DB (Koyeb)
DATABASE_URL="<prod-url>" npx prisma db push

# Type check
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit
```

> **After any schema change:** always run both `prisma db push` AND `prisma generate`. Forgetting `generate` leaves the TypeScript types and the runtime client out of sync with the schema — all field accesses on new models will fail at runtime even though the DB has the columns.
