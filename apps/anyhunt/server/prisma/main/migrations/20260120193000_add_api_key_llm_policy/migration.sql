-- Add LLM policy fields to ApiKey
ALTER TABLE "ApiKey"
ADD COLUMN "llmEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "llmProviderId" TEXT NOT NULL DEFAULT 'openai',
ADD COLUMN "llmModelId" TEXT NOT NULL DEFAULT 'gpt-4o';

