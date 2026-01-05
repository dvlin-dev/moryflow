/**
 * Agent 追踪概览页面
 * 显示 Agent 执行统计和最近执行记录
 */

import { useState } from 'react'
import { PageHeader, SimplePagination } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { usePagination } from '@/hooks'
import {
  useAgentTraceStats,
  useAgentTraces,
  StatsCards,
  TraceTable,
  TraceDetailSheet,
} from '@/features/agent-traces'
import type { AgentTrace, TraceStatus } from '@/features/agent-traces'

const PAGE_SIZE = 20

const STATUS_OPTIONS: Array<{ value: TraceStatus | ''; label: string }> = [
  { value: '', label: '全部状态' },
  { value: 'completed', label: '完成' },
  { value: 'failed', label: '失败' },
  { value: 'pending', label: '进行中' },
  { value: 'interrupted', label: '中断' },
]

const DAYS_OPTIONS = [
  { value: '7', label: '最近 7 天' },
  { value: '14', label: '最近 14 天' },
  { value: '30', label: '最近 30 天' },
]

export default function AgentTracesPage() {
  // 筛选状态
  const [days, setDays] = useState('7')
  const [agentName, setAgentName] = useState('')
  const [status, setStatus] = useState<TraceStatus | ''>('')

  // 分页
  const { page, setPage, getTotalPages } = usePagination({ pageSize: PAGE_SIZE })

  // 详情抽屉
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null)

  // 数据查询
  const { data: stats, isLoading: statsLoading } = useAgentTraceStats({
    days: parseInt(days),
  })

  const { data: tracesData, isLoading: tracesLoading } = useAgentTraces({
    agentName: agentName || undefined,
    status: status || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  })

  const traces = tracesData?.traces ?? []
  const totalPages = getTotalPages(tracesData?.pagination.total ?? 0)

  const handleViewDetail = (trace: AgentTrace) => {
    setSelectedTraceId(trace.traceId)
  }

  const clearFilters = () => {
    setAgentName('')
    setStatus('')
    setPage(1)
  }

  const hasFilters = agentName || status

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent 追踪"
        description="监控 Agent 执行链路和 Tool 调用情况"
        action={
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* 统计卡片 */}
      <StatsCards data={stats} isLoading={statsLoading} />

      {/* 筛选条件 */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索 Agent 名称..."
            value={agentName}
            onChange={(e) => {
              setAgentName(e.target.value)
              setPage(1)
            }}
            className="w-48"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as TraceStatus | '')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value || 'all'}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            清除筛选
          </Button>
        )}
      </div>

      {/* Trace 列表 */}
      <TraceTable
        traces={traces}
        isLoading={tracesLoading}
        onViewDetail={handleViewDetail}
      />

      {/* 分页 */}
      {traces.length > 0 && (
        <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Trace 详情抽屉 */}
      <TraceDetailSheet
        traceId={selectedTraceId}
        open={!!selectedTraceId}
        onOpenChange={(open) => !open && setSelectedTraceId(null)}
      />
    </div>
  )
}
