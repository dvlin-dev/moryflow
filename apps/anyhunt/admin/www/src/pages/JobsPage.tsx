/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Jobs 页面 - 任务列表（Lucide icons direct render）
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Zap } from 'lucide-react';
import { PageHeader } from '@moryflow/ui';
import {
  Input,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui';
import {
  JOB_STATUS_OPTIONS,
  JobsListContent,
  type JobsContentState,
  useJobs,
  useJobStats,
} from '@/features/jobs';
import type { JobListItem, JobStatus, JobsQuery } from '@/features/jobs';
import { formatMs } from '@/lib/job-utils';
import { usePagedSearchQuery } from '@/lib/usePagedSearchQuery';

function resolveJobsContentState(params: {
  isLoading: boolean;
  hasError: boolean;
  itemCount: number;
}): JobsContentState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.hasError) {
    return 'error';
  }

  if (params.itemCount > 0) {
    return 'ready';
  }

  return 'empty';
}

export default function JobsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');

  const {
    query,
    searchInput,
    setSearchInput,
    handleSearch,
    handleSearchKeyDown,
    handlePageChange,
    setQueryFilter,
  } = usePagedSearchQuery<JobsQuery>({
    initialQuery: { page: 1, limit: 20 },
  });

  const { data, isLoading, isError, error } = useJobs(query);
  const { data: stats } = useJobStats();

  const handleStatusChange = (value: string) => {
    const status = value as JobStatus | 'all';
    setStatusFilter(status);
    setQueryFilter('status', status === 'all' ? undefined : status);
  };

  const handleRowClick = (job: JobListItem) => {
    navigate(`/jobs/${job.id}`);
  };

  const jobsContentState = resolveJobsContentState({
    isLoading,
    hasError: isError,
    itemCount: data?.items.length ?? 0,
  });

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
                  {JOB_STATUS_OPTIONS.map((opt) => (
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
                onKeyDown={handleSearchKeyDown}
                className="w-64"
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <JobsListContent
            state={jobsContentState}
            data={data}
            errorMessage={error instanceof Error ? error.message : undefined}
            onRowClick={handleRowClick}
            onViewDetail={handleRowClick}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
