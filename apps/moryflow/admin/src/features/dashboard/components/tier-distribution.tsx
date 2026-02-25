/**
 * 用户等级分布卡片组件
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/format';
import type { UserTier } from '@/types/api';

const TIER_KEYS: UserTier[] = ['free', 'starter', 'basic', 'pro'];
const TIER_CONFIG: Record<UserTier, { label: string; color: string }> = {
  free: { label: '免费用户', color: 'bg-gray-500' },
  starter: { label: '入门会员', color: 'bg-green-500' },
  basic: { label: '基础会员', color: 'bg-blue-500' },
  pro: { label: '专业会员', color: 'bg-purple-500' },
};

interface TierDistributionProps {
  usersByTier: Record<UserTier, number> | undefined;
  isLoading: boolean;
}

export function TierDistribution({ usersByTier, isLoading }: TierDistributionProps) {
  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TIER_KEYS.map((tierKey) => (
              <Skeleton key={tierKey} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usersByTier) return null;

  const total = TIER_KEYS.reduce((sum, tierKey) => sum + (usersByTier[tierKey] || 0), 0);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">用户等级分布</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TIER_KEYS.map((tierKey) => {
            const tier = TIER_CONFIG[tierKey];
            const count = usersByTier[tierKey] || 0;
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
            return (
              <div key={tierKey} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${tier.color}`} />
                  <span className="text-sm text-muted-foreground">{tier.label}</span>
                </div>
                <div className="text-2xl font-bold">{formatNumber(count)}</div>
                <div className="text-xs text-muted-foreground">{percentage}%</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
