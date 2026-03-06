/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Job Detail 页面 - 任务详情（状态片段化 + 详情卡片装配）
 */

import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Clock, Image, Key, User } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  Skeleton,
} from '@moryflow/ui';
import { ListErrorState } from '@/components/list-state';
import {
  formatJobDateTime,
  JobJsonDisplay,
  JobTimingBreakdown,
  useJob,
  type JobDetail,
} from '@/features/jobs';
import { getStatusBadge } from '@/lib/job-utils';

type JobDetailContentState = 'loading' | 'error' | 'ready';

function resolveJobDetailContentState(params: {
  isLoading: boolean;
  hasError: boolean;
  hasJob: boolean;
}): JobDetailContentState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.hasError || !params.hasJob) {
    return 'error';
  }

  return 'ready';
}

function JobDetailLoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

function JobDetailErrorState({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回
      </Button>
      <ListErrorState message="任务不存在或加载失败" />
    </div>
  );
}

function JobDetailContent({ job, onBack }: { job: JobDetail; onBack: () => void }) {
  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <PageHeader title="任务详情" description={job.id} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {getStatusBadge(job.status)}
              {job.fromCache ? <Badge variant="outline">缓存命中</Badge> : null}
              {job.quotaDeducted ? <Badge variant="secondary">已扣配额</Badge> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              用户
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{job.user.name || job.user.email}</p>
            <p className="text-sm text-muted-foreground">{job.user.email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Key className="h-4 w-4" />
              API Key
            </CardTitle>
          </CardHeader>
          <CardContent>
            {job.apiKey ? (
              <p className="font-mono text-sm">{job.apiKey.name}</p>
            ) : (
              <p className="text-muted-foreground">Console 请求</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sm font-medium">请求 URL</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 overflow-x-auto">
              <code className="block whitespace-nowrap rounded bg-muted px-2 py-1 text-sm">
                {job.url}
              </code>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => window.open(job.url, '_blank')}
            >
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 break-all text-xs text-muted-foreground">Hash: {job.requestHash}</p>
        </CardContent>
      </Card>

      {job.status === 'FAILED' && job.error ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-destructive">错误信息</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="destructive" className="mb-2">
              {job.errorCode}
            </Badge>
            <p className="text-sm">{job.error}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            耗时分解
          </CardTitle>
        </CardHeader>
        <CardContent>
          <JobTimingBreakdown timing={job.timing} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">时间线</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">创建时间</p>
              <p className="font-mono text-sm">{formatJobDateTime(job.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">更新时间</p>
              <p className="font-mono text-sm">{formatJobDateTime(job.updatedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">完成时间</p>
              <p className="font-mono text-sm">{formatJobDateTime(job.completedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {job.screenshot ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Image className="h-4 w-4" />
              截图
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">尺寸: </span>
                  {job.screenshot.width} x {job.screenshot.height}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">格式: </span>
                  {job.screenshot.format}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">大小: </span>
                  {job.screenshot.fileSize
                    ? `${(job.screenshot.fileSize / 1024).toFixed(1)} KB`
                    : '-'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(job.screenshot?.url, '_blank')}
                >
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  查看原图
                </Button>
              </div>
              <div className="overflow-hidden rounded-md border">
                <img
                  src={job.screenshot.url}
                  alt="Screenshot"
                  className="h-auto max-h-64 w-full object-contain"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sm font-medium">请求参数</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <JobJsonDisplay data={job.options} />
        </CardContent>
      </Card>

      {job.result ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm font-medium">响应结果</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <JobJsonDisplay data={job.result} maxHeight={500} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading, error } = useJob(id ?? '');

  const state = resolveJobDetailContentState({
    isLoading,
    hasError: Boolean(error),
    hasJob: Boolean(job),
  });

  const back = () => navigate(-1);

  switch (state) {
    case 'loading':
      return <JobDetailLoadingState />;
    case 'error':
      return <JobDetailErrorState onBack={back} />;
    case 'ready':
      if (!job) {
        return null;
      }

      return <JobDetailContent job={job} onBack={back} />;
    default:
      return null;
  }
}
