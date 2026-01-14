/**
 * Topics Section Component
 *
 * [PROPS]: title, subtitle, topics array, loading state
 * [POS]: Reusable section for displaying topics on homepage
 */

import { Link } from '@tanstack/react-router';
import { ArrowRight01Icon, Calendar01Icon, UserMultipleIcon } from '@hugeicons/core-free-icons';
import { Button, Icon, Skeleton } from '@aiget/ui';
import { formatRelativeTime } from '@aiget/ui/lib';
import { Container } from '@/components/layout';
import type { DigestTopicSummary } from '@/lib/digest-api';

interface TopicsSectionProps {
  title: string;
  subtitle?: string;
  topics: DigestTopicSummary[];
  isLoading?: boolean;
  showViewAll?: boolean;
  viewAllHref?: string;
  columns?: 2 | 3;
}

export function TopicsSection({
  title,
  subtitle,
  topics,
  isLoading = false,
  showViewAll = true,
  viewAllHref = '/topics',
  columns = 3,
}: TopicsSectionProps) {
  const gridCols = columns === 2 ? 'md:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section className="border-b border-border py-16 md:py-20">
      <Container>
        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
            {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          </div>
          {showViewAll && (
            <Link to={viewAllHref} className="hidden sm:block">
              <Button variant="ghost" size="sm" className="gap-1">
                View all
                <Icon icon={ArrowRight01Icon} className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        {/* Topics Grid */}
        {isLoading ? (
          <div className={`grid gap-4 ${gridCols}`}>
            {Array.from({ length: columns === 2 ? 4 : 6 }).map((_, i) => (
              <TopicCardSkeleton key={i} />
            ))}
          </div>
        ) : topics.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No topics available yet. Check back soon!
          </div>
        ) : (
          <div className={`grid gap-4 ${gridCols}`}>
            {topics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        )}

        {/* Mobile View All */}
        {showViewAll && (
          <div className="mt-8 flex justify-center sm:hidden">
            <Link to={viewAllHref}>
              <Button variant="outline" className="gap-1">
                View all topics
                <Icon icon={ArrowRight01Icon} className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </Container>
    </section>
  );
}

// Topic Card Component
function TopicCard({ topic }: { topic: DigestTopicSummary }) {
  return (
    <Link
      to="/topics/$slug"
      params={{ slug: topic.slug }}
      className="group block rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/20 hover:shadow-sm"
    >
      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
        {topic.title}
      </h3>
      {topic.description && (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{topic.description}</p>
      )}
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Icon icon={UserMultipleIcon} className="h-3.5 w-3.5" />
          {topic.subscriberCount}
        </span>
        {topic.lastEditionAt && (
          <span className="flex items-center gap-1">
            <Icon icon={Calendar01Icon} className="h-3.5 w-3.5" />
            {formatRelativeTime(topic.lastEditionAt)}
          </span>
        )}
      </div>
    </Link>
  );
}

// Skeleton for loading state
function TopicCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1 h-4 w-2/3" />
      <div className="mt-4 flex gap-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
