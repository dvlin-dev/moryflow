/**
 * 用户详情页面
 */
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader, TierBadge } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, formatNumber } from '@/lib/format'
import { useUserDetail, useGrantCredits, GrantCreditsDialog } from '@/features/users'
import type { CreditType } from '@/types/api'
import { UserStorageCard } from '@/features/storage'
import { ArrowLeft, CreditCard, Trash2, User } from 'lucide-react'

/** 删除原因映射 */
const DELETION_REASON_LABELS: Record<string, string> = {
  not_useful: '功能不符合需求',
  privacy: '隐私顾虑',
  switching: '切换到其他服务',
  too_expensive: '价格太贵',
  other: '其他原因',
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showGrantDialog, setShowGrantDialog] = useState(false)

  const { data, isLoading } = useUserDetail(id)
  const grantCreditsMutation = useGrantCredits()

  const handleGrantCredits = (formData: {
    type: CreditType
    amount: number
    reason?: string
  }) => {
    if (!id) return
    grantCreditsMutation.mutate(
      { userId: id, ...formData },
      { onSuccess: () => setShowGrantDialog(false) }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">用户不存在</p>
        <Button variant="link" onClick={() => navigate('/users')}>
          返回用户列表
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="用户详情"
        description={data.user.email}
        action={
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/users')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回列表
            </Button>
            <Button onClick={() => setShowGrantDialog(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              发放积分
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">用户 ID</p>
                <p className="font-mono text-sm mt-1 break-all">{data.user.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">邮箱</p>
                <p className="mt-1">{data.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">等级</p>
                <div className="mt-1">
                  <TierBadge tier={data.user.tier} />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">管理员</p>
                <p className="mt-1">
                  {data.user.isAdmin ? (
                    <span className="text-green-600">是</span>
                  ) : (
                    <span className="text-muted-foreground">否</span>
                  )}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">创建时间</p>
                <p className="mt-1">{formatDateTime(data.user.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 积分余额 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              积分余额
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">订阅积分</p>
                <p className="text-2xl font-bold mt-1">
                  {formatNumber(data.credits.subscription)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">购买积分</p>
                <p className="text-2xl font-bold mt-1">
                  {formatNumber(data.credits.purchased)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总计</p>
                <p className="text-2xl font-bold mt-1 text-primary">
                  {formatNumber(data.credits.total)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 删除信息（仅已删除用户显示） */}
      {data.user.deletedAt && data.deletionRecord && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-red-700">
              <Trash2 className="h-4 w-4" />
              账户已删除
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">删除时间</p>
                <p className="mt-1">{formatDateTime(data.deletionRecord.deletedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">删除原因</p>
                <p className="mt-1">
                  {DELETION_REASON_LABELS[data.deletionRecord.reason] || data.deletionRecord.reason}
                </p>
              </div>
              {data.deletionRecord.feedback && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">用户反馈</p>
                  <p className="mt-1 text-sm bg-white/50 rounded p-2">
                    {data.deletionRecord.feedback}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 云存储 */}
      <UserStorageCard userId={data.user.id} />

      {/* 发放积分对话框 */}
      <GrantCreditsDialog
        open={showGrantDialog}
        onOpenChange={setShowGrantDialog}
        onSubmit={handleGrantCredits}
        isLoading={grantCreditsMutation.isPending}
      />
    </div>
  )
}
