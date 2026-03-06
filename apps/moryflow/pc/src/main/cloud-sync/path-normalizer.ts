/**
 * [PROVIDES]: PC 云同步 path canonical 入口
 * [DEPENDS]: @moryflow/sync
 * [POS]: PC 侧 path 合同边界，禁止在业务层重复实现路径规范
 */

import { normalizeSyncPath } from '@moryflow/sync';

export function normalizeCloudSyncPath(rawPath: string): string {
  return normalizeSyncPath(rawPath);
}
