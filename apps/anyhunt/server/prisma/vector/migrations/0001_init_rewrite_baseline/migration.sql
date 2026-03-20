-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "KnowledgeSourceStatus" AS ENUM ('ACTIVE', 'PROCESSING', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "SourceRevisionIngestMode" AS ENUM ('INLINE_TEXT', 'UPLOAD_BLOB');

-- CreateEnum
CREATE TYPE "KnowledgeSourceRevisionStatus" AS ENUM ('PENDING_UPLOAD', 'READY_TO_FINALIZE', 'PROCESSING', 'INDEXED', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "MemoryFactOriginKind" AS ENUM ('MANUAL', 'SOURCE_DERIVED');

-- CreateTable
CREATE TABLE "MemoryFact" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "userId" TEXT,
    "agentId" TEXT,
    "appId" TEXT,
    "runId" TEXT,
    "orgId" TEXT,
    "projectId" TEXT,
    "content" TEXT NOT NULL,
    "input" JSONB,
    "metadata" JSONB,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hash" TEXT,
    "immutable" BOOLEAN NOT NULL DEFAULT false,
    "graphEnabled" BOOLEAN NOT NULL DEFAULT false,
    "expirationDate" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3),
    "originKind" "MemoryFactOriginKind" NOT NULL DEFAULT 'MANUAL',
    "sourceId" TEXT,
    "sourceRevisionId" TEXT,
    "derivedKey" TEXT,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryFact_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MemoryFact"
ADD CONSTRAINT "MemoryFact_origin_fields_check"
CHECK (
    (
        "originKind" = 'MANUAL'
        AND "sourceId" IS NULL
        AND "sourceRevisionId" IS NULL
        AND "derivedKey" IS NULL
    )
    OR (
        "originKind" = 'SOURCE_DERIVED'
        AND "sourceId" IS NOT NULL
        AND "sourceRevisionId" IS NOT NULL
        AND "derivedKey" IS NOT NULL
        AND "immutable" = TRUE
    )
);

-- CreateTable
CREATE TABLE "MemoryFactHistory" (
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

    CONSTRAINT "MemoryFactHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryFactFeedback" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "feedback" TEXT,
    "feedbackReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryFactFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryFactExport" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "filters" JSONB,
    "orgId" TEXT,
    "projectId" TEXT,
    "status" TEXT NOT NULL,
    "r2Key" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryFactExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeSource" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "externalId" TEXT,
    "userId" TEXT,
    "agentId" TEXT,
    "appId" TEXT,
    "runId" TEXT,
    "orgId" TEXT,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "displayPath" TEXT,
    "mimeType" TEXT,
    "metadata" JSONB,
    "currentRevisionId" TEXT,
    "status" "KnowledgeSourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeSourceRevision" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "ingestMode" "SourceRevisionIngestMode" NOT NULL,
    "checksum" TEXT,
    "userId" TEXT,
    "agentId" TEXT,
    "appId" TEXT,
    "runId" TEXT,
    "orgId" TEXT,
    "projectId" TEXT,
    "contentBytes" INTEGER,
    "contentTokens" INTEGER,
    "normalizedTextR2Key" TEXT,
    "blobR2Key" TEXT,
    "pendingUploadExpiresAt" TIMESTAMP(3),
    "mimeType" TEXT,
    "status" "KnowledgeSourceRevisionStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "indexedAt" TIMESTAMP(3),

    CONSTRAINT "KnowledgeSourceRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceChunk" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "userId" TEXT,
    "agentId" TEXT,
    "appId" TEXT,
    "runId" TEXT,
    "orgId" TEXT,
    "projectId" TEXT,
    "chunkIndex" INTEGER NOT NULL,
    "chunkCount" INTEGER NOT NULL,
    "headingPath" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "metadata" JSONB,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScopeRegistry" (
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

    CONSTRAINT "ScopeRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraphEntity" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GraphEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraphRelation" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "fromEntityId" TEXT NOT NULL,
    "toEntityId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GraphRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraphObservation" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "graphEntityId" TEXT,
    "graphRelationId" TEXT,
    "evidenceSourceId" TEXT,
    "evidenceRevisionId" TEXT,
    "evidenceChunkId" TEXT,
    "evidenceMemoryId" TEXT,
    "observationType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GraphObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemoryFact_apiKeyId_userId_idx" ON "MemoryFact"("apiKeyId", "userId");

-- CreateIndex
CREATE INDEX "MemoryFact_apiKeyId_agentId_idx" ON "MemoryFact"("apiKeyId", "agentId");

-- CreateIndex
CREATE INDEX "MemoryFact_apiKeyId_appId_idx" ON "MemoryFact"("apiKeyId", "appId");

-- CreateIndex
CREATE INDEX "MemoryFact_apiKeyId_runId_idx" ON "MemoryFact"("apiKeyId", "runId");

-- CreateIndex
CREATE INDEX "MemoryFact_apiKeyId_orgId_idx" ON "MemoryFact"("apiKeyId", "orgId");

-- CreateIndex
CREATE INDEX "MemoryFact_apiKeyId_projectId_idx" ON "MemoryFact"("apiKeyId", "projectId");

-- CreateIndex
CREATE INDEX "MemoryFact_apiKeyId_originKind_idx" ON "MemoryFact"("apiKeyId", "originKind");

-- CreateIndex
CREATE INDEX "MemoryFact_apiKeyId_sourceId_idx" ON "MemoryFact"("apiKeyId", "sourceId");

-- CreateIndex
CREATE INDEX "MemoryFact_apiKeyId_sourceRevisionId_idx" ON "MemoryFact"("apiKeyId", "sourceRevisionId");

-- CreateIndex
CREATE INDEX "MemoryFact_apiKeyId_createdAt_idx" ON "MemoryFact"("apiKeyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryFact_apiKeyId_sourceId_derivedKey_key" ON "MemoryFact"("apiKeyId", "sourceId", "derivedKey");

-- CreateIndex
CREATE INDEX "MemoryFactHistory_apiKeyId_memoryId_idx" ON "MemoryFactHistory"("apiKeyId", "memoryId");

-- CreateIndex
CREATE INDEX "MemoryFactHistory_apiKeyId_userId_idx" ON "MemoryFactHistory"("apiKeyId", "userId");

-- CreateIndex
CREATE INDEX "MemoryFactHistory_apiKeyId_createdAt_idx" ON "MemoryFactHistory"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "MemoryFactFeedback_apiKeyId_memoryId_idx" ON "MemoryFactFeedback"("apiKeyId", "memoryId");

-- CreateIndex
CREATE INDEX "MemoryFactFeedback_apiKeyId_createdAt_idx" ON "MemoryFactFeedback"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "MemoryFactExport_apiKeyId_createdAt_idx" ON "MemoryFactExport"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeSource_apiKeyId_sourceType_idx" ON "KnowledgeSource"("apiKeyId", "sourceType");

-- CreateIndex
CREATE INDEX "KnowledgeSource_apiKeyId_userId_idx" ON "KnowledgeSource"("apiKeyId", "userId");

-- CreateIndex
CREATE INDEX "KnowledgeSource_apiKeyId_agentId_idx" ON "KnowledgeSource"("apiKeyId", "agentId");

-- CreateIndex
CREATE INDEX "KnowledgeSource_apiKeyId_appId_idx" ON "KnowledgeSource"("apiKeyId", "appId");

-- CreateIndex
CREATE INDEX "KnowledgeSource_apiKeyId_runId_idx" ON "KnowledgeSource"("apiKeyId", "runId");

-- CreateIndex
CREATE INDEX "KnowledgeSource_apiKeyId_orgId_idx" ON "KnowledgeSource"("apiKeyId", "orgId");

-- CreateIndex
CREATE INDEX "KnowledgeSource_apiKeyId_projectId_idx" ON "KnowledgeSource"("apiKeyId", "projectId");

-- CreateIndex
CREATE INDEX "KnowledgeSource_apiKeyId_status_createdAt_idx" ON "KnowledgeSource"("apiKeyId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeSource_apiKeyId_sourceType_externalId_key" ON "KnowledgeSource"("apiKeyId", "sourceType", "externalId");

-- CreateIndex
CREATE INDEX "KnowledgeSourceRevision_apiKeyId_sourceId_createdAt_idx" ON "KnowledgeSourceRevision"("apiKeyId", "sourceId", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeSourceRevision_apiKeyId_status_createdAt_idx" ON "KnowledgeSourceRevision"("apiKeyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeSourceRevision_apiKeyId_checksum_idx" ON "KnowledgeSourceRevision"("apiKeyId", "checksum");

-- CreateIndex
CREATE INDEX "KnowledgeSourceRevision_apiKeyId_userId_idx" ON "KnowledgeSourceRevision"("apiKeyId", "userId");

-- CreateIndex
CREATE INDEX "KnowledgeSourceRevision_apiKeyId_agentId_idx" ON "KnowledgeSourceRevision"("apiKeyId", "agentId");

-- CreateIndex
CREATE INDEX "KnowledgeSourceRevision_apiKeyId_appId_idx" ON "KnowledgeSourceRevision"("apiKeyId", "appId");

-- CreateIndex
CREATE INDEX "KnowledgeSourceRevision_apiKeyId_runId_idx" ON "KnowledgeSourceRevision"("apiKeyId", "runId");

-- CreateIndex
CREATE INDEX "KnowledgeSourceRevision_apiKeyId_orgId_idx" ON "KnowledgeSourceRevision"("apiKeyId", "orgId");

-- CreateIndex
CREATE INDEX "KnowledgeSourceRevision_apiKeyId_projectId_idx" ON "KnowledgeSourceRevision"("apiKeyId", "projectId");

-- CreateIndex
CREATE INDEX "KnowledgeSourceRevision_status_pendingUploadExpiresAt_idx" ON "KnowledgeSourceRevision"("status", "pendingUploadExpiresAt");

-- CreateIndex
CREATE INDEX "SourceChunk_apiKeyId_sourceId_idx" ON "SourceChunk"("apiKeyId", "sourceId");

-- CreateIndex
CREATE INDEX "SourceChunk_apiKeyId_revisionId_idx" ON "SourceChunk"("apiKeyId", "revisionId");

-- CreateIndex
CREATE INDEX "SourceChunk_apiKeyId_userId_idx" ON "SourceChunk"("apiKeyId", "userId");

-- CreateIndex
CREATE INDEX "SourceChunk_apiKeyId_agentId_idx" ON "SourceChunk"("apiKeyId", "agentId");

-- CreateIndex
CREATE INDEX "SourceChunk_apiKeyId_appId_idx" ON "SourceChunk"("apiKeyId", "appId");

-- CreateIndex
CREATE INDEX "SourceChunk_apiKeyId_runId_idx" ON "SourceChunk"("apiKeyId", "runId");

-- CreateIndex
CREATE INDEX "SourceChunk_apiKeyId_orgId_idx" ON "SourceChunk"("apiKeyId", "orgId");

-- CreateIndex
CREATE INDEX "SourceChunk_apiKeyId_projectId_idx" ON "SourceChunk"("apiKeyId", "projectId");

-- CreateIndex
CREATE INDEX "SourceChunk_apiKeyId_createdAt_idx" ON "SourceChunk"("apiKeyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SourceChunk_revisionId_chunkIndex_key" ON "SourceChunk"("revisionId", "chunkIndex");

-- CreateIndex
CREATE INDEX "ScopeRegistry_apiKeyId_type_idx" ON "ScopeRegistry"("apiKeyId", "type");

-- CreateIndex
CREATE INDEX "ScopeRegistry_apiKeyId_createdAt_idx" ON "ScopeRegistry"("apiKeyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScopeRegistry_apiKeyId_type_entityId_key" ON "ScopeRegistry"("apiKeyId", "type", "entityId");

-- CreateIndex
CREATE INDEX "GraphEntity_apiKeyId_entityType_idx" ON "GraphEntity"("apiKeyId", "entityType");

-- CreateIndex
CREATE INDEX "GraphEntity_apiKeyId_lastSeenAt_idx" ON "GraphEntity"("apiKeyId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "GraphEntity_apiKeyId_entityType_canonicalName_key" ON "GraphEntity"("apiKeyId", "entityType", "canonicalName");

-- CreateIndex
CREATE INDEX "GraphRelation_apiKeyId_relationType_idx" ON "GraphRelation"("apiKeyId", "relationType");

-- CreateIndex
CREATE UNIQUE INDEX "GraphRelation_apiKeyId_fromEntityId_toEntityId_relationType_key" ON "GraphRelation"("apiKeyId", "fromEntityId", "toEntityId", "relationType");

-- CreateIndex
CREATE INDEX "GraphObservation_apiKeyId_graphEntityId_idx" ON "GraphObservation"("apiKeyId", "graphEntityId");

-- CreateIndex
CREATE INDEX "GraphObservation_apiKeyId_graphRelationId_idx" ON "GraphObservation"("apiKeyId", "graphRelationId");

-- CreateIndex
CREATE INDEX "GraphObservation_apiKeyId_evidenceSourceId_idx" ON "GraphObservation"("apiKeyId", "evidenceSourceId");

-- CreateIndex
CREATE INDEX "GraphObservation_apiKeyId_evidenceRevisionId_idx" ON "GraphObservation"("apiKeyId", "evidenceRevisionId");

-- CreateIndex
CREATE INDEX "GraphObservation_apiKeyId_evidenceChunkId_idx" ON "GraphObservation"("apiKeyId", "evidenceChunkId");

-- CreateIndex
CREATE INDEX "GraphObservation_apiKeyId_evidenceMemoryId_idx" ON "GraphObservation"("apiKeyId", "evidenceMemoryId");

-- CreateIndex
CREATE INDEX "GraphObservation_apiKeyId_observationType_idx" ON "GraphObservation"("apiKeyId", "observationType");

-- AddForeignKey
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_currentRevisionId_fkey" FOREIGN KEY ("currentRevisionId") REFERENCES "KnowledgeSourceRevision"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "KnowledgeSourceRevision" ADD CONSTRAINT "KnowledgeSourceRevision_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceChunk" ADD CONSTRAINT "SourceChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceChunk" ADD CONSTRAINT "SourceChunk_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "KnowledgeSourceRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphRelation" ADD CONSTRAINT "GraphRelation_fromEntityId_fkey" FOREIGN KEY ("fromEntityId") REFERENCES "GraphEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphRelation" ADD CONSTRAINT "GraphRelation_toEntityId_fkey" FOREIGN KEY ("toEntityId") REFERENCES "GraphEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphObservation" ADD CONSTRAINT "GraphObservation_graphEntityId_fkey" FOREIGN KEY ("graphEntityId") REFERENCES "GraphEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphObservation" ADD CONSTRAINT "GraphObservation_graphRelationId_fkey" FOREIGN KEY ("graphRelationId") REFERENCES "GraphRelation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphObservation" ADD CONSTRAINT "GraphObservation_evidenceSourceId_fkey" FOREIGN KEY ("evidenceSourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphObservation" ADD CONSTRAINT "GraphObservation_evidenceMemoryId_fkey" FOREIGN KEY ("evidenceMemoryId") REFERENCES "MemoryFact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
