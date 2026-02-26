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
import type { WelcomeAction } from './welcome.types';

interface WelcomeContentPaneProps {
  selectedSlug: string | null;
}

type WelcomeContentViewState = 'loading' | 'error' | 'empty' | 'ready';

function resolveWelcomeContentViewState(params: {
  isLoading: boolean;
  isError: boolean;
  hasMarkdown: boolean;
}): WelcomeContentViewState {
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

function resolvePrimaryActionNode(params: {
  action: WelcomeAction | null | undefined;
  redirectPath: string;
}) {
  const action = params.action;
  if (!action) {
    return null;
  }

  switch (action.action) {
    case 'openExplore':
      return (
        <Button asChild>
          <Link to="/explore">{action.label}</Link>
        </Button>
      );
    case 'openSignIn':
      return (
        <Button asChild>
          <Link to="/login" search={{ redirect: params.redirectPath }}>
            {action.label}
          </Link>
        </Button>
      );
    default:
      return null;
  }
}

function renderWelcomeContentByState(params: {
  state: WelcomeContentViewState;
  markdown: string | null;
}) {
  switch (params.state) {
    case 'loading':
      return <div className="text-sm text-muted-foreground">Loading…</div>;
    case 'error':
      return <div className="text-sm text-destructive">Failed to load welcome content.</div>;
    case 'empty':
      return <div className="text-sm text-muted-foreground">No content yet.</div>;
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

export function WelcomeContentPane({ selectedSlug }: WelcomeContentPaneProps) {
  const overviewQuery = useWelcomeOverview();

  const resolvedSlug = useMemo(() => {
    const overview = overviewQuery.data;
    if (!overview) return selectedSlug;
    if (selectedSlug && overview.pages.some((page) => page.slug === selectedSlug)) {
      return selectedSlug;
    }
    return overview.defaultSlug || overview.pages[0]?.slug || null;
  }, [overviewQuery.data, selectedSlug]);

  const pageQuery = useWelcomePage(resolvedSlug);
  const headerTitle = pageQuery.data?.title || 'Welcome to Anyhunt';

  const redirectPath = useMemo(() => {
    if (!resolvedSlug) {
      return '/welcome';
    }

    return `/welcome?page=${encodeURIComponent(resolvedSlug)}`;
  }, [resolvedSlug]);

  const primaryActionNode = resolvePrimaryActionNode({
    action: overviewQuery.data?.primaryAction,
    redirectPath,
  });

  const viewState = resolveWelcomeContentViewState({
    isLoading: overviewQuery.isLoading || pageQuery.isLoading,
    isError: overviewQuery.isError || pageQuery.isError,
    hasMarkdown: Boolean(pageQuery.data?.contentMarkdown),
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-5">
        <div className="text-lg font-semibold">{headerTitle}</div>
        <div className="mt-1 text-sm text-muted-foreground">Always-on updates from across the web.</div>
        {primaryActionNode ? <div className="mt-4">{primaryActionNode}</div> : null}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {renderWelcomeContentByState({
          state: viewState,
          markdown: pageQuery.data?.contentMarkdown ?? null,
        })}
      </div>
    </div>
  );
}
