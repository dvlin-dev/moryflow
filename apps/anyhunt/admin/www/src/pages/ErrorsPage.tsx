/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Errors 页面 - 错误分析（Lucide icons direct render）
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TriangleAlert, TrendingDown, ArrowUpRight, ChartPie } from 'lucide-react';
import { PageHeader } from '@anyhunt/ui';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
} from '@anyhunt/ui';
import { formatRelativeTime } from '@anyhunt/ui/lib';
import {
  PieChart as RechartsPC,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useErrorStats } from '@/features/jobs';
import { truncateUrl, ERROR_LABELS, ERROR_COLORS } from '@/lib/job-utils';

const DAYS_OPTIONS = [
  { value: '7', label: '最近 7 天' },
  { value: '14', label: '最近 14 天' },
  { value: '30', label: '最近 30 天' },
];

export default function ErrorsPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const { data, isLoading } = useErrorStats({ days });

  // Prepare chart data
  const pieData =
    data?.byCode.map((item) => ({
      name: ERROR_LABELS[item.code] || item.code,
      value: item.count,
      code: item.code,
    })) ?? [];

  const lineData =
    data?.byDay.map((item) => ({
      date: item.date.slice(5), // MM-DD
      count: item.count,
    })) ?? [];

  const totalErrors = pieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Errors" description="错误分析与趋势" />
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAYS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-red-500" />
              <span className="text-3xl font-bold text-red-600">{totalErrors}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{days} 天内总错误数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{pieData[0]?.name || '-'}</div>
            <p className="mt-1 text-sm text-muted-foreground">最常见错误类型</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{pieData.length}</div>
            <p className="mt-1 text-sm text-muted-foreground">错误类型数</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <ChartPie className="h-4 w-4" />
                错误分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <div className="flex h-64 items-center justify-center">
                  <p className="text-muted-foreground">暂无错误数据</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <RechartsPC>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={ERROR_COLORS[entry.code] || '#888'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPC>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <TrendingDown className="h-4 w-4" />
                错误趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lineData.length === 0 ? (
                <div className="flex h-64 items-center justify-center">
                  <p className="text-muted-foreground">暂无趋势数据</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="错误数"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: '#ef4444' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error by Code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">按错误码统计</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : pieData.length === 0 ? (
            <p className="text-muted-foreground">暂无数据</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {data?.byCode.map((item) => (
                <div
                  key={item.code}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded"
                      style={{ backgroundColor: ERROR_COLORS[item.code] || '#888' }}
                    />
                    <span className="text-sm font-medium">
                      {ERROR_LABELS[item.code] || item.code}
                    </span>
                  </div>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">最近错误</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.recent.length ? (
            <p className="text-muted-foreground">暂无错误记录</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">URL</TableHead>
                  <TableHead>错误码</TableHead>
                  <TableHead>错误信息</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent.map((error) => (
                  <TableRow key={error.id}>
                    <TableCell>
                      <span className="font-mono text-sm" title={error.url}>
                        {truncateUrl(error.url)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="destructive"
                        style={{
                          backgroundColor: error.errorCode
                            ? ERROR_COLORS[error.errorCode]
                            : undefined,
                        }}
                      >
                        {error.errorCode ? ERROR_LABELS[error.errorCode] || error.errorCode : '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">
                      {error.error || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {error.userEmail}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(error.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/jobs/${error.id}`)}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
