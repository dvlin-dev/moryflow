-- CreateIndex
CREATE INDEX "WorkspaceContentOutbox_pendingByWorkspace_idx"
ON "WorkspaceContentOutbox"("workspaceId", "processedAt", "deadLetteredAt");
