/**
 * Inbox Panes (Reader)
 *
 * [INPUT]: kind, (optional) itemId, URL search filters
 * [OUTPUT]: list / empty / detail panes
 * [POS]: /inbox/* 的中栏与右栏
 */

import { Link } from '@tanstack/react-router';
import { Button, cn } from '@moryflow/ui';
import { useInboxItems, useInboxItemContent } from '@/features/digest/hooks';
import type { InboxItem, InboxItemState } from '@/features/digest/types';
import { MarkdownView } from '@/components/reader/MarkdownView';
import { useAuthStore } from '@/stores/auth-store';

type InboxFilters = { subscriptionId?: string; state?: InboxItemState };

type InboxPaneProps =
  | { kind: 'list'; selectedItemId: string | null; filters: InboxFilters }
  | { kind: 'empty' }
  | { kind: 'detail'; itemId: string; filters: InboxFilters };

type InboxListContentState = 'loading' | 'error' | 'empty' | 'ready';
type InboxDetailContentState = 'loading' | 'error' | 'empty' | 'ready';

function SignInPrompt({
  title,
  description,
  redirectPath,
}: {
  title: string;
  description: string;
  redirectPath: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      <Button asChild className="mt-4">
        <Link to="/login" search={{ redirect: redirectPath }}>
          Sign in
        </Link>
      </Button>
    </div>
  );
}

function resolveInboxListContentState(params: {
  isLoading: boolean;
  isError: boolean;
  itemCount: number;
}): InboxListContentState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.isError) {
    return 'error';
  }

  if (params.itemCount === 0) {
    return 'empty';
  }

  return 'ready';
}

function resolveInboxDetailContentState(params: {
  isLoading: boolean;
  isError: boolean;
  hasMarkdown: boolean;
}): InboxDetailContentState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.isError) {
    return 'error';
  }

  if (!params.hasMarkdown) {
    return 'empty';
  }

  return 'ready';
}

function renderInboxListContentByState(params: {
  state: InboxListContentState;
  items: InboxItem[];
  selectedItemId: string | null;
  subscriptionId?: string;
  itemState?: InboxItemState;
}) {
  switch (params.state) {
    case 'loading':
      return <div className="px-2 py-2 text-sm text-muted-foreground">Loading…</div>;
    case 'error':
      return <div className="px-2 py-2 text-sm text-destructive">Failed to load inbox items.</div>;
    case 'empty':
      return <div className="px-2 py-2 text-sm text-muted-foreground">No items yet.</div>;
    case 'ready':
      return (
        <div className="space-y-1">
          {params.items.map((item) => (
            <Link
              key={item.id}
              to="/inbox/items/$itemId"
              params={{ itemId: item.id }}
              search={{ subscriptionId: params.subscriptionId, state: params.itemState }}
              className={cn(
                'flex flex-col rounded-md px-2 py-2 transition-colors hover:bg-accent/60',
                params.selectedItemId === item.id ? 'bg-accent' : ''
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
      );
    default:
      return null;
  }
}

function renderInboxDetailContentByState(params: {
  state: InboxDetailContentState;
  markdown: string | null;
}) {
  switch (params.state) {
    case 'loading':
      return <div className="text-sm text-muted-foreground">Loading…</div>;
    case 'error':
      return <div className="text-sm text-destructive">Failed to load content.</div>;
    case 'empty':
      return <div className="text-sm text-muted-foreground">No content available.</div>;
    case 'ready':
      return (
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <MarkdownView markdown={params.markdown ?? ''} />
        </div>
      );
    default:
      return null;
  }
}

export function InboxPane(props: InboxPaneProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const subscriptionId = props.kind === 'empty' ? undefined : props.filters.subscriptionId;
  const itemState = props.kind === 'empty' ? undefined : props.filters.state;
  const detailItemId = props.kind === 'detail' && isAuthenticated ? props.itemId : null;

  const inboxQuery = useInboxItems(
    {
      page: 1,
      limit: 30,
      subscriptionId,
      state: itemState,
    },
    { enabled: isAuthenticated && props.kind === 'list' }
  );

  const contentQuery = useInboxItemContent(detailItemId);

  switch (props.kind) {
    case 'list': {
      if (!isAuthenticated) {
        return (
          <SignInPrompt
            title="Sign in to view your inbox"
            description="Your personalized updates live here."
            redirectPath="/inbox"
          />
        );
      }

      const items = inboxQuery.data?.items ?? [];
      const contentState = resolveInboxListContentState({
        isLoading: inboxQuery.isLoading,
        isError: inboxQuery.isError,
        itemCount: items.length,
      });

      return (
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <div className="text-sm font-semibold">Inbox</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {subscriptionId ? 'Filtered' : 'All subscriptions'}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {renderInboxListContentByState({
              state: contentState,
              items,
              selectedItemId: props.selectedItemId,
              subscriptionId,
              itemState,
            })}
          </div>
        </div>
      );
    }
    case 'empty':
      return (
        <div className="flex h-full flex-col items-center justify-center px-6">
          <div className="text-sm text-muted-foreground">Select an item to read.</div>
        </div>
      );
    case 'detail': {
      if (!isAuthenticated) {
        return (
          <SignInPrompt
            title="Sign in to read this item"
            description="Your personalized updates live here."
            redirectPath={`/inbox/items/${props.itemId}`}
          />
        );
      }

      const detailState = resolveInboxDetailContentState({
        isLoading: contentQuery.isLoading,
        isError: contentQuery.isError,
        hasMarkdown: !!contentQuery.data?.markdown,
      });

      return (
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-border px-6 py-5">
            <div className="text-lg font-semibold">{contentQuery.data?.titleSnapshot ?? 'Inbox item'}</div>
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
            {renderInboxDetailContentByState({
              state: detailState,
              markdown: contentQuery.data?.markdown ?? null,
            })}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
