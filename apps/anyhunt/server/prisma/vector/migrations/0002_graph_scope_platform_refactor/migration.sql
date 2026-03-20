-- Introduce GraphScope / GraphProjectionRun and migrate MemoryFact graph fields
-- Existing graph data is intentionally rebuilt from MemoryFact after deploy.

-- Add new graph lifecycle columns to MemoryFact before migrating data
ALTER TABLE "MemoryFact"
ADD COLUMN "graphScopeId" TEXT,
ADD COLUMN "graphProjectionState" TEXT NOT NULL DEFAULT 'DISABLED',
ADD COLUMN "graphProjectionErrorCode" TEXT;

-- Materialize per-project graph scopes for all historical project-scoped sources
-- and graph-eligible memory facts. IDs are deterministic so the migration does
-- not rely on extra extensions such as pgcrypto.
CREATE TABLE "GraphScope" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "projectionStatus" TEXT NOT NULL DEFAULT 'IDLE',
    "lastProjectedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GraphScope_pkey" PRIMARY KEY ("id")
);

INSERT INTO "GraphScope" (
    "id",
    "apiKeyId",
    "projectId",
    "status",
    "projectionStatus",
    "createdAt",
    "updatedAt"
)
SELECT
    'gscope_' || md5(candidate."apiKeyId" || ':' || candidate."projectId") AS "id",
    candidate."apiKeyId",
    candidate."projectId",
    'ACTIVE',
    'IDLE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT
        "apiKeyId",
        "projectId"
    FROM "KnowledgeSource"
    WHERE "projectId" IS NOT NULL
      AND btrim("projectId") <> ''

    UNION

    SELECT DISTINCT
        "apiKeyId",
        "projectId"
    FROM "MemoryFact"
    WHERE "projectId" IS NOT NULL
      AND btrim("projectId") <> ''
      AND (
        "originKind" = 'SOURCE_DERIVED'
        OR "graphEnabled" = TRUE
      )
) AS candidate;

-- Backfill graphScopeId for all facts that should participate in the new
-- project-scoped graph model. Source-derived facts become graph-eligible by
-- default; manual facts preserve the old include_in_graph=true intent.
UPDATE "MemoryFact" AS memory
SET
    "graphScopeId" = scope."id",
    "graphProjectionState" = 'PENDING',
    "graphProjectionErrorCode" = NULL
FROM "GraphScope" AS scope
WHERE scope."apiKeyId" = memory."apiKeyId"
  AND scope."projectId" = memory."projectId"
  AND memory."projectId" IS NOT NULL
  AND btrim(memory."projectId") <> ''
  AND (
    memory."originKind" = 'SOURCE_DERIVED'
    OR memory."graphEnabled" = TRUE
  );

-- Drop the legacy apiKey-scoped graph read model. The new graph is rebuilt
-- from MemoryFact after deploy via the scope rebuild API.
DROP TABLE "GraphObservation";
DROP TABLE "GraphRelation";
DROP TABLE "GraphEntity";

CREATE TABLE "GraphEntity" (
    "id" TEXT NOT NULL,
    "graphScopeId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GraphEntity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GraphRelation" (
    "id" TEXT NOT NULL,
    "graphScopeId" TEXT NOT NULL,
    "fromEntityId" TEXT NOT NULL,
    "toEntityId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GraphRelation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GraphObservation" (
    "id" TEXT NOT NULL,
    "graphScopeId" TEXT NOT NULL,
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

CREATE TABLE "GraphProjectionRun" (
    "id" TEXT NOT NULL,
    "graphScopeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GraphProjectionRun_pkey" PRIMARY KEY ("id")
);

-- Remove the legacy MemoryFact graphEnabled switch after its intent has been
-- mapped onto graphScopeId + graphProjectionState.
ALTER TABLE "MemoryFact"
DROP COLUMN "graphEnabled";

CREATE INDEX "MemoryFact_graphScopeId_idx" ON "MemoryFact"("graphScopeId");
CREATE INDEX "MemoryFact_apiKeyId_graphProjectionState_idx" ON "MemoryFact"("apiKeyId", "graphProjectionState");

CREATE UNIQUE INDEX "GraphScope_apiKeyId_projectId_key" ON "GraphScope"("apiKeyId", "projectId");
CREATE INDEX "GraphScope_apiKeyId_status_idx" ON "GraphScope"("apiKeyId", "status");
CREATE INDEX "GraphScope_apiKeyId_projectionStatus_idx" ON "GraphScope"("apiKeyId", "projectionStatus");

CREATE INDEX "GraphEntity_graphScopeId_entityType_idx" ON "GraphEntity"("graphScopeId", "entityType");
CREATE INDEX "GraphEntity_graphScopeId_lastSeenAt_idx" ON "GraphEntity"("graphScopeId", "lastSeenAt");
CREATE UNIQUE INDEX "GraphEntity_graphScopeId_entityType_canonicalName_key" ON "GraphEntity"("graphScopeId", "entityType", "canonicalName");

CREATE INDEX "GraphRelation_graphScopeId_relationType_idx" ON "GraphRelation"("graphScopeId", "relationType");
CREATE UNIQUE INDEX "GraphRelation_graphScopeId_fromEntityId_toEntityId_relationType_key" ON "GraphRelation"("graphScopeId", "fromEntityId", "toEntityId", "relationType");

CREATE INDEX "GraphObservation_graphScopeId_graphEntityId_idx" ON "GraphObservation"("graphScopeId", "graphEntityId");
CREATE INDEX "GraphObservation_graphScopeId_graphRelationId_idx" ON "GraphObservation"("graphScopeId", "graphRelationId");
CREATE INDEX "GraphObservation_graphScopeId_evidenceSourceId_idx" ON "GraphObservation"("graphScopeId", "evidenceSourceId");
CREATE INDEX "GraphObservation_graphScopeId_evidenceRevisionId_idx" ON "GraphObservation"("graphScopeId", "evidenceRevisionId");
CREATE INDEX "GraphObservation_graphScopeId_evidenceChunkId_idx" ON "GraphObservation"("graphScopeId", "evidenceChunkId");
CREATE INDEX "GraphObservation_graphScopeId_evidenceMemoryId_idx" ON "GraphObservation"("graphScopeId", "evidenceMemoryId");
CREATE INDEX "GraphObservation_graphScopeId_observationType_idx" ON "GraphObservation"("graphScopeId", "observationType");

CREATE INDEX "GraphProjectionRun_graphScopeId_status_idx" ON "GraphProjectionRun"("graphScopeId", "status");
CREATE INDEX "GraphProjectionRun_graphScopeId_startedAt_idx" ON "GraphProjectionRun"("graphScopeId", "startedAt");

ALTER TABLE "MemoryFact"
ADD CONSTRAINT "MemoryFact_graphScopeId_fkey"
FOREIGN KEY ("graphScopeId") REFERENCES "GraphScope"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GraphEntity"
ADD CONSTRAINT "GraphEntity_graphScopeId_fkey"
FOREIGN KEY ("graphScopeId") REFERENCES "GraphScope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GraphRelation"
ADD CONSTRAINT "GraphRelation_graphScopeId_fkey"
FOREIGN KEY ("graphScopeId") REFERENCES "GraphScope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GraphRelation"
ADD CONSTRAINT "GraphRelation_fromEntityId_fkey"
FOREIGN KEY ("fromEntityId") REFERENCES "GraphEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GraphRelation"
ADD CONSTRAINT "GraphRelation_toEntityId_fkey"
FOREIGN KEY ("toEntityId") REFERENCES "GraphEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GraphObservation"
ADD CONSTRAINT "GraphObservation_graphScopeId_fkey"
FOREIGN KEY ("graphScopeId") REFERENCES "GraphScope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GraphObservation"
ADD CONSTRAINT "GraphObservation_graphEntityId_fkey"
FOREIGN KEY ("graphEntityId") REFERENCES "GraphEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GraphObservation"
ADD CONSTRAINT "GraphObservation_graphRelationId_fkey"
FOREIGN KEY ("graphRelationId") REFERENCES "GraphRelation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GraphObservation"
ADD CONSTRAINT "GraphObservation_evidenceSourceId_fkey"
FOREIGN KEY ("evidenceSourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GraphObservation"
ADD CONSTRAINT "GraphObservation_evidenceMemoryId_fkey"
FOREIGN KEY ("evidenceMemoryId") REFERENCES "MemoryFact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GraphProjectionRun"
ADD CONSTRAINT "GraphProjectionRun_graphScopeId_fkey"
FOREIGN KEY ("graphScopeId") REFERENCES "GraphScope"("id") ON DELETE CASCADE ON UPDATE CASCADE;
