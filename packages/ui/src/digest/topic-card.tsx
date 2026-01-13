/**
 * TopicCard - 公开话题卡片组件
 *
 * [PROPS]: topic 数据, onFollow, onUnfollow
 * [POS]: 用于公开话题列表展示
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { Button } from '../components/button';
import { DigestStatusBadge } from './digest-status-badge';
import { cn } from '../lib/utils';

export interface TopicData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  visibility: string;
  status: string;
  topic: string;
  interests: string[];
  locale: string;
  cron: string;
  timezone: string;
  subscriberCount: number;
  lastEditionAt: Date | null;
  createdByUserId: string;
  createdAt: Date;
}

export interface TopicCardProps {
  topic: TopicData;
  isFollowing?: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onView?: () => void;
  className?: string;
  isLoading?: boolean;
}

export function TopicCard({
  topic,
  isFollowing,
  onFollow,
  onUnfollow,
  onView,
  className,
  isLoading,
}: TopicCardProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card
      className={cn('cursor-pointer hover:shadow-md transition-shadow', className)}
      onClick={onView}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{topic.title}</CardTitle>
            {topic.description && (
              <CardDescription className="line-clamp-2">{topic.description}</CardDescription>
            )}
          </div>
          <DigestStatusBadge status={topic.visibility} type="visibility" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{topic.topic}</p>

        {topic.interests.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {topic.interests.slice(0, 4).map((interest, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {interest}
              </span>
            ))}
            {topic.interests.length > 4 && (
              <span className="text-xs text-muted-foreground">
                +{topic.interests.length - 4} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>{topic.subscriberCount} followers</span>
            <span>Last: {formatDate(topic.lastEditionAt)}</span>
          </div>
          <span className="uppercase">{topic.locale}</span>
        </div>

        <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
          {isFollowing ? (
            <Button variant="outline" size="sm" onClick={onUnfollow} disabled={isLoading}>
              Unfollow
            </Button>
          ) : (
            <Button variant="default" size="sm" onClick={onFollow} disabled={isLoading}>
              Follow
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onView}>
            View Editions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
