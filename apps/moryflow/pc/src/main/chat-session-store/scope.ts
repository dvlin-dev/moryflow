import { fetchCurrentUserId } from '../cloud-sync/user-info.js';
import { ensureWorkspaceIdentity } from '../workspace-meta/identity.js';
import { buildWorkspaceProfileKey } from '../workspace-profile/service.js';
import { getStoredVault } from '../vault.js';

export const resolveChatSessionProfileKey = async (
  vaultPath: string,
): Promise<string | null> => {
  const userId = await fetchCurrentUserId();
  if (!userId) {
    return null;
  }
  const identity = await ensureWorkspaceIdentity(vaultPath);
  return buildWorkspaceProfileKey(userId, identity.clientWorkspaceId);
};

export const resolveCurrentChatSessionScope = async (): Promise<
  { vaultPath: string; profileKey: string | null } | null
> => {
  const storedVault = await getStoredVault();
  if (!storedVault?.path) {
    return null;
  }
  return {
    vaultPath: storedVault.path,
    profileKey: await resolveChatSessionProfileKey(storedVault.path),
  };
};
