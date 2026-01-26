/*
  Warnings:

  - Added the required column `keyValue` to the `ApiKey` table without a default value. This is not possible if the table is not empty.
  - Dropped the column `keyHash` on the `ApiKey` table. All the data in the column will be lost.
  - Dropped the column `keyPrefix` on the `ApiKey` table. All the data in the column will be lost.

*/
-- Drop old indexes
DROP INDEX IF EXISTS "ApiKey_keyHash_key";
DROP INDEX IF EXISTS "ApiKey_keyHash_idx";

-- Add new column
ALTER TABLE "ApiKey" ADD COLUMN "keyValue" TEXT NOT NULL;

-- Create indexes for keyValue
CREATE UNIQUE INDEX "ApiKey_keyValue_key" ON "ApiKey"("keyValue");
CREATE INDEX "ApiKey_keyValue_idx" ON "ApiKey"("keyValue");

-- Drop old columns
ALTER TABLE "ApiKey" DROP COLUMN "keyHash", DROP COLUMN "keyPrefix";
