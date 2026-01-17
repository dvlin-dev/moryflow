/**
 * Inbox Item Route (Reader)
 *
 * [INPUT]: itemId
 * [OUTPUT]: Reader 三栏布局：Inbox list + item detail
 * [POS]: /inbox/items/:itemId - 可分享/可刷新恢复
 */

import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod/v3';
import { ReaderThreePane } from '@/features/reader-shell/ReaderThreePane';
import { InboxPane } from '@/features/inbox/InboxPane';

const inboxSearchSchema = z.object({
  subscriptionId: z.string().optional(),
  state: z.enum(['UNREAD', 'READ', 'SAVED', 'NOT_INTERESTED'] as const).optional(),
});

export const Route = createFileRoute('/inbox/items/$itemId')({
  validateSearch: inboxSearchSchema,
  component: InboxItemRoute,
});

function InboxItemRoute() {
  const { itemId } = Route.useParams();
  const { subscriptionId, state } = Route.useSearch();

  return (
    <ReaderThreePane
      list={<InboxPane kind="list" selectedItemId={itemId} filters={{ subscriptionId, state }} />}
      detail={<InboxPane kind="detail" itemId={itemId} filters={{ subscriptionId, state }} />}
    />
  );
}
