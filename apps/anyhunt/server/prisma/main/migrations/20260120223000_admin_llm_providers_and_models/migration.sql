-- Admin-managed LLM providers/models (reference: moryflow AiProvider/AiModel)
-- Note: no backward compatibility; remove ApiKey LLM policy columns.

-- 1) Drop obsolete ApiKey LLM policy fields
ALTER TABLE "ApiKey"
DROP COLUMN IF EXISTS "llmEnabled",
DROP COLUMN IF EXISTS "llmProviderId",
DROP COLUMN IF EXISTS "llmModelId";

-- 2) Create LlmProvider
CREATE TABLE "LlmProvider" (
  "id" TEXT NOT NULL,
  "providerType" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "apiKeyEncrypted" TEXT NOT NULL,
  "baseUrl" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LlmProvider_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LlmProvider_enabled_idx" ON "LlmProvider"("enabled");
CREATE INDEX "LlmProvider_providerType_idx" ON "LlmProvider"("providerType");

-- 3) Create LlmModel
CREATE TABLE "LlmModel" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "upstreamId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LlmModel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LlmModel_providerId_modelId_key" ON "LlmModel"("providerId", "modelId");
CREATE INDEX "LlmModel_providerId_idx" ON "LlmModel"("providerId");
CREATE INDEX "LlmModel_enabled_idx" ON "LlmModel"("enabled");
CREATE INDEX "LlmModel_modelId_idx" ON "LlmModel"("modelId");

ALTER TABLE "LlmModel"
ADD CONSTRAINT "LlmModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "LlmProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Create LlmSettings (single row; id default is 'default')
CREATE TABLE "LlmSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "defaultModelId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LlmSettings_pkey" PRIMARY KEY ("id")
);

-- Seed default settings row (admin can update later)
INSERT INTO "LlmSettings" ("id", "defaultModelId", "updatedAt")
VALUES ('default', 'gpt-4o', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
