/**
 * [PROVIDES]: lib entry exports
 * [POS]: Shared utility exports for UI package
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export { cn } from './utils';
export { formatRelativeTime, isExpired, isExpiringSoon } from './time';
export {
  createSafeJSONStorage,
  isStateStorageLike,
  noopStateStorage,
  resolveSafeStateStorage,
} from './state-storage';
