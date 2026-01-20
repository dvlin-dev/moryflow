-- Split LlmSettings.defaultModelId into purpose-specific defaults
-- Note: no backward compatibility; we still provide DB-safe backfill for existing environments.

ALTER TABLE "LlmSettings"
ADD COLUMN IF NOT EXISTS "defaultAgentModelId" TEXT,
ADD COLUMN IF NOT EXISTS "defaultExtractModelId" TEXT;

-- Ensure the single settings row exists (Admin can update later)
INSERT INTO "LlmSettings" ("id", "defaultModelId", "defaultAgentModelId", "defaultExtractModelId", "updatedAt")
VALUES ('default', 'gpt-4o', 'gpt-4o', 'gpt-4o-mini', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Backfill agent default from legacy column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'LlmSettings'
      AND column_name = 'defaultModelId'
  ) THEN
    UPDATE "LlmSettings"
    SET "defaultAgentModelId" = COALESCE("defaultAgentModelId", "defaultModelId")
    WHERE "defaultAgentModelId" IS NULL;
  END IF;
END $$;

-- Backfill extract default (independent default)
UPDATE "LlmSettings"
SET "defaultExtractModelId" = COALESCE("defaultExtractModelId", 'gpt-4o-mini')
WHERE "defaultExtractModelId" IS NULL;

-- Ensure both defaults are present for all rows (defensive)
UPDATE "LlmSettings"
SET "defaultAgentModelId" = COALESCE("defaultAgentModelId", 'gpt-4o')
WHERE "defaultAgentModelId" IS NULL;

ALTER TABLE "LlmSettings"
ALTER COLUMN "defaultAgentModelId" SET NOT NULL,
ALTER COLUMN "defaultExtractModelId" SET NOT NULL;

ALTER TABLE "LlmSettings" DROP COLUMN IF EXISTS "defaultModelId";
