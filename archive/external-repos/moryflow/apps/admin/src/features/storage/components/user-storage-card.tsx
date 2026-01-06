/**
 * 用户存储卡片组件
 * 在用户详情页显示存储和向量化用量
 */

import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  formatBytes,
  formatNumber,
  calculateUsagePercent,
  getUsageColorClass,
} from '../const'
import { useUserStorageDetail } from '../hooks'
import type { UserVault } from '@/types/storage'
import { HardDrive, Database, FolderOpen, ChevronRight } from 'lucide-react'

interface UserStorageCardProps {
  userId: string
}

export function UserStorageCard({ userId }: UserStorageCardProps) {
  const { data, isLoading } = useUserStorageDetail(userId)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4" />
            云存储
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4" />
            云存储
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">该用户暂无云同步数据</p>
        </CardContent>
      </Card>
    )
  }

  const { usage, vaults } = data
  const storagePercent = calculateUsagePercent(usage.storageUsed, usage.storageLimit)
  const vectorizedPercent = calculateUsagePercent(usage.vectorizedCount, usage.vectorizedLimit)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="h-4 w-4" />
          云存储
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 存储用量 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">存储用量</span>
            <span className={getUsageColorClass(storagePercent)}>
              {formatBytes(usage.storageUsed)} / {formatBytes(usage.storageLimit)}
              <span className="ml-1">({storagePercent}%)</span>
            </span>
          </div>
          <Progress value={storagePercent} className="h-2" />
        </div>

        {/* 向量化用量 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Database className="h-3 w-3" />
              向量化用量
            </span>
            <span className={getUsageColorClass(vectorizedPercent)}>
              {formatNumber(usage.vectorizedCount)} / {formatNumber(usage.vectorizedLimit)}
              <span className="ml-1">({vectorizedPercent}%)</span>
            </span>
          </div>
          <Progress value={vectorizedPercent} className="h-2" />
        </div>

        {/* Vault 列表 */}
        <div className="space-y-3">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <FolderOpen className="h-3 w-3" />
            Vault 列表 ({vaults.length})
          </div>
          {vaults.length > 0 ? (
            <div className="space-y-2">
              {vaults.map((vault: UserVault) => (
                <VaultItem key={vault.id} vault={vault} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无 Vault</p>
          )}
        </div>

        {/* 查看更多按钮 */}
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link to={`/storage?userId=${userId}`}>
            查看存储详情
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Vault 列表项
 */
function VaultItem({ vault }: { vault: UserVault }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="truncate font-medium">{vault.name}</span>
      </div>
      <div className="flex items-center gap-3 text-muted-foreground shrink-0">
        <span>{vault.fileCount} 文件</span>
        <span>{formatBytes(vault.totalSize)}</span>
      </div>
    </div>
  )
}
