/**
 * 用户列表表格
 */
import { Link } from 'react-router-dom'
import { View, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TableSkeleton, TierBadge } from '@/components/shared'
import { formatDate, formatNumber } from '@/lib/format'
import type { User } from '@/types/api'

const USER_TABLE_COLUMNS = [
  { width: 'w-24' },
  { width: 'w-40' },
  { width: 'w-16' },
  { width: 'w-16' },
  { width: 'w-8' },
  { width: 'w-24' },
  { width: 'w-24' },
  { width: 'w-20' },
]

type UsersTableViewState = 'loading' | 'error' | 'empty' | 'ready'

const resolveUsersTableViewState = ({
  isLoading,
  isError,
  hasUsers,
}: {
  isLoading: boolean
  isError: boolean
  hasUsers: boolean
}): UsersTableViewState => {
  if (isLoading) return 'loading'
  if (isError) return 'error'
  if (!hasUsers) return 'empty'
  return 'ready'
}

const renderAdminState = (isAdmin: boolean) => {
  if (isAdmin) {
    return <span className="text-green-600">是</span>
  }

  return <span className="text-muted-foreground">否</span>
}

const renderUserStatus = (deletedAt: string | null | undefined) => {
  if (deletedAt) {
    return (
      <span className="text-red-500 text-xs">
        已删除 ({formatDate(deletedAt)})
      </span>
    )
  }

  return <span className="text-green-600 text-xs">活跃</span>
}

interface UsersTableProps {
  users: User[]
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  onRetry: () => void
  onOpenTierDialog: (user: User) => void
}

export function UsersTable({
  users,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onOpenTierDialog,
}: UsersTableProps) {
  const viewState = resolveUsersTableViewState({
    isLoading,
    isError,
    hasUsers: users.length > 0,
  })

  const renderRowsByState = () => {
    switch (viewState) {
      case 'loading':
        return <TableSkeleton columns={USER_TABLE_COLUMNS} />
      case 'error':
        return (
          <TableRow>
            <TableCell colSpan={8} className="py-10 text-center">
              <div className="space-y-2">
                <p className="text-sm text-destructive">{errorMessage ?? '用户列表加载失败'}</p>
                <Button variant="outline" size="sm" onClick={onRetry}>
                  重试
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )
      case 'empty':
        return (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
              暂无用户数据
            </TableCell>
          </TableRow>
        )
      case 'ready':
        return users.map((user) => (
          <TableRow key={user.id} className={user.deletedAt ? 'opacity-60' : ''}>
            <TableCell className="font-mono text-xs">{user.id}</TableCell>
            <TableCell className={user.deletedAt ? 'line-through' : ''}>{user.email}</TableCell>
            <TableCell>
              <TierBadge tier={user.subscriptionTier} />
            </TableCell>
            <TableCell>
              <span className="font-medium">{formatNumber(user.credits)}</span>
            </TableCell>
            <TableCell>{renderAdminState(user.isAdmin)}</TableCell>
            <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
            <TableCell>{renderUserStatus(user.deletedAt)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/users/${user.id}`}>
                    <View className="h-4 w-4 mr-1" />
                    详情
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenTierDialog(user)}
                  disabled={Boolean(user.deletedAt)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  等级
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))
    }
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>用户 ID</TableHead>
            <TableHead>邮箱</TableHead>
            <TableHead>等级</TableHead>
            <TableHead>剩余积分</TableHead>
            <TableHead>管理员</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{renderRowsByState()}</TableBody>
      </Table>
    </div>
  )
}
