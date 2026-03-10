import type { CloudUsageInfo, SemanticSearchResult } from '../../shared/ipc/cloud-sync';
import type { SyncStatusDetail } from './const';

export function buildCloudSyncValidationFileName(timestamp: string): string {
  return `codex-validation-cloud-sync-${timestamp}.md`;
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
