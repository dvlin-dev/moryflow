/**
 * [PROPS]: topic, onFollow, isFollowing
 * [POS]: Topic card for discover page
 */

import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardFooter, Button, Badge, Icon } from '@aiget/ui';
import { UserMultiple02Icon, Add01Icon, EyeIcon } from '@hugeicons/core-free-icons';
import type { DigestTopicSummary } from '@/lib/digest-api';

interface TopicCardProps {
  topic: DigestTopicSummary & { isFeatured?: boolean };
  onFollow?: (topic: DigestTopicSummary) => void;
  isFollowing?: boolean;
}

function formatSubscriberCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export function TopicCard({ topic, onFollow, isFollowing }: TopicCardProps) {
  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
      <CardContent className="flex-1 p-4">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="line-clamp-2 font-semibold">{topic.title}</h3>
          {topic.isFeatured && (
            <Badge variant="secondary" className="ml-2 shrink-0">
              Featured
            </Badge>
          )}
        </div>

        {topic.description && (
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{topic.description}</p>
        )}

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Icon icon={UserMultiple02Icon} className="size-4" />
          <span>{formatSubscriberCount(topic.subscriberCount)} subscribers</span>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 border-t p-4">
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <Link to="/topics/$slug" params={{ slug: topic.slug }}>
            <Icon icon={EyeIcon} className="mr-1 size-4" />
            Preview
          </Link>
        </Button>
        <Button
          variant={isFollowing ? 'secondary' : 'default'}
          size="sm"
          className="flex-1"
          onClick={() => onFollow?.(topic)}
        >
          <Icon icon={Add01Icon} className="mr-1 size-4" />
          {isFollowing ? 'Following' : 'Follow'}
        </Button>
      </CardFooter>
    </Card>
  );
}
