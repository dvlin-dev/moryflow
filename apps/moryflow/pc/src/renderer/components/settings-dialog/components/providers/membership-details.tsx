import { Badge } from '@anyhunt/ui/components/badge'
import { ScrollArea } from '@anyhunt/ui/components/scroll-area'
import { Crown, Sparkles, Zap, Info, Lock } from 'lucide-react'
import { useAuth, TIER_DISPLAY_NAMES, type MembershipModel } from '@/lib/server'
import { Skeleton } from '@anyhunt/ui/components/skeleton'
import { cn } from '@/lib/utils'

/**
 * 会员模型详情面板
 * 展示会员可用的模型列表（只读展示，无配置）
 * 模型数据从 AuthContext 缓存中获取，避免重复请求
 */
export const MembershipDetails = () => {
  const { user, isAuthenticated, models, modelsLoading: isLoading } = useAuth()

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <Crown className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">登录后可使用会员模型</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* 头部信息 */}
      <div className="shrink-0 border-b p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">会员模型</h3>
            <p className="text-xs text-muted-foreground">
              {user.tierInfo.displayName} · {user.credits.total} 积分可用
            </p>
          </div>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="shrink-0 border-b bg-muted/30 px-4 py-3">
        <div className="flex gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" />
          <p>会员模型由平台提供，使用时消耗积分，无需配置 API Key</p>
        </div>
      </div>

      {/* 模型列表 */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <ModelList models={models} userTier={user.tier} />
          )}
        </div>
      </ScrollArea>

      {/* 底部积分信息 */}
      <div className="shrink-0 border-t bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">当前积分余额</span>
          <div className="flex items-center gap-4">
            <span>
              每日: <strong>{user.credits.daily}</strong>
            </span>
            <span>
              订阅: <strong>{user.credits.subscription}</strong>
            </span>
            <span>
              购买: <strong>{user.credits.purchased}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 模型列表组件 */
const ModelList = ({ models, userTier }: { models: MembershipModel[]; userTier: string }) => {
  // 分组：可用 vs 需要升级
  const availableModels = models.filter((m) => m.available)
  const lockedModels = models.filter((m) => !m.available)

  if (models.length === 0) {
    return (
      <div className="py-12 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">暂无会员模型</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 可用模型 */}
      {availableModels.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Zap className="h-4 w-4 text-primary" />
            <span>可用模型</span>
            {availableModels.length > 1 && (
              <Badge variant="secondary" className="text-xs">{availableModels.length}</Badge>
            )}
          </div>
          <div className="space-y-2">
            {availableModels.map((model) => (
              <ModelItem key={model.id} model={model} />
            ))}
          </div>
        </div>
      )}

      {/* 需要升级的模型 */}
      {lockedModels.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>升级后可用</span>
            {lockedModels.length > 1 && (
              <Badge variant="outline" className="text-xs">{lockedModels.length}</Badge>
            )}
          </div>
          <div className="space-y-2 opacity-60">
            {lockedModels.map((model) => (
              <ModelItem key={model.id} model={model} locked />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** 单个模型卡片 */
const ModelItem = ({ model, locked }: { model: MembershipModel; locked?: boolean }) => {
  const tierName = TIER_DISPLAY_NAMES[model.minTier as keyof typeof TIER_DISPLAY_NAMES] || model.minTier

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-3 transition-colors',
        locked ? 'border-dashed' : 'hover:bg-accent/30'
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn('font-medium truncate', locked && 'text-muted-foreground')}>
          {model.name}
        </span>
        {locked ? (
          <Badge variant="outline" className="shrink-0 text-xs">
            <Lock className="mr-1 h-3 w-3" />
            {tierName}
          </Badge>
        ) : (
          <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary text-xs">
            <Zap className="mr-1 h-3 w-3" />
            可用
          </Badge>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline" className="text-xs font-normal">
          {model.ownedBy}
        </Badge>
        {!locked && (
          <Badge variant="outline" className="text-xs font-normal">
            {tierName}
          </Badge>
        )}
      </div>
    </div>
  )
}
