/**
 * InboxStats - 收件箱统计组件
 *
 * [PROPS]: stats 数据
 * [POS]: 用于 Console Inbox 统计展示
 */

import { Card, CardContent, CardHeader, CardTitle } from '../components/card';
import { cn } from '../lib/utils';

export interface InboxStatsData {
  unreadCount: number;
  savedCount: number;
  totalCount: number;
}

export interface InboxStatsProps {
  stats: InboxStatsData;
  className?: string;
}

export function InboxStats({ stats, className }: InboxStatsProps) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-3', className)}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Unread</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.unreadCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Saved</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.savedCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCount}</div>
        </CardContent>
      </Card>
    </div>
  );
}
