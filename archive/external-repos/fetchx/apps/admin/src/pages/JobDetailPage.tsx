/**
 * Job Detail 页面
 * 任务详情
 */
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@aiget/ui/composed';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
  Button,
} from '@aiget/ui/primitives';
import { ArrowLeft, Clock, User, Key, ExternalLink, Image } from 'lucide-react';
import { useJob } from '@/features/jobs';
import type { JobTiming } from '@/features/jobs';
import { formatMs, getStatusBadge } from '@/lib/job-utils';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
}

/** 耗时分解条形图 */
function TimingBreakdown({ timing }: { timing: JobTiming }) {
  const items = [
    { label: '排队等待', value: timing.queueWait, color: 'bg-gray-400' },
    { label: '页面加载', value: timing.fetch, color: 'bg-blue-500' },
    { label: '页面渲染', value: timing.render, color: 'bg-green-500' },
    { label: '内容转换', value: timing.transform, color: 'bg-yellow-500' },
    { label: '截图捕获', value: timing.screenshot, color: 'bg-purple-500' },
    { label: '图片处理', value: timing.imageProcess, color: 'bg-pink-500' },
    { label: '文件上传', value: timing.upload, color: 'bg-orange-500' },
  ].filter((item) => item.value !== null && item.value > 0);

  const total = items.reduce((sum, item) => sum + (item.value ?? 0), 0);
  if (total === 0) return <p className="text-muted-foreground">暂无耗时数据</p>;

  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="flex h-6 overflow-hidden rounded-md">
        {items.map((item, i) => (
          <div
            key={i}
            className={`${item.color} transition-all`}
            style={{ width: `${((item.value ?? 0) / total) * 100}%` }}
            title={`${item.label}: ${formatMs(item.value)}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded ${item.color}`} />
            <span>
              {item.label}: {formatMs(item.value)}
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="text-sm font-medium">总耗时: {formatMs(timing.total)}</div>
    </div>
  );
}

/** JSON 显示组件 */
function JsonDisplay({ data, maxHeight = 300 }: { data: unknown; maxHeight?: number }) {
  if (!data) return <p className="text-muted-foreground">无数据</p>;

  return (
    <div className="overflow-x-auto">
      <pre
        className="min-w-0 overflow-auto rounded-md bg-muted p-4 text-xs"
        style={{ maxHeight }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading, error } = useJob(id ?? '');

  if (isLoading) {
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

  if (error || !job) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <div className="py-12 text-center">
          <p className="text-destructive">任务不存在或加载失败</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <PageHeader title="任务详情" description={job.id} />
      </div>

      {/* Status & Meta */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {getStatusBadge(job.status)}
              {job.fromCache && (
                <Badge variant="outline">缓存命中</Badge>
              )}
              {job.quotaDeducted && (
                <Badge variant="secondary">已扣配额</Badge>
              )}
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

      {/* URL */}
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
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground break-all">
            Hash: {job.requestHash}
          </p>
        </CardContent>
      </Card>

      {/* Error (if failed) */}
      {job.status === 'FAILED' && job.error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-destructive">
              错误信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="destructive" className="mb-2">
              {job.errorCode}
            </Badge>
            <p className="text-sm">{job.error}</p>
          </CardContent>
        </Card>
      )}

      {/* Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            耗时分解
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TimingBreakdown timing={job.timing} />
        </CardContent>
      </Card>

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">时间线</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">创建时间</p>
              <p className="font-mono text-sm">{formatDate(job.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">更新时间</p>
              <p className="font-mono text-sm">{formatDate(job.updatedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">完成时间</p>
              <p className="font-mono text-sm">{formatDate(job.completedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Screenshot */}
      {job.screenshot && (
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
                  onClick={() => window.open(job.screenshot!.url, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
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
      )}

      {/* Request Options */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sm font-medium">请求参数</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <JsonDisplay data={job.options} />
        </CardContent>
      </Card>

      {/* Result */}
      {job.result && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm font-medium">响应结果</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <JsonDisplay data={job.result} maxHeight={500} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
