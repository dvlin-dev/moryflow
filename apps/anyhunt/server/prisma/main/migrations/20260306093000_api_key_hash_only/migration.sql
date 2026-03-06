-- API Key hash-only migration
-- 从明文 keyValue 迁移到 keyHash + keyPrefix + keyTail

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "ApiKey"
  ADD COLUMN "keyHash" TEXT,
  ADD COLUMN "keyPrefix" TEXT,
  ADD COLUMN "keyTail" TEXT;

UPDATE "ApiKey"
SET
  "keyHash" = encode(digest("keyValue", 'sha256'), 'hex'),
  "keyPrefix" = substring("keyValue" from 1 for 3),
  "keyTail" = right("keyValue", 4)
WHERE "keyValue" IS NOT NULL;

ALTER TABLE "ApiKey"
  ALTER COLUMN "keyHash" SET NOT NULL,
  ALTER COLUMN "keyPrefix" SET NOT NULL,
  ALTER COLUMN "keyPrefix" SET DEFAULT 'ah_',
  ALTER COLUMN "keyTail" SET NOT NULL;

DROP INDEX IF EXISTS "ApiKey_keyValue_key";
DROP INDEX IF EXISTS "ApiKey_keyValue_idx";

CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

ALTER TABLE "ApiKey" DROP COLUMN "keyValue";
