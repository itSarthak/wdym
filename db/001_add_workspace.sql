-- Migration: add Workspace model
-- Run once against the cloud DB (Neon / Supabase / etc.)
-- Safe to run on an existing database — uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS "Workspace" (
  "id"        TEXT         NOT NULL,
  "name"      TEXT         NOT NULL,
  "slug"      TEXT         NOT NULL,
  "ownerId"   TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_slug_key"    ON "Workspace"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_ownerId_key" ON "Workspace"("ownerId");

ALTER TABLE "Workspace"
  ADD CONSTRAINT "Workspace_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
