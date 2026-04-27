-- Migration: scope surveys to workspaces
-- Adds workspaceId (NOT NULL FK) to Survey.
-- Includes a backfill step for existing surveys so no data is lost.
--
-- Run order matters — execute inside a single transaction.

BEGIN;

-- Step 1: add the column as nullable so existing rows don't violate the constraint
ALTER TABLE "Survey"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- Step 2: for users who have no workspace yet, create one and add them as a member
WITH new_workspaces AS (
  INSERT INTO "Workspace" ("id", "name", "slug", "ownerId", "createdAt")
  SELECT
    gen_random_uuid(),
    'My Workspace',
    LOWER(REPLACE(u.email, '@', '-at-')) || '-' || SUBSTRING(u.id::text, 1, 5),
    u.id,
    NOW()
  FROM "User" u
  WHERE NOT EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm WHERE wm."userId" = u.id
  )
  RETURNING "id", "ownerId"
)
INSERT INTO "WorkspaceMember" ("id", "workspaceId", "userId", "createdAt")
SELECT gen_random_uuid(), nw.id, nw."ownerId", NOW()
FROM new_workspaces nw;

-- Step 3: assign each survey to the earliest workspace its owner belongs to
UPDATE "Survey" s
SET "workspaceId" = (
  SELECT wm."workspaceId"
  FROM "WorkspaceMember" wm
  WHERE wm."userId" = s."userId"
  ORDER BY wm."createdAt" ASC
  LIMIT 1
)
WHERE s."workspaceId" IS NULL;

-- Step 4: make the column NOT NULL now that all rows are backfilled
ALTER TABLE "Survey"
  ALTER COLUMN "workspaceId" SET NOT NULL;

-- Step 5: add FK constraint
ALTER TABLE "Survey"
  ADD CONSTRAINT IF NOT EXISTS "Survey_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: index for fast workspace-scoped survey lookups
CREATE INDEX IF NOT EXISTS "Survey_workspaceId_idx" ON "Survey"("workspaceId");

COMMIT;
