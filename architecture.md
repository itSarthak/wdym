# wdym — Architecture Reference

Quick-start reference for coding agents. Read this before touching any file.

---

## What it is

A dark-mode survey builder. Users log in → build a survey on a drag-and-drop canvas → publish it → share a public link → view analytics.

---

## Stack

| Layer         | Technology                                                                               |
| ------------- | ---------------------------------------------------------------------------------------- |
| Backend       | Node.js + Express 5, TypeScript                                                          |
| ORM           | Prisma 5 + PostgreSQL                                                                    |
| Auth          | JWT — access token 15 min, refresh token 7 days, bcrypt passwords                        |
| Validation    | Zod (server-side only)                                                                   |
| Frontend      | React 19 + Vite 6                                                                        |
| Styling       | Tailwind CSS v4 — configured via `@tailwindcss/vite` plugin, **no `tailwind.config.js`** |
| Animation     | Framer Motion                                                                            |
| State         | Zustand (3 stores: auth, builder, survey)                                                |
| Routing       | TanStack Router v1                                                                       |
| Data fetching | TanStack Query v5                                                                        |
| Canvas        | @xyflow/react v12 (React Flow)                                                           |
| Icons         | Lucide React — **only icon library used**                                                |

---

## Directory layout

```
wdym/
├── server/
│   ├── prisma/
│   │   └── schema.prisma          # Single source of truth for DB models
│   └── src/
│       ├── index.ts               # Express app entry — port 4000
│       ├── controllers/
│       │   ├── auth.ts            # register, login, refresh
│       │   ├── surveys.ts         # CRUD + publish + analytics
│       │   ├── public.ts          # unauthenticated survey view + response tracking
│       │   └── generate.ts        # AI survey generation (Claude API)
│       ├── routes/
│       │   ├── auth.ts            # /auth/*
│       │   ├── surveys.ts         # /surveys/* (all require auth middleware)
│       │   └── public.ts          # /s/* (no auth)
│       ├── middleware/
│       │   ├── auth.ts            # JWT verify → attaches req.userId
│       │   └── cors.ts            # CORS config
│       └── lib/
│           └── prisma.ts          # Singleton Prisma client
└── client/
    └── src/
        ├── main.tsx               # React root, RouterProvider, QueryClientProvider
        ├── router.tsx             # All routes defined here
        ├── pages/
        │   ├── Login.tsx
        │   ├── Register.tsx
        │   ├── Dashboard.tsx      # Survey list, create/delete
        │   ├── Builder.tsx        # Loads survey, wraps DragCanvas
        │   ├── Survey.tsx         # Public respondent view
        │   └── Analytics.tsx      # Analytics page (overview/segments/responses tabs)
        ├── components/
        │   ├── builder/
        │   │   ├── DragCanvas.tsx      # ReactFlowProvider → FlowCanvas
        │   │   ├── BlockNode.tsx       # Custom RF node renderer
        │   │   ├── BlockPalette.tsx    # Floating left palette (drag source)
        │   │   ├── NodeConfigPanel.tsx # Floating right config panel
        │   │   ├── LogicEdge.tsx       # Custom RF edge with delete button
        │   │   ├── CommandPalette.tsx  # Cmd+K search
        │   │   └── GenerateModal.tsx   # AI generation modal
        │   ├── survey/
        │   │   ├── PublicSurveyRenderer.tsx  # Drives survey flow for respondents
        │   │   ├── QuestionBlock.tsx
        │   │   ├── RatingBlock.tsx
        │   │   ├── MatrixBlock.tsx
        │   │   ├── StatementBlock.tsx
        │   │   └── RecallBlock.tsx
        │   └── ui/
        │       ├── Button.tsx
        │       ├── Input.tsx
        │       ├── Modal.tsx
        │       ├── Badge.tsx
        │       └── ThemeToggle.tsx
        ├── store/
        │   ├── auth.ts     # user, accessToken, refreshToken — persisted to localStorage (key: wdym-auth)
        │   ├── builder.ts  # nodes, edges, title, isDirty, selectedNodeId
        │   ├── survey.ts   # respondent in-progress state
        │   └── theme.ts    # dark/light toggle
        └── lib/
            ├── api.ts      # axios instance with auth header + auto token refresh
            └── utils.ts    # shared helpers
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

| Field     | Type        | Notes       |
| --------- | ----------- | ----------- |
| id        | String UUID | PK          |
| email     | String      | unique      |
| password  | String      | bcrypt hash |
| createdAt | DateTime    |             |

### Survey

| Field       | Type        | Notes                                                                                  |
| ----------- | ----------- | -------------------------------------------------------------------------------------- |
| id          | String UUID | PK                                                                                     |
| slug        | String      | unique, used in public URL `/s/:slug`                                                  |
| title       | String      |                                                                                        |
| blocks      | Json        | `BlockNode[]` from React Flow — array of `{id, position, data:{blockType, config}}`    |
| edges       | Json        | `Edge[]` from React Flow — array of `{id, source, target, sourceHandle, type:'logic'}` |
| views       | Int         | incremented on every `GET /s/:slug`                                                    |
| published   | Boolean     | gate for public access                                                                 |
| publishedAt | DateTime?   |                                                                                        |
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
POST /auth/register      { email, password } → { user, accessToken, refreshToken }
POST /auth/login         { email, password } → { user, accessToken, refreshToken }
POST /auth/refresh       { refreshToken }    → { accessToken }
```

### Surveys — `/surveys/*` (all require `Authorization: Bearer <accessToken>`)

```
GET    /surveys                  → Survey[] (title, slug, published, views, _count.responses)
POST   /surveys                  { title? } → Survey
GET    /surveys/:id              → Survey (full, with blocks/edges)
PATCH  /surveys/:id              { title?, blocks?, edges? } → Survey
DELETE /surveys/:id              → 204
POST   /surveys/:id/publish      → Survey + { url }
GET    /surveys/:id/analytics    → AnalyticsData (see below)
POST   /surveys/:id/generate     { prompt } → { blocks, edges }
```

**Analytics response shape:**

```ts
{
  title, views, blocks, edges, publishedAt, published,
  stats: { views, completed, started, forfeited, completionRate, viewToStart },
  dropOff: { blockId, count }[],   // incomplete responses grouped by lastBlockId
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

- `nodes / edges / title` — React Flow state
- `isDirty` — true whenever nodes/edges/title change; triggers save prompt
- `selectedNodeId` — drives `NodeConfigPanel`
- Key actions: `addNode`, `deleteNode`, `deleteEdge`, `updateNodeConfig`, `loadSurvey`, `markClean`

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

1. Login → server returns `accessToken` (15 min) + `refreshToken` (7 days)
2. `useAuthStore` persists both to localStorage
3. `api.ts` request interceptor injects `Authorization: Bearer <accessToken>`
4. `api.ts` response interceptor catches 401 → calls `POST /auth/refresh` → retries original request
5. If refresh fails → `logout()` + redirect to `/login`
6. Route guard in `router.tsx`: `beforeLoad: requireAuth` checks `useAuthStore.getState().accessToken`

---

## Survey response flow (public)

1. Respondent opens `/s/:slug` → `GET /s/:slug` (views +1)
2. `PublicSurveyRenderer` resolves block order by walking `edges` from the start node
3. On first answer → `POST /s/:slug/response { answers, lastBlockId }` → returns `{ id }` stored in `sessionStorage`
4. On each subsequent answer → `PATCH /s/:slug/response/:id { answers, lastBlockId }`
5. On final submit → `PATCH` with `{ completed: true }`
6. If respondent closes mid-survey → `completed=false`, `lastBlockId` records where they stopped

---

## Design constraints — must follow

- **Dark mode only** in design intent (ThemeToggle exists but dark is default/primary)
- Color palette: bg `#000` dark / `#fff` light · surface `#0a0a0a` / `#fafafa` · border `#1a1a1a` / `#f4f4f5` · muted text `#888` / `#a1a1aa`
- **No sidebars** in the builder — floating left palette, floating right config panel
- **Lucide React only** for icons — no emojis, no other icon libs
- **No Tailwind config file** — all config is in `vite.config.ts` via `@tailwindcss/vite`
- Dynamic Tailwind classes (e.g. `grid-cols-${n}`) do **not** work — use ternaries with full class strings
- Inline styles are acceptable for dynamic colors/opacities that Tailwind can't express

---

## Environment variables

### Server (`server/.env`)

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
ANTHROPIC_API_KEY=...   # only needed for AI generation feature
PORT=4000               # optional, defaults to 4000
```

### Client (`client/.env`)

```
VITE_API_URL=http://localhost:4000   # optional, this is the default
```

---

## Dev commands

```bash
# Server
cd server && npm run dev       # ts-node-dev, hot reload

# Client
cd client && npm run dev       # Vite dev server, port 5173

# DB schema changes
cd server && npx prisma db push          # push schema changes (no migration file)
cd server && npx prisma studio           # visual DB browser

# Type check
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit
```
