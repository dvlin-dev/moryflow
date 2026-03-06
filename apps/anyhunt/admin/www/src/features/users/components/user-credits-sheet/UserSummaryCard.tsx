/**
 * [PROPS]: user summary 状态、用户信息与重试回调
 * [EMITS]: onRetry
 * [POS]: user credits 面板用户摘要卡片
 */

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@moryflow/ui';
import type { UserDetail } from '../../types';
import type { UserSummaryState } from './types';

export interface UserSummaryCardProps {
  state: UserSummaryState;
  user: UserDetail | undefined;
  purchasedQuota: number;
  onRetry: () => void;
}

function renderUserSummaryContentByState({
  state,
  user,
  purchasedQuota,
  onRetry,
}: UserSummaryCardProps): React.ReactNode {
  switch (state) {
    case 'loading':
      return (
        <div className="space-y-2">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      );
    case 'error':
      return (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">Failed to load user.</div>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      );
    case 'not_found':
      return <div className="text-sm text-muted-foreground">User not found</div>;
    case 'ready':
      if (!user) {
        return null;
      }

      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="font-medium">{user.email}</div>
            {user.isAdmin && (
              <Badge variant="destructive" className="text-xs">
                Admin
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {user.subscriptionTier}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">ID: {user.id}</div>
          <div className="text-sm text-muted-foreground">
            Purchased credits: <span className="font-medium text-foreground">{purchasedQuota}</span>
          </div>
        </div>
      );
    default:
      return null;
  }
}

export function UserSummaryCard(props: UserSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User</CardTitle>
      </CardHeader>
      <CardContent>{renderUserSummaryContentByState(props)}</CardContent>
    </Card>
  );
}
