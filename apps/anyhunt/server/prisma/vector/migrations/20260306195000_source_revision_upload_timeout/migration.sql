ALTER TABLE "KnowledgeSourceRevision"
ADD COLUMN "pendingUploadExpiresAt" TIMESTAMP(3);

CREATE INDEX "KnowledgeSourceRevision_status_pendingUploadExpiresAt_idx"
ON "KnowledgeSourceRevision"("status", "pendingUploadExpiresAt");
