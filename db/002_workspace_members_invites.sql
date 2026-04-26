-- Migration: WorkspaceMember + WorkspaceInvite tables
-- Already applied via `prisma db push`. Kept as reference.
-- Safe to re-run — uses IF NOT EXISTS / ON CONFLICT DO NOTHING.

-- Remove unique constraint on ownerId (user can now own/join multiple workspaces)
DROP INDEX IF EXISTS "Workspace_ownerId_key";

-- WorkspaceMember: tracks who belongs to which workspace
CREATE TABLE IF NOT EXISTS "WorkspaceMember" (
  "id"          TEXT         NOT NULL,
  "workspaceId" TEXT         NOT NULL,
  "userId"      TEXT         NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceMember_workspaceId_userId_key"
  ON "WorkspaceMember"("workspaceId", "userId");

ALTER TABLE "WorkspaceMember"
  ADD CONSTRAINT IF NOT EXISTS "WorkspaceMember_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMember"
  ADD CONSTRAINT IF NOT EXISTS "WorkspaceMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WorkspaceInvite: pending email invites for non-members
CREATE TABLE IF NOT EXISTS "WorkspaceInvite" (
  "id"          TEXT         NOT NULL,
  "workspaceId" TEXT         NOT NULL,
  "email"       TEXT         NOT NULL,
  "token"       TEXT         NOT NULL,
  "accepted"    BOOLEAN      NOT NULL DEFAULT false,
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceInvite_token_key"       ON "WorkspaceInvite"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceInvite_workspaceId_email_key" ON "WorkspaceInvite"("workspaceId", "email");

ALTER TABLE "WorkspaceInvite"
  ADD CONSTRAINT IF NOT EXISTS "WorkspaceInvite_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: make every workspace owner a member of their own workspace
INSERT INTO "WorkspaceMember" ("id", "workspaceId", "userId", "createdAt")
SELECT gen_random_uuid(), "id", "ownerId", "createdAt"
FROM "Workspace"
ON CONFLICT ("workspaceId", "userId") DO NOTHING;
