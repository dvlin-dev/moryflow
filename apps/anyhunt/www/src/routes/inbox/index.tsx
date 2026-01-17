/**
 * Inbox Route (Reader)
 *
 * [INPUT]: None (filters can be added later via URL search)
 * [OUTPUT]: Reader 三栏布局：Inbox list + empty/detail placeholder
 * [POS]: /inbox - 登录后主阅读入口之一（可刷新恢复）
 */

import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod/v3';
import { ReaderThreePane } from '@/features/reader-shell/ReaderThreePane';
import { InboxPane } from '@/features/inbox/InboxPane';

const inboxSearchSchema = z.object({
  subscriptionId: z.string().optional(),
  state: z.enum(['UNREAD', 'READ', 'SAVED', 'NOT_INTERESTED'] as const).optional(),
});

export const Route = createFileRoute('/inbox/')({
  validateSearch: inboxSearchSchema,
  component: InboxRoute,
});

function InboxRoute() {
  const { subscriptionId, state } = Route.useSearch();

  return (
    <ReaderThreePane
      list={<InboxPane kind="list" selectedItemId={null} filters={{ subscriptionId, state }} />}
      detail={<InboxPane kind="empty" />}
    />
  );
}
