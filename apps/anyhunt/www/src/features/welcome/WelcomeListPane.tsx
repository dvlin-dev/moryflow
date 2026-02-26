/**
 * Welcome List Pane
 *
 * [PROPS]: selectedSlug, basePath
 * [POS]: /welcome 中栏（Welcome Pages 列表）
 */

import { Link } from '@tanstack/react-router';
import { Badge, cn } from '@moryflow/ui';
import { useWelcomeOverview } from './welcome.hooks';
import type { WelcomePageSummary } from './welcome.types';

interface WelcomeListPaneProps {
  selectedSlug: string | null;
  basePath?: '/welcome';
}

type WelcomeListViewState = 'loading' | 'error' | 'empty' | 'ready';

function resolveWelcomeListViewState(params: {
  isLoading: boolean;
  isError: boolean;
  count: number;
}): WelcomeListViewState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.isError) {
    return 'error';
  }

  if (params.count === 0) {
    return 'empty';
  }

  return 'ready';
}

function renderWelcomeListContentByState(params: {
  state: WelcomeListViewState;
  pages: WelcomePageSummary[];
  selectedSlug: string | null;
  basePath: '/welcome';
}) {
  switch (params.state) {
    case 'loading':
      return <div className="px-2 py-2 text-sm text-muted-foreground">Loading…</div>;
    case 'error':
      return <div className="px-2 py-2 text-sm text-destructive">Failed to load welcome pages.</div>;
    case 'empty':
      return <div className="px-2 py-2 text-sm text-muted-foreground">No pages yet.</div>;
    case 'ready':
      return (
        <div className="space-y-1">
          {params.pages.map((page) => {
            const isActive = page.slug === params.selectedSlug;

            return (
              <Link
                key={page.slug}
                to={params.basePath}
                search={{ page: page.slug }}
                className={cn(
                  'flex w-full items-start justify-between gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                )}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{page.title || page.slug}</div>
                  {page.excerpt ? (
                    <div className="line-clamp-2 text-xs text-muted-foreground">{page.excerpt}</div>
                  ) : null}
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {page.slug}
                </Badge>
              </Link>
            );
          })}
        </div>
      );
    default:
      return null;
  }
}

export function WelcomeListPane({ selectedSlug, basePath = '/welcome' }: WelcomeListPaneProps) {
  const overviewQuery = useWelcomeOverview();
  const pages = overviewQuery.data?.pages ?? [];

  const viewState = resolveWelcomeListViewState({
    isLoading: overviewQuery.isLoading,
    isError: overviewQuery.isError,
    count: pages.length,
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold">Welcome</div>
        <div className="text-xs text-muted-foreground">Getting started</div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {renderWelcomeListContentByState({
          state: viewState,
          pages,
          selectedSlug,
          basePath,
        })}
      </div>
    </div>
  );
}
