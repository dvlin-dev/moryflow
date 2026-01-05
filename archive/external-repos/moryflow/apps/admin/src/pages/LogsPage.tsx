/**
 * 活动日志页面
 */
import { useState } from 'react'
import { PageHeader, TableSkeleton, SimplePagination } from '@/components/shared'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePagination } from '@/hooks'
import { formatDateTime } from '@/lib/format'
import { useActivityLogs, useExportActivityLogs } from '@/features/admin-logs'
import type { ActivityLog } from '@/types/api'
import { FileText, Eye, Download, Search, X } from 'lucide-react'

const PAGE_SIZE = 50

/** 分类配置 */
const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  auth: { label: '认证', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  ai: { label: 'AI', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  payment: { label: '支付', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  admin: { label: '管理', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  vault: { label: '知识库', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' },
  storage: { label: '存储', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
  sync: { label: '同步', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
}

/** 日志级别配置 */
const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  info: { label: 'INFO', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  warn: { label: 'WARN', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  error: { label: 'ERROR', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
}

const DEFAULT_COLOR = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'

const LOG_TABLE_COLUMNS = [
  { width: 'w-32' },
  { width: 'w-40' },
  { width: 'w-20' },
  { width: 'w-24' },
  { width: 'w-20' },
  { width: 'w-16' },
]

function CategoryBadge({ category }: { category: string }) {
  const config = CATEGORY_CONFIG[category]
  return (
    <Badge className={config?.color || DEFAULT_COLOR}>
      {config?.label || category}
    </Badge>
  )
}

function LevelBadge({ level }: { level: string }) {
  const config = LEVEL_CONFIG[level]
  return (
    <Badge className={config?.color || DEFAULT_COLOR}>
      {config?.label || level}
    </Badge>
  )
}

function LogDetailDialog({
  log,
  open,
  onOpenChange,
}: {
  log: ActivityLog | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!log) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>日志详情</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">操作时间</p>
              <p className="mt-1">{formatDateTime(log.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">分类 / 动作</p>
              <div className="mt-1 flex gap-2">
                <CategoryBadge category={log.category} />
                <Badge variant="outline">{log.action}</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">用户</p>
              <p className="mt-1">{log.userEmail}</p>
              <p className="text-xs text-muted-foreground font-mono">{log.userId}</p>
            </div>
            {log.targetUserEmail && (
              <div>
                <p className="text-sm text-muted-foreground">目标用户</p>
                <p className="mt-1">{log.targetUserEmail}</p>
                <p className="text-xs text-muted-foreground font-mono">{log.targetUserId}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">级别</p>
              <div className="mt-1">
                <LevelBadge level={log.level} />
              </div>
            </div>
            {log.duration && (
              <div>
                <p className="text-sm text-muted-foreground">耗时</p>
                <p className="mt-1">{log.duration} ms</p>
              </div>
            )}
            {log.ip && (
              <div>
                <p className="text-sm text-muted-foreground">IP</p>
                <p className="mt-1 font-mono text-sm">{log.ip}</p>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">详情</p>
            {log.details ? (
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono max-h-64 overflow-y-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            ) : (
              <p className="text-muted-foreground text-sm">无详情数据</p>
            )}
          </div>
          {log.userAgent && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">User-Agent</p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {log.userAgent}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function LogsPage() {
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState<string>('')
  const [level, setLevel] = useState<string>('')

  const { page, setPage, getTotalPages } = usePagination({ pageSize: PAGE_SIZE })
  const exportMutation = useExportActivityLogs()

  const { data, isLoading } = useActivityLogs({
    page,
    pageSize: PAGE_SIZE,
    email: email || undefined,
    category: category || undefined,
    level: level as 'info' | 'warn' | 'error' | undefined,
  })

  const logs = data?.logs || []
  const totalPages = getTotalPages(data?.pagination.total || 0)

  const handleExport = (format: 'csv' | 'json') => {
    exportMutation.mutate({
      format,
      email: email || undefined,
      category: category || undefined,
      level: level as 'info' | 'warn' | 'error' | undefined,
    })
  }

  const clearFilters = () => {
    setEmail('')
    setCategory('')
    setLevel('')
    setPage(1)
  }

  const hasFilters = email || category || level

  return (
    <div className="space-y-6">
      <PageHeader
        title="活动日志"
        description="查看所有用户活动和操作记录"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={exportMutation.isPending}
            >
              <Download className="h-4 w-4 mr-1" />
              导出 CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
              disabled={exportMutation.isPending}
            >
              <Download className="h-4 w-4 mr-1" />
              导出 JSON
            </Button>
          </div>
        }
      />

      {/* 筛选条件 */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索邮箱..."
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setPage(1)
            }}
            className="w-48"
          />
        </div>
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v === 'all' ? '' : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={level}
          onValueChange={(v) => {
            setLevel(v === 'all' ? '' : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="级别" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部级别</SelectItem>
            <SelectItem value="info">INFO</SelectItem>
            <SelectItem value="warn">WARN</SelectItem>
            <SelectItem value="error">ERROR</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            清除筛选
          </Button>
        )}
      </div>

      {/* 日志列表 */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>分类</TableHead>
              <TableHead>动作</TableHead>
              <TableHead>级别</TableHead>
              <TableHead className="text-right">详情</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton columns={LOG_TABLE_COLUMNS} rows={10} />
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="truncate max-w-40" title={log.userEmail}>
                      {log.userEmail}
                    </div>
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={log.category} />
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{log.action}</span>
                  </TableCell>
                  <TableCell>
                    <LevelBadge level={log.level} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      详情
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {hasFilters ? '没有符合条件的日志' : '暂无活动日志'}
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {logs.length > 0 && (
        <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* 日志详情对话框 */}
      <LogDetailDialog
        log={selectedLog}
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      />
    </div>
  )
}
