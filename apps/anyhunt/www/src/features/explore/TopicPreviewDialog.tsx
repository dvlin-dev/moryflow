/**
 * Topic Preview Dialog
 *
 * [PROPS]: open, onOpenChange, slug
 * [POS]: Explore 中预览 topic（不拆成第三列）
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Button } from '@moryflow/ui';
import { ResponsiveDialog } from '@/components/reader/ResponsiveDialog';
import { getTopicBySlug, getTopicEditions } from '@/lib/digest-api';
import { usePublicEnv } from '@/lib/public-env-context';

interface TopicPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string | null;
}

type TopicPreviewContentState = 'loading' | 'error' | 'ready';

function resolveTopicPreviewContentState(params: {
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
}): TopicPreviewContentState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.isError || !params.hasData) {
    return 'error';
  }

  return 'ready';
}

export function TopicPreviewDialog({ open, onOpenChange, slug }: TopicPreviewDialogProps) {
  const env = usePublicEnv();

  const topicQuery = useQuery({
    queryKey: ['digest', 'topic-preview', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Missing slug');
      const [topic, editions] = await Promise.all([
        getTopicBySlug(env.apiUrl, slug),
        getTopicEditions(env.apiUrl, slug, { limit: 5 }),
      ]);
      return { topic, editions: editions.items };
    },
    enabled: open && Boolean(slug),
  });

  const contentState = resolveTopicPreviewContentState({
    isLoading: topicQuery.isLoading,
    isError: topicQuery.isError,
    hasData: Boolean(topicQuery.data),
  });

  const renderContentByState = () => {
    switch (contentState) {
      case 'loading':
        return <div className="py-6 text-sm text-muted-foreground">Loading…</div>;
      case 'error':
        return <div className="py-6 text-sm text-destructive">Failed to load preview.</div>;
      case 'ready': {
        const preview = topicQuery.data;
        if (!preview) {
          return null;
        }

        return (
          <div className="space-y-4 py-2">
            <div>
              <div className="text-sm font-semibold">{preview.topic.title}</div>
              {preview.topic.description ? (
                <div className="mt-1 text-sm text-muted-foreground">{preview.topic.description}</div>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Recent editions</div>
              {preview.editions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No editions yet.</div>
              ) : (
                <div className="space-y-1">
                  {preview.editions.map((edition) => (
                    <Link
                      key={edition.id}
                      to="/topic/$slug/editions/$editionId"
                      params={{ slug: preview.topic.slug, editionId: edition.id }}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-accent/40"
                      onClick={() => onOpenChange(false)}
                    >
                      <span>
                        {new Date(edition.finishedAt ?? edition.scheduledAt).toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric' }
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">{edition.itemCount} items</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Preview"
      description={slug ? `Topic: ${slug}` : undefined}
      footer={
        slug ? (
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button asChild>
              <Link to="/topic/$slug" params={{ slug }}>
                Open topic
              </Link>
            </Button>
          </div>
        ) : null
      }
    >
      {renderContentByState()}
    </ResponsiveDialog>
  );
}
