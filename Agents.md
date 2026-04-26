# wdym — agents.md

> Survey builder platform. Build. Publish. Share.

---

## Project Overview

**wdym** is a monochromatic dark-mode survey builder where users authenticate, drag-and-drop survey blocks with logic (if/else, switch), hit one button to publish, and share a public link.

---

## Stack

| Layer    | Tech                                                                           |
| -------- | ------------------------------------------------------------------------------ |
| Frontend | React 19, Vite, Tailwind CSS v4, Framer Motion, Zustand, TanStack Query/Router |
| Backend  | Node.js, Express 5                                                             |
| Database | PostgreSQL + Prisma ORM                                                        |
| Auth     | JWT (access + refresh tokens), bcrypt                                          |
| Icons    | Lucide React                                                                   |
| Misc     | CORS enabled, UUID for public links, Zod for validation                        |

---

## Design System

- **Palette:** Pure black `#000`, white `#fff`, grays `#111 → #888`. No color accents.
- **Font:** `Inter` (variable). Tight tracking, clean hierarchy.
- **Spacing:** 4px base grid. Generous whitespace, compact components.
- **Radius:** `4px` on inputs/cards, `2px` on badges.
- **Motion:** Framer Motion — subtle scale + fade. No bouncy springs.
- **Dark mode:** Default and only mode. `bg-black text-white`.

---

## Folder Structure

```
wdym/
├── client/                     # Vite + React
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             # Primitives: Button, Input, Badge, Modal
│   │   │   ├── builder/        # DragCanvas, BlockPalette, BlockNode, LogicEdge
│   │   │   └── survey/         # PublicSurveyRenderer, QuestionBlock
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx   # List of user's surveys
│   │   │   ├── Builder.tsx     # Drag-and-drop editor
│   │   │   └── Survey.tsx      # Public-facing survey (no auth)
│   │   ├── store/              # Zustand slices: auth, builder, survey
│   │   ├── lib/                # api.ts (axios instance), utils.ts
│   │   └── router.tsx          # TanStack Router
│
├── server/                     # Express API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts         # POST /auth/register, /auth/login, /auth/refresh
│   │   │   ├── surveys.ts      # CRUD + publish
│   │   │   └── public.ts       # GET /s/:slug (public survey)
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT verify middleware
│   │   │   └── cors.ts         # CORS config
│   │   ├── controllers/        # Logic per route
│   │   ├── lib/
│   │   │   └── prisma.ts
│   │   └── index.ts
│
└── prisma/
    └── schema.prisma
```

---

## Data Models

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  surveys   Survey[]
  createdAt DateTime @default(now())
}

model Survey {
  id          String   @id @default(uuid())
  slug        String   @unique  // public share token
  title       String
  blocks      Json     // serialized block graph
  published   Boolean  @default(false)
  publishedAt DateTime?
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## Auth Flow

1. `POST /auth/register` → hash password, create user, return tokens
2. `POST /auth/login` → verify password, return `accessToken` (15m) + `refreshToken` (7d)
3. `POST /auth/refresh` → verify refresh token, issue new access token
4. All protected routes use `Authorization: Bearer <token>` middleware
5. Zustand `authStore` persists tokens to `localStorage`

---

## Survey Builder (Core)

### Block Types

| Block      | Description                           |
| ---------- | ------------------------------------- |
| `question` | Text/multiple choice/rating input     |
| `if_else`  | Branch on condition (field === value) |
| `switch`   | Multi-branch on single field          |
| `end`      | Terminal block                        |

### Builder State (`builderStore`)

```ts
{
  blocks: Block[]       // nodes with position, type, config
  edges: Edge[]         // connections between blocks
  title: string
  isDirty: boolean
}
```

### Save & Publish

- **Auto-save:** debounced `PATCH /surveys/:id` on block change (1.5s delay)
- **Publish:** `POST /surveys/:id/publish` → sets `published: true`, generates slug if missing
- After publish: toast + copy-to-clipboard of `https://wdym.app/s/:slug`

---

## API Routes

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh

GET    /surveys              → user's surveys
POST   /surveys              → create new survey
GET    /surveys/:id          → get one (auth)
PATCH  /surveys/:id          → update blocks/title
DELETE /surveys/:id          → delete
POST   /surveys/:id/publish  → publish and get public link

GET    /s/:slug              → public survey (no auth)
POST   /s/:slug/submit       → submit responses
```

---

## CORS Config

```ts
// server/src/middleware/cors.ts
import cors from "cors";

export const corsMiddleware = cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
```

---

## Key UI Rules

- No sidebars. Builder is full-canvas with a floating left palette.
- One "Publish →" button top-right. Turns to "Live ↗" after publish with the link.
- Dashboard: minimal table/list — survey title, status badge (`draft` / `live`), created date, edit + delete icons.
- All modals use Framer `AnimatePresence`. No page reloads.
- Error states: red text only (no colored backgrounds). Success: white bold.
- Lucide icons only. No emojis, no illustrations.

---

## MVP Scope (Ship This)

- [x] Auth (register / login / JWT)
- [x] Dashboard (list + create + delete surveys)
- [x] Builder (drag blocks, connect, configure)
- [x] Logic blocks (if/else, switch)
- [x] Save draft (auto + manual)
- [x] Publish → public URL
- [x] Public survey renderer
- [x] Response submission (stored as JSON in DB)

**Out of scope for MVP:** analytics, team/collab, custom domains, response export, block templates.

---

## Env Variables

```env
# server/.env
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
CLIENT_URL=http://localhost:5173
PORT=4000

# client/.env
VITE_API_URL=http://localhost:4000
```

---

_Keep it sharp. Ship fast._
