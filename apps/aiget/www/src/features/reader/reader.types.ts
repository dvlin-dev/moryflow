/**
 * [DEFINES]: FilterState, filterStateToInboxState
 * [USED_BY]: ReaderPage, ReaderListPane
 * [POS]: Reader Inbox 过滤状态与后端枚举映射（UI 友好）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/www/CLAUDE.md`
 */

import type { InboxItemState } from '@/features/digest/types';

export type FilterState = 'all' | 'unread' | 'saved' | 'not_interested';

export function filterStateToInboxState(filter: FilterState): InboxItemState | undefined {
  switch (filter) {
    case 'unread':
      return 'UNREAD';
    case 'saved':
      return 'SAVED';
    case 'not_interested':
      return 'NOT_INTERESTED';
    default:
      return undefined;
  }
}
