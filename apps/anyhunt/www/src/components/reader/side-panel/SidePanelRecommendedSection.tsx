/**
 * [PROPS]: pathname
 * [POS]: SidePanel - Recommended topics (unauth + authed)
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { cn } from '@anyhunt/ui';
import { getPublicTopics } from '@/lib/digest-api';
import { usePublicEnv } from '@/lib/public-env-context';

interface SidePanelRecommendedSectionProps {
  pathname: string;
}

export function SidePanelRecommendedSection({ pathname }: SidePanelRecommendedSectionProps) {
  const env = usePublicEnv();

  const recommendedQuery = useQuery({
    queryKey: ['digest', 'topics', 'recommended'],
    queryFn: async () => {
      const result = await getPublicTopics(env.apiUrl, { featured: true, limit: 12 });
      return result.items;
    },
  });

  const activeTopicSlug = pathname.startsWith('/topic/')
    ? (pathname.split('/').filter(Boolean)[1] ?? null)
    : null;

  return (
    <div className="space-y-2">
      <div className="px-1 text-xs font-medium text-muted-foreground">Recommended</div>

      {recommendedQuery.isLoading ? (
        <div className="px-2 py-2 text-xs text-muted-foreground">Loading…</div>
      ) : recommendedQuery.isError ? (
        <div className="px-2 py-2 text-xs text-destructive">Failed to load recommended topics.</div>
      ) : (recommendedQuery.data ?? []).length === 0 ? (
        <div className="px-2 py-2 text-xs text-muted-foreground">No recommended topics yet.</div>
      ) : (
        <div className="space-y-1">
          {(recommendedQuery.data ?? []).map((topic) => (
            <Link
              key={topic.id}
              to="/topic/$slug"
              params={{ slug: topic.slug }}
              className={cn(
                'flex w-full items-center rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
                activeTopicSlug === topic.slug ? 'bg-accent text-foreground' : ''
              )}
            >
              <span className="truncate">{topic.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
