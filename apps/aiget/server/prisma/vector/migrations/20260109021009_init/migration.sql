-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT,
    "sessionId" TEXT,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "metadata" JSONB,
    "source" TEXT,
    "importance" DOUBLE PRECISION DEFAULT 0.5,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "properties" JSONB,
    "embedding" vector(1536),
    "confidence" DOUBLE PRECISION DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relation" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "properties" JSONB,
    "confidence" DOUBLE PRECISION DEFAULT 1.0,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Relation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Memory_apiKeyId_userId_idx" ON "Memory"("apiKeyId", "userId");

-- CreateIndex
CREATE INDEX "Memory_apiKeyId_userId_agentId_idx" ON "Memory"("apiKeyId", "userId", "agentId");

-- CreateIndex
CREATE INDEX "Memory_apiKeyId_createdAt_idx" ON "Memory"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "Entity_apiKeyId_userId_idx" ON "Entity"("apiKeyId", "userId");

-- CreateIndex
CREATE INDEX "Entity_apiKeyId_userId_type_idx" ON "Entity"("apiKeyId", "userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_apiKeyId_userId_type_name_key" ON "Entity"("apiKeyId", "userId", "type", "name");

-- CreateIndex
CREATE INDEX "Relation_apiKeyId_userId_idx" ON "Relation"("apiKeyId", "userId");

-- CreateIndex
CREATE INDEX "Relation_sourceId_idx" ON "Relation"("sourceId");

-- CreateIndex
CREATE INDEX "Relation_targetId_idx" ON "Relation"("targetId");

-- CreateIndex
CREATE INDEX "Relation_apiKeyId_userId_type_idx" ON "Relation"("apiKeyId", "userId", "type");

-- AddForeignKey
ALTER TABLE "Relation" ADD CONSTRAINT "Relation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relation" ADD CONSTRAINT "Relation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

