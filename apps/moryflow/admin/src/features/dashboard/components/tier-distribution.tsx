/**
 * 用户等级分布卡片组件
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/format'

const TIERS = [
  { key: 'free', label: '免费用户', color: 'bg-gray-500' },
  { key: 'basic', label: '基础会员', color: 'bg-blue-500' },
  { key: 'pro', label: '专业会员', color: 'bg-purple-500' },
  { key: 'license', label: '永久授权', color: 'bg-yellow-500' },
] as const

interface TierDistributionProps {
  usersByTier: Record<string, number> | undefined
  isLoading: boolean
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
            {TIERS.map((tier) => (
              <Skeleton key={tier.key} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!usersByTier) return null

  const total = Object.values(usersByTier).reduce((sum, count) => sum + count, 0)

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">用户等级分布</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TIERS.map((tier) => {
            const count = usersByTier[tier.key] || 0
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0'
            return (
              <div key={tier.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${tier.color}`} />
                  <span className="text-sm text-muted-foreground">{tier.label}</span>
                </div>
                <div className="text-2xl font-bold">{formatNumber(count)}</div>
                <div className="text-xs text-muted-foreground">{percentage}%</div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
