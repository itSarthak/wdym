-- Migration: Google OAuth support
-- Makes User.password nullable (Google users have no password).
-- Adds User.googleId with a unique index.
-- Safe to re-run — uses IF NOT EXISTS / DROP NOT NULL is idempotent.

-- Allow null password so Google-only accounts have no password hash
ALTER TABLE "User"
  ALTER COLUMN "password" DROP NOT NULL;

-- googleId links a wdym account to a Google sub (subject) identifier
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "googleId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");
