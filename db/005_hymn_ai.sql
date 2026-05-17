-- Migration: Hymn AI chat sessions
-- Adds HymnSession and HymnMessage tables.
-- Safe to re-run — uses IF NOT EXISTS.

-- HymnSession: one conversation thread per user+workspace
CREATE TABLE IF NOT EXISTS "HymnSession" (
  "id"          TEXT         NOT NULL,
  "title"       TEXT         NOT NULL DEFAULT 'New chat',
  "userId"      TEXT         NOT NULL,
  "workspaceId" TEXT         NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HymnSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "HymnSession"
  ADD CONSTRAINT IF NOT EXISTS "HymnSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HymnSession"
  ADD CONSTRAINT IF NOT EXISTS "HymnSession_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- HymnMessage: individual messages within a session
CREATE TABLE IF NOT EXISTS "HymnMessage" (
  "id"        TEXT         NOT NULL,
  "sessionId" TEXT         NOT NULL,
  "role"      TEXT         NOT NULL,
  "content"   TEXT         NOT NULL,
  "action"    TEXT,
  "metadata"  JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HymnMessage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "HymnMessage"
  ADD CONSTRAINT IF NOT EXISTS "HymnMessage_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "HymnSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
