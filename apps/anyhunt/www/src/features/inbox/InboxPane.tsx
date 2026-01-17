/**
 * Inbox Panes (Reader)
 *
 * [INPUT]: kind, (optional) itemId, URL search filters
 * [OUTPUT]: list / empty / detail panes
 * [POS]: /inbox/* 的中栏与右栏
 */

import { Link } from '@tanstack/react-router';
import { Button, cn } from '@anyhunt/ui';
import { useAuth } from '@/lib/auth-context';
import { useInboxItems, useInboxItemContent } from '@/features/digest/hooks';
import type { InboxItemState } from '@/features/digest/types';
import { MarkdownView } from '@/components/reader/MarkdownView';

type InboxPaneKind = 'list' | 'empty' | 'detail';

type InboxFilters = { subscriptionId?: string; state?: InboxItemState };

type InboxPaneProps =
  | { kind: 'list'; selectedItemId: string | null; filters: InboxFilters }
  | { kind: 'empty' }
  | { kind: 'detail'; itemId: string; filters: InboxFilters };

export function InboxPane(props: InboxPaneProps) {
  const { isAuthenticated } = useAuth();
  const subscriptionId = props.kind === 'empty' ? undefined : props.filters.subscriptionId;
  const state = props.kind === 'empty' ? undefined : props.filters.state;

  const inboxQuery = useInboxItems(
    {
      page: 1,
      limit: 30,
      subscriptionId,
      state,
    },
    { enabled: isAuthenticated && props.kind === 'list' }
  );

  if (props.kind === 'list') {
    if (!isAuthenticated) {
      return (
        <div className="flex h-full flex-col items-center justify-center px-6">
          <div className="text-sm font-medium">Sign in to view your inbox</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Your personalized updates live here.
          </div>
          <Button asChild className="mt-4">
            <Link to="/login" search={{ redirect: '/inbox' }}>
              Sign in
            </Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <div className="text-sm font-semibold">Inbox</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {subscriptionId ? 'Filtered' : 'All subscriptions'}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {inboxQuery.isLoading ? (
            <div className="px-2 py-2 text-sm text-muted-foreground">Loading…</div>
          ) : inboxQuery.isError ? (
            <div className="px-2 py-2 text-sm text-destructive">Failed to load inbox items.</div>
          ) : (inboxQuery.data?.items ?? []).length === 0 ? (
            <div className="px-2 py-2 text-sm text-muted-foreground">No items yet.</div>
          ) : (
            <div className="space-y-1">
              {(inboxQuery.data?.items ?? []).map((item) => (
                <Link
                  key={item.id}
                  to="/inbox/items/$itemId"
                  params={{ itemId: item.id }}
                  search={{ subscriptionId, state }}
                  className={cn(
                    'flex flex-col rounded-md px-2 py-2 transition-colors hover:bg-accent/60',
                    props.selectedItemId === item.id ? 'bg-accent' : ''
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="line-clamp-2 text-sm font-medium">{item.titleSnapshot}</div>
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {new Date(item.deliveredAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                  {item.aiSummarySnapshot ? (
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.aiSummarySnapshot}
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (props.kind === 'empty') {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <div className="text-sm text-muted-foreground">Select an item to read.</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <div className="text-sm font-medium">Sign in to read this item</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Your personalized updates live here.
        </div>
        <Button asChild className="mt-4">
          <Link to="/login" search={{ redirect: `/inbox/items/${props.itemId}` }}>
            Sign in
          </Link>
        </Button>
      </div>
    );
  }

  const contentQuery = useInboxItemContent(props.itemId);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-5">
        <div className="text-lg font-semibold">
          {contentQuery.data?.titleSnapshot ?? 'Inbox item'}
        </div>
        {contentQuery.data?.urlSnapshot ? (
          <a
            href={contentQuery.data.urlSnapshot}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block truncate text-sm text-muted-foreground hover:text-foreground"
          >
            {contentQuery.data.urlSnapshot}
          </a>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {contentQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : contentQuery.isError ? (
          <div className="text-sm text-destructive">Failed to load content.</div>
        ) : contentQuery.data?.markdown ? (
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <MarkdownView markdown={contentQuery.data.markdown} />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No content available.</div>
        )}
      </div>
    </div>
  );
}
