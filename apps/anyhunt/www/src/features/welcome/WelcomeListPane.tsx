/**
 * Welcome List Pane
 *
 * [PROPS]: selectedSlug, basePath
 * [POS]: /welcome 中栏（Welcome Pages 列表）
 */

import { Link } from '@tanstack/react-router';
import { Badge, cn } from '@moryflow/ui';
import { useWelcomeOverview } from './welcome.hooks';

interface WelcomeListPaneProps {
  selectedSlug: string | null;
  basePath?: '/welcome';
}

export function WelcomeListPane({ selectedSlug, basePath = '/welcome' }: WelcomeListPaneProps) {
  const overviewQuery = useWelcomeOverview();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold">Welcome</div>
        <div className="text-xs text-muted-foreground">Getting started</div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {overviewQuery.isLoading ? (
          <div className="px-2 py-2 text-sm text-muted-foreground">Loading…</div>
        ) : overviewQuery.isError ? (
          <div className="px-2 py-2 text-sm text-destructive">Failed to load welcome pages.</div>
        ) : overviewQuery.data?.pages?.length ? (
          <div className="space-y-1">
            {overviewQuery.data.pages.map((page) => {
              const isActive = page.slug === selectedSlug;
              return (
                <Link
                  key={page.slug}
                  to={basePath}
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
                      <div className="line-clamp-2 text-xs text-muted-foreground">
                        {page.excerpt}
                      </div>
                    ) : null}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {page.slug}
                  </Badge>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="px-2 py-2 text-sm text-muted-foreground">No pages yet.</div>
        )}
      </div>
    </div>
  );
}
