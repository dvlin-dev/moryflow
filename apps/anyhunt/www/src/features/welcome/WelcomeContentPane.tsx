/**
 * Welcome Content Pane
 *
 * [PROPS]: selectedSlug
 * [POS]: /welcome 右栏（渲染选中的 Welcome Page Markdown）
 */

import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@moryflow/ui';
import { MarkdownView } from '@/components/reader/MarkdownView';
import { useWelcomeOverview, useWelcomePage } from './welcome.hooks';

interface WelcomeContentPaneProps {
  selectedSlug: string | null;
}

export function WelcomeContentPane({ selectedSlug }: WelcomeContentPaneProps) {
  const overviewQuery = useWelcomeOverview();

  const resolvedSlug = useMemo(() => {
    const overview = overviewQuery.data;
    if (!overview) return selectedSlug;
    if (selectedSlug && overview.pages.some((p) => p.slug === selectedSlug)) {
      return selectedSlug;
    }
    return overview.defaultSlug || overview.pages[0]?.slug || null;
  }, [overviewQuery.data, selectedSlug]);

  const pageQuery = useWelcomePage(resolvedSlug);

  const headerTitle = pageQuery.data?.title || 'Welcome to Anyhunt';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-5">
        <div className="text-lg font-semibold">{headerTitle}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Always-on updates from across the web.
        </div>

        {overviewQuery.data?.primaryAction?.action === 'openExplore' ? (
          <div className="mt-4">
            <Button asChild>
              <Link to="/explore">{overviewQuery.data.primaryAction.label}</Link>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {overviewQuery.isLoading || pageQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : overviewQuery.isError || pageQuery.isError ? (
          <div className="text-sm text-destructive">Failed to load welcome content.</div>
        ) : pageQuery.data?.contentMarkdown ? (
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <MarkdownView markdown={pageQuery.data.contentMarkdown} />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No content yet.</div>
        )}
      </div>
    </div>
  );
}
