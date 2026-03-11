CREATE TYPE "MemoryFactOriginKind" AS ENUM ('MANUAL', 'SOURCE_DERIVED');

ALTER TABLE "MemoryFact"
RENAME COLUMN "memory" TO "content";

ALTER TABLE "MemoryFact"
ADD COLUMN "originKind" "MemoryFactOriginKind" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "sourceId" TEXT,
ADD COLUMN "sourceRevisionId" TEXT,
ADD COLUMN "derivedKey" TEXT;

ALTER TABLE "MemoryFact"
ADD CONSTRAINT "MemoryFact_origin_fields_check"
CHECK (
  (
    "originKind" = 'MANUAL'
    AND "sourceId" IS NULL
    AND "sourceRevisionId" IS NULL
    AND "derivedKey" IS NULL
  )
  OR
  (
    "originKind" = 'SOURCE_DERIVED'
    AND "sourceId" IS NOT NULL
    AND "sourceRevisionId" IS NOT NULL
    AND "derivedKey" IS NOT NULL
    AND "immutable" = TRUE
  )
);

CREATE INDEX "MemoryFact_apiKeyId_originKind_idx"
ON "MemoryFact"("apiKeyId", "originKind");

CREATE INDEX "MemoryFact_apiKeyId_sourceId_idx"
ON "MemoryFact"("apiKeyId", "sourceId");

CREATE INDEX "MemoryFact_apiKeyId_sourceRevisionId_idx"
ON "MemoryFact"("apiKeyId", "sourceRevisionId");

CREATE UNIQUE INDEX "MemoryFact_apiKeyId_sourceId_derivedKey_key"
ON "MemoryFact"("apiKeyId", "sourceId", "derivedKey");

DELETE FROM "GraphObservation" go
WHERE go."evidenceSourceId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "KnowledgeSource" ks
    WHERE ks."id" = go."evidenceSourceId"
  );

DELETE FROM "GraphObservation" go
WHERE go."evidenceMemoryId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "MemoryFact" mf
    WHERE mf."id" = go."evidenceMemoryId"
  );

ALTER TABLE "GraphObservation"
ADD CONSTRAINT "GraphObservation_evidenceSourceId_fkey"
FOREIGN KEY ("evidenceSourceId") REFERENCES "KnowledgeSource"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GraphObservation"
ADD CONSTRAINT "GraphObservation_evidenceMemoryId_fkey"
FOREIGN KEY ("evidenceMemoryId") REFERENCES "MemoryFact"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
