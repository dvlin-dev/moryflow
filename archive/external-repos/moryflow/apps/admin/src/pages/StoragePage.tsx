/**
 * 云同步管理页面
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, SimplePagination } from '@/components/shared'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import {
  useStorageStats,
  useVaultList,
  useVaultDetail,
  useDeleteVault,
  DEFAULT_PAGE_SIZE,
  StorageStatsCards,
  VaultListTable,
  VaultDetailDialog,
  DeleteVaultDialog,
} from '@/features/storage'
import type { VaultListItem } from '@/types/storage'

export default function StoragePage() {
  // URL 参数
  const [searchParams, setSearchParams] = useSearchParams()
  const urlUserId = searchParams.get('userId')

  // 状态
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [userId, setUserId] = useState<string | undefined>(urlUserId ?? undefined)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedVault, setSelectedVault] = useState<VaultListItem | null>(null)

  // 同步 URL 参数到状态
  useEffect(() => {
    if (urlUserId) {
      setUserId(urlUserId)
    }
  }, [urlUserId])

  // 清除用户筛选
  const clearUserFilter = () => {
    setUserId(undefined)
    setSearchParams({})
    setPage(1)
  }

  // 数据查询
  const { data: stats, isLoading: statsLoading } = useStorageStats()
  const { data: vaultData, isLoading: vaultLoading } = useVaultList({
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    search: search || undefined,
    userId,
  })
  const { data: vaultDetail, isLoading: detailLoading } = useVaultDetail(
    detailOpen ? selectedVault?.id ?? null : null
  )
  const deleteMutation = useDeleteVault()

  const vaults = vaultData?.vaults ?? []
  const total = vaultData?.total ?? 0
  const totalPages = Math.ceil(total / DEFAULT_PAGE_SIZE)

  // 搜索处理
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  // 查看详情
  const handleViewDetail = (vault: VaultListItem) => {
    setSelectedVault(vault)
    setDetailOpen(true)
  }

  // 删除
  const handleDelete = (vault: VaultListItem) => {
    setSelectedVault(vault)
    setDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (selectedVault) {
      deleteMutation.mutate(selectedVault.id, {
        onSuccess: () => {
          setDeleteOpen(false)
          setDetailOpen(false)
          setSelectedVault(null)
        },
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="云同步管理" description="管理用户的 Vault 和存储" />

      {/* 统计卡片 */}
      <StorageStatsCards data={stats} isLoading={statsLoading} />

      {/* 筛选提示 */}
      {userId && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            当前筛选：用户 ID <code className="px-1 bg-background rounded">{userId}</code>
          </span>
          <Button variant="ghost" size="sm" onClick={clearUserFilter}>
            <X className="h-4 w-4 mr-1" />
            清除筛选
          </Button>
        </div>
      )}

      {/* 搜索栏 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索用户邮箱或 Vault 名称..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
      </form>

      {/* Vault 列表 */}
      <div className="rounded-md border">
        <VaultListTable
          vaults={vaults}
          isLoading={vaultLoading}
          onViewDetail={handleViewDetail}
          onDelete={handleDelete}
        />
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <SimplePagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Vault 详情弹窗 */}
      <VaultDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        data={vaultDetail ?? null}
        isLoading={detailLoading}
        onDelete={() => {
          setDetailOpen(false)
          setDeleteOpen(true)
        }}
      />

      {/* 删除确认弹窗 */}
      <DeleteVaultDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        vault={selectedVault}
        onConfirm={confirmDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  )
}
