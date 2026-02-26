/**
 * 活动日志页面
 */
import { useState } from 'react';
import { PageHeader, TableSkeleton, SimplePagination } from '@/components/shared';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePagination } from '@/hooks';
import {
  useActivityLogs,
  useExportActivityLogs,
  resolveActivityLogsListViewState,
  LOG_CATEGORY_CONFIG,
  LogCategoryBadge,
  LogLevelBadge,
  LogDetailDialog,
} from '@/features/admin-logs';
import { formatDateTime } from '@/lib/format';
import type { ActivityLog } from '@/types/api';
import { X, Download, File, Search, View } from 'lucide-react';

const PAGE_SIZE = 50;

const LOG_TABLE_COLUMNS = [
  { width: 'w-32' },
  { width: 'w-40' },
  { width: 'w-20' },
  { width: 'w-24' },
  { width: 'w-20' },
  { width: 'w-16' },
];

function getEmptyLogsMessage(hasFilters: boolean): string {
  if (hasFilters) {
    return '没有符合条件的日志';
  }
  return '暂无活动日志';
}

export default function LogsPage() {
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<string>('');
  const [level, setLevel] = useState<string>('');

  const { page, setPage, getTotalPages } = usePagination({ pageSize: PAGE_SIZE });
  const exportMutation = useExportActivityLogs();

  const {
    data,
    isLoading,
    error,
  } = useActivityLogs({
    page,
    pageSize: PAGE_SIZE,
    email: email || undefined,
    category: category || undefined,
    level: level as 'info' | 'warn' | 'error' | undefined,
  });

  const logs = data?.logs || [];
  const hasFilters = email || category || level;
  const totalPages = getTotalPages(data?.pagination.total || 0);
  const listViewState = resolveActivityLogsListViewState({
    isLoading,
    error,
    count: logs.length,
  });

  const handleExport = (format: 'csv' | 'json') => {
    exportMutation.mutate({
      format,
      email: email || undefined,
      category: category || undefined,
      level: level as 'info' | 'warn' | 'error' | undefined,
    });
  };

  const clearFilters = () => {
    setEmail('');
    setCategory('');
    setLevel('');
    setPage(1);
  };

  const renderRowsByState = () => {
    switch (listViewState) {
      case 'loading':
        return <TableSkeleton columns={LOG_TABLE_COLUMNS} rows={10} />;
      case 'error':
        return (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-12 text-destructive">
              活动日志加载失败，请稍后重试
            </TableCell>
          </TableRow>
        );
      case 'empty':
        return (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-12">
              <File className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{getEmptyLogsMessage(Boolean(hasFilters))}</p>
            </TableCell>
          </TableRow>
        );
      case 'ready':
        return logs.map((log) => (
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
              <LogCategoryBadge category={log.category} />
            </TableCell>
            <TableCell>
              <span className="font-mono text-sm">{log.action}</span>
            </TableCell>
            <TableCell>
              <LogLevelBadge level={log.level} />
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                <View className="h-4 w-4 mr-1" />
                详情
              </Button>
            </TableCell>
          </TableRow>
        ));
      default:
        return null;
    }
  };

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

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索邮箱..."
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setPage(1);
            }}
            className="w-48"
          />
        </div>
        <Select
          value={category || 'all'}
          onValueChange={(v) => {
            setCategory(v === 'all' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {Object.entries(LOG_CATEGORY_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={level || 'all'}
          onValueChange={(v) => {
            setLevel(v === 'all' ? '' : v);
            setPage(1);
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
          <TableBody>{renderRowsByState()}</TableBody>
        </Table>
      </div>

      {listViewState === 'ready' && (
        <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <LogDetailDialog
        log={selectedLog}
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      />
    </div>
  );
}
