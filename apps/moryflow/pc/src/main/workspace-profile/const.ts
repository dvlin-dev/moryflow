export const WORKSPACE_PROFILE_STORE_NAME = 'workspace-profiles';

export interface WorkspaceProfileRecord {
  workspaceId: string;
  memoryProjectId: string;
  syncVaultId: string | null;
  syncEnabled: boolean;
  lastResolvedAt: string;
}
