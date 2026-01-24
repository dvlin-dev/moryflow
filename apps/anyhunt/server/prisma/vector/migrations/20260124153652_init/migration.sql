-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "userId" TEXT,
    "agentId" TEXT,
    "appId" TEXT,
    "runId" TEXT,
    "orgId" TEXT,
    "projectId" TEXT,
    "memory" TEXT NOT NULL,
    "input" JSONB,
    "metadata" JSONB,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hash" TEXT,
    "immutable" BOOLEAN NOT NULL DEFAULT false,
    "expirationDate" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3),
    "entities" JSONB,
    "relations" JSONB,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryHistory" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "input" JSONB,
    "oldMemory" TEXT,
    "newMemory" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryFeedback" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "feedback" TEXT,
    "feedbackReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryExport" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "filters" JSONB,
    "orgId" TEXT,
    "projectId" TEXT,
    "status" TEXT NOT NULL,
    "r2Key" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoxEntity" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "name" TEXT,
    "metadata" JSONB,
    "orgId" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoxEntity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Memory_apiKeyId_userId_idx" ON "Memory"("apiKeyId", "userId");

-- CreateIndex
CREATE INDEX "Memory_apiKeyId_agentId_idx" ON "Memory"("apiKeyId", "agentId");

-- CreateIndex
CREATE INDEX "Memory_apiKeyId_appId_idx" ON "Memory"("apiKeyId", "appId");

-- CreateIndex
CREATE INDEX "Memory_apiKeyId_runId_idx" ON "Memory"("apiKeyId", "runId");

-- CreateIndex
CREATE INDEX "Memory_apiKeyId_orgId_idx" ON "Memory"("apiKeyId", "orgId");

-- CreateIndex
CREATE INDEX "Memory_apiKeyId_projectId_idx" ON "Memory"("apiKeyId", "projectId");

-- CreateIndex
CREATE INDEX "Memory_apiKeyId_createdAt_idx" ON "Memory"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "MemoryHistory_apiKeyId_memoryId_idx" ON "MemoryHistory"("apiKeyId", "memoryId");

-- CreateIndex
CREATE INDEX "MemoryHistory_apiKeyId_userId_idx" ON "MemoryHistory"("apiKeyId", "userId");

-- CreateIndex
CREATE INDEX "MemoryHistory_apiKeyId_createdAt_idx" ON "MemoryHistory"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "MemoryFeedback_apiKeyId_memoryId_idx" ON "MemoryFeedback"("apiKeyId", "memoryId");

-- CreateIndex
CREATE INDEX "MemoryFeedback_apiKeyId_createdAt_idx" ON "MemoryFeedback"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "MemoryExport_apiKeyId_createdAt_idx" ON "MemoryExport"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "MemoxEntity_apiKeyId_type_idx" ON "MemoxEntity"("apiKeyId", "type");

-- CreateIndex
CREATE INDEX "MemoxEntity_apiKeyId_createdAt_idx" ON "MemoxEntity"("apiKeyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MemoxEntity_apiKeyId_type_entityId_key" ON "MemoxEntity"("apiKeyId", "type", "entityId");
