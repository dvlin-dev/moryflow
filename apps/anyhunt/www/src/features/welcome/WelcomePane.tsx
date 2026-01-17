/**
 * Welcome Pane
 *
 * [INPUT]: kind
 * [OUTPUT]: outline 或 content pane
 * [POS]: /welcome 的中栏与右栏
 */

import { isValidElement, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Button } from '@anyhunt/ui';
import { usePublicEnv } from '@/lib/public-env-context';
import { getWelcomeConfig } from './welcome.api';
import { MarkdownView } from '@/components/reader/MarkdownView';

export type WelcomePaneKind = 'outline' | 'content';

interface WelcomePaneProps {
  kind: WelcomePaneKind;
}

export function WelcomePane({ kind }: WelcomePaneProps) {
  const env = usePublicEnv();

  const welcomeQuery = useQuery({
    queryKey: ['digest', 'welcome'],
    queryFn: () => getWelcomeConfig(env.apiUrl),
  });

  const markdown = welcomeQuery.data?.contentMarkdown ?? '';

  const slugifyHeading = (title: string) =>
    title
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

  const createHeadingSlugger = () => {
    const counts = new Map<string, number>();
    return (title: string) => {
      const base = slugifyHeading(title) || 'section';
      const count = counts.get(base) ?? 0;
      counts.set(base, count + 1);
      return count === 0 ? base : `${base}-${count}`;
    };
  };

  const extractText = (node: ReactNode): string => {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (!node) return '';
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (isValidElement(node)) {
      const children = (node.props as { children?: ReactNode }).children;
      return extractText(children ?? '');
    }
    return '';
  };

  const outline = useMemo(() => {
    if (!markdown) return [];
    const slugger = createHeadingSlugger();
    return markdown
      .split('\n')
      .map((line) => line.match(/^(#{1,3})\s+(.+)$/))
      .filter(Boolean)
      .map((match) => {
        const [, hashes, title] = match as RegExpMatchArray;
        const level = hashes.length;
        const id = slugger(title);
        return { id, level, title };
      });
  }, [markdown]);

  if (kind === 'outline') {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <div className="text-sm font-semibold">Welcome</div>
          <div className="text-xs text-muted-foreground">Getting started</div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {welcomeQuery.isLoading ? (
            <div className="px-2 py-2 text-sm text-muted-foreground">Loading…</div>
          ) : welcomeQuery.isError ? (
            <div className="px-2 py-2 text-sm text-destructive">
              Failed to load welcome content.
            </div>
          ) : outline.length === 0 ? (
            <div className="px-2 py-2 text-sm text-muted-foreground">No outline available.</div>
          ) : (
            <div className="space-y-1">
              {outline.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  style={{ paddingLeft: 8 + (item.level - 1) * 12 }}
                  onClick={() => {
                    const el = document.getElementById(item.id);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  {item.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const slugger = createHeadingSlugger();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-5">
        <div className="text-lg font-semibold">
          {welcomeQuery.data?.title ?? 'Welcome to Anyhunt'}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Always-on updates from across the web.
        </div>
        {welcomeQuery.data?.primaryAction?.action === 'openExplore' && (
          <div className="mt-4">
            <Button asChild>
              <Link to="/explore">{welcomeQuery.data.primaryAction.label}</Link>
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {welcomeQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : welcomeQuery.isError ? (
          <div className="text-sm text-destructive">Failed to load welcome content.</div>
        ) : markdown ? (
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <MarkdownView
              markdown={markdown}
              components={{
                h1: ({ children, ...props }) => (
                  <h1 id={slugger(extractText(children))} {...props}>
                    {children}
                  </h1>
                ),
                h2: ({ children, ...props }) => (
                  <h2 id={slugger(extractText(children))} {...props}>
                    {children}
                  </h2>
                ),
                h3: ({ children, ...props }) => (
                  <h3 id={slugger(extractText(children))} {...props}>
                    {children}
                  </h3>
                ),
              }}
            />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No content yet.</div>
        )}
      </div>
    </div>
  );
}
