-- CreateIndex
CREATE INDEX "WorkspaceContentOutbox_pendingByWorkspace_idx"
ON "WorkspaceContentOutbox"("workspaceId", "eventType", "processedAt", "deadLetteredAt");
