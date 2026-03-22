-- Align KnowledgeSource aggregate schema with the current production model.
-- Legacy PROCESSING / FAILED rows are collapsed to DELETED so deploy can
-- complete before the derived domain is reset/rebuilt.

-- AlterEnum
BEGIN;
CREATE TYPE "KnowledgeSourceStatus_new" AS ENUM ('ACTIVE', 'DELETED');
ALTER TABLE "public"."KnowledgeSource" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "KnowledgeSource"
ALTER COLUMN "status" TYPE "KnowledgeSourceStatus_new"
USING (
  CASE
    WHEN "status"::text IN ('ACTIVE', 'DELETED') THEN
      "status"::text::"KnowledgeSourceStatus_new"
    ELSE
      'DELETED'::"KnowledgeSourceStatus_new"
  END
);
ALTER TYPE "KnowledgeSourceStatus" RENAME TO "KnowledgeSourceStatus_old";
ALTER TYPE "KnowledgeSourceStatus_new" RENAME TO "KnowledgeSourceStatus";
DROP TYPE "public"."KnowledgeSourceStatus_old";
ALTER TABLE "KnowledgeSource" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "KnowledgeSource"
ADD COLUMN "latestRevisionId" TEXT;

-- AddForeignKey
ALTER TABLE "KnowledgeSource"
ADD CONSTRAINT "KnowledgeSource_latestRevisionId_fkey"
FOREIGN KEY ("latestRevisionId") REFERENCES "KnowledgeSourceRevision"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

-- RenameIndex
ALTER INDEX "GraphRelation_graphScopeId_fromEntityId_toEntityId_relationType"
RENAME TO "GraphRelation_graphScopeId_fromEntityId_toEntityId_relation_key";
