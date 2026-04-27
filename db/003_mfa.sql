-- Migration: MFA support
-- Adds mfaEnabled + mfaSecret to User, creates MfaBackupCode table.
-- Safe to re-run — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

-- Add MFA columns to User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT;

-- MfaBackupCode: single-use bcrypt-hashed backup codes for MFA recovery
CREATE TABLE IF NOT EXISTS "MfaBackupCode" (
  "id"        TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "codeHash"  TEXT         NOT NULL,
  "used"      BOOLEAN      NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MfaBackupCode_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MfaBackupCode"
  ADD CONSTRAINT IF NOT EXISTS "MfaBackupCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
