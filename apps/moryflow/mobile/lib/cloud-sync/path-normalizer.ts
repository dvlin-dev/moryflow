/**
 * [PROVIDES]: Mobile 云同步 path canonical 入口
 * [DEPENDS]: @moryflow/sync
 * [POS]: Mobile 侧 path 合同边界
 */

import { normalizeSyncPath } from '@moryflow/sync';

export function normalizeCloudSyncPath(rawPath: string): string {
  return normalizeSyncPath(rawPath);
}
