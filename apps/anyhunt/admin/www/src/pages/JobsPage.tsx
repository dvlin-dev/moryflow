/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Jobs 页面 - 任务列表（Lucide icons direct render）
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Search, Zap } from 'lucide-react';
import { PageHeader, SimplePagination } from '@anyhunt/ui';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Skeleton,
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@anyhunt/ui';
import { formatRelativeTime } from '@anyhunt/ui/lib';
import { useJobs, useJobStats } from '@/features/jobs';
import type { JobsQuery, JobStatus, JobListItem } from '@/features/jobs';
import { formatMs, truncateUrl, getStatusBadge } from '@/lib/job-utils';

const STATUS_OPTIONS: { value: JobStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'PENDING', label: '等待中' },
  { value: 'PROCESSING', label: '处理中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'FAILED', label: '已失败' },
];

export default function JobsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState<JobsQuery>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');

  const { data, isLoading } = useJobs(query);
  const { data: stats } = useJobStats();

  const handleSearch = () => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      search: searchInput || undefined,
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleStatusChange = (value: string) => {
    const status = value as JobStatus | 'all';
    setStatusFilter(status);
    setQuery((prev) => ({
      ...prev,
      page: 1,
      status: status === 'all' ? undefined : status,
    }));
  };

  const handlePageChange = (page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  };

  const handleRowClick = (job: JobListItem) => {
    navigate(`/jobs/${job.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Jobs" description="查看和管理 Scrape 任务" />

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.today}</div>
              <p className="text-xs text-muted-foreground">今日任务</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pending + stats.processing}
              </div>
              <p className="text-xs text-muted-foreground">队列中</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.failedToday}</div>
              <p className="text-xs text-muted-foreground">今日失败</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-1 text-2xl font-bold">
                <Zap className="h-5 w-5 text-yellow-500" />
                {formatMs(stats.avgProcessingMs)}
              </div>
              <p className="text-xs text-muted-foreground">平均耗时</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Job List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>任务列表</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="搜索 URL..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-64"
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.items.length ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">没有找到任务</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[400px]">URL</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>耗时</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((job) => (
                    <TableRow
                      key={job.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(job)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm" title={job.url}>
                            {truncateUrl(job.url)}
                          </span>
                          {job.fromCache && (
                            <Badge variant="outline" className="text-xs">
                              缓存
                            </Badge>
                          )}
                        </div>
                        {job.error && (
                          <p className="mt-1 text-xs text-destructive line-clamp-1">
                            {job.errorCode}: {job.error}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatMs(job.totalMs)}
                        {job.queueWaitMs && job.queueWaitMs > 1000 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (排队 {formatMs(job.queueWaitMs)})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {job.userEmail}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelativeTime(job.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/jobs/${job.id}`);
                          }}
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data.pagination.totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <SimplePagination
                    page={data.pagination.page}
                    totalPages={data.pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
