/**
 * 失败 Tool 列表页面
 * 显示所有失败的 Tool 调用记录
 */

import { useState } from 'react';
import { PageHeader, SimplePagination } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search } from 'lucide-react';
import { usePagination } from '@/hooks';
import { useFailedTools, FailedToolTable, SpanDetailDialog } from '@/features/agent-traces';
import type { AgentSpan } from '@/features/agent-traces';

const PAGE_SIZE = 50;

export default function AgentTracesFailedPage() {
  // 筛选状态
  const [toolName, setToolName] = useState('');
  const [agentName, setAgentName] = useState('');

  // 分页
  const { page, setPage, getTotalPages } = usePagination({ pageSize: PAGE_SIZE });

  // 详情对话框
  const [selectedSpan, setSelectedSpan] = useState<AgentSpan | null>(null);

  // 数据查询
  const { data, isLoading, error } = useFailedTools({
    toolName: toolName || undefined,
    agentName: agentName || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const spans = data?.spans ?? [];
  const totalPages = getTotalPages(data?.pagination.total ?? 0);

  const handleViewDetail = (span: AgentSpan) => {
    setSelectedSpan(span);
  };

  const clearFilters = () => {
    setToolName('');
    setAgentName('');
    setPage(1);
  };

  const hasFilters = toolName || agentName;

  return (
    <div className="space-y-6">
      <PageHeader title="失败记录" description="查看 Tool 执行失败的详细信息" />

      {/* 筛选条件 */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索 Tool 名称..."
            value={toolName}
            onChange={(e) => {
              setToolName(e.target.value);
              setPage(1);
            }}
            className="w-48"
          />
        </div>
        <Input
          placeholder="搜索 Agent 名称..."
          value={agentName}
          onChange={(e) => {
            setAgentName(e.target.value);
            setPage(1);
          }}
          className="w-48"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            清除筛选
          </Button>
        )}
      </div>

      {/* 失败 Tool 列表 */}
      <FailedToolTable
        spans={spans}
        isLoading={isLoading}
        error={error}
        onViewDetail={handleViewDetail}
      />

      {/* 分页 */}
      {spans.length > 0 && (
        <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Span 详情对话框 */}
      <SpanDetailDialog
        span={selectedSpan}
        open={!!selectedSpan}
        onOpenChange={(open) => !open && setSelectedSpan(null)}
      />
    </div>
  );
}
