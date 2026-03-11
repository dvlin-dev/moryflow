import type { CloudUsageInfo, SemanticSearchResult } from '../../shared/ipc/cloud-sync';
import type { SyncStatusDetail } from './const';

export type DesktopMembershipValidationState = {
  hasRefreshToken: boolean;
  accessTokenPresent: boolean;
  localUserInfoPresent: boolean;
  refreshReason: string | null;
};

export function buildCloudSyncValidationFileName(timestamp: string): string {
  return `codex-validation-cloud-sync-${timestamp}.md`;
}

export function assertDesktopMembershipSession(state: DesktopMembershipValidationState): void {
  if (state.accessTokenPresent) {
    return;
  }

  if (state.hasRefreshToken) {
    const reason = state.refreshReason ? ` refreshReason=${state.refreshReason}` : '';
    throw new Error(`desktop membership session could not establish an access token.${reason}`);
  }

  throw new Error(
    'desktop membership session is missing. Cloud sync production validation requires a desktop login that persisted refresh/access tokens to local credential storage; browser-only session is insufficient.'
  );
}

export function assertUsageDelta(
  before: CloudUsageInfo,
  after: CloudUsageInfo,
  minDeltaBytes: number
): void {
  const delta = after.storage.used - before.storage.used;
  if (delta < minDeltaBytes) {
    throw new Error(`usage delta ${delta} is smaller than required minimum ${minDeltaBytes}`);
  }
}

export function hasSyncProgressed(before: SyncStatusDetail, after: SyncStatusDetail): boolean {
  return Boolean(after.lastSyncAt && (!before.lastSyncAt || after.lastSyncAt > before.lastSyncAt));
}

export function hasSyncSettled(before: SyncStatusDetail, after: SyncStatusDetail): boolean {
  return (
    hasSyncProgressed(before, after) &&
    after.engineStatus !== 'syncing' &&
    after.engineStatus !== 'disabled'
  );
}

export function findSearchHitByToken(
  results: SemanticSearchResult[],
  token: string
): SemanticSearchResult {
  const hit = results.find(
    (item) =>
      item.title.includes(token) || item.path?.includes(token) || item.snippet.includes(token)
  );

  if (!hit) {
    throw new Error(`search miss for token ${token}`);
  }

  return hit;
}
