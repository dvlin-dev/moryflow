-- Align KnowledgeSource aggregate schema with the current production model.
-- This migration assumes the knowledge indexing derived domain can be reset
-- before deploy, so legacy PROCESSING / FAILED source rows are not preserved.

-- AlterEnum
BEGIN;
CREATE TYPE "KnowledgeSourceStatus_new" AS ENUM ('ACTIVE', 'DELETED');
ALTER TABLE "public"."KnowledgeSource" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "KnowledgeSource"
ALTER COLUMN "status" TYPE "KnowledgeSourceStatus_new"
USING ("status"::text::"KnowledgeSourceStatus_new");
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
