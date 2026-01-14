/**
 * SubscriptionCard - 订阅卡片组件
 *
 * [PROPS]: subscription 数据, onToggle, onRun, onEdit, onDelete
 * [POS]: 用于 Console 订阅列表展示
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { Button } from '../components/button';
import { Switch } from '../components/switch';
import { DigestStatusBadge } from './digest-status-badge';
import { cn } from '../lib/utils';

export interface SubscriptionData {
  id: string;
  name: string;
  topic: string;
  interests: string[];
  enabled: boolean;
  cron: string;
  timezone: string;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  followedTopicId?: string | null;
}

export interface SubscriptionCardProps {
  subscription: SubscriptionData;
  onToggle?: () => void;
  onRun?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  isLoading?: boolean;
}

export function SubscriptionCard({
  subscription,
  onToggle,
  onRun,
  onEdit,
  onDelete,
  className,
  isLoading,
}: SubscriptionCardProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  return (
    <Card className={cn('relative', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{subscription.name}</CardTitle>
            <CardDescription className="line-clamp-2">{subscription.topic}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <DigestStatusBadge status={subscription.enabled} type="subscription" />
            <Switch
              checked={subscription.enabled}
              onCheckedChange={onToggle}
              disabled={isLoading}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription.interests.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {subscription.interests.slice(0, 5).map((interest, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {interest}
              </span>
            ))}
            {subscription.interests.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{subscription.interests.length - 5} more
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div>
            <span className="font-medium">Schedule:</span> {subscription.cron}
          </div>
          <div>
            <span className="font-medium">Timezone:</span> {subscription.timezone}
          </div>
          <div>
            <span className="font-medium">Last run:</span> {formatDate(subscription.lastRunAt)}
          </div>
          <div>
            <span className="font-medium">Next run:</span> {formatDate(subscription.nextRunAt)}
          </div>
        </div>

        {subscription.followedTopicId && (
          <p className="text-xs text-muted-foreground">Following a public topic</p>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRun}
            disabled={isLoading || !subscription.enabled}
          >
            Run Now
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit} disabled={isLoading}>
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={isLoading}
            className="text-destructive hover:text-destructive"
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
