/**
 * Admin Dashboard - 系统统计概览
 */
import { useDashboardStats, useChartData } from '@/features/dashboard';
import {
  Skeleton,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@memai/ui/primitives';
import { Users, CreditCard, Database, DollarSign } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { ChartConfig } from '@memai/ui/primitives';
import {
  formatNumber,
  formatCurrency,
  formatShortDate,
} from '@/lib/formatters';

const memoryChartConfig: ChartConfig = {
  value: {
    label: 'Memories',
    color: 'hsl(221, 83%, 53%)', // blue-600
  },
};

const revenueChartConfig: ChartConfig = {
  value: {
    label: 'Revenue',
    color: 'hsl(142, 71%, 45%)', // green-500
  },
};

export default function DashboardPage() {
  const { data: statsData, isLoading: statsLoading } = useDashboardStats();
  const { data: chartData, isLoading: chartLoading } = useChartData();

  const stats = [
    {
      label: 'Total Users',
      value: statsData?.totalUsers ?? 0,
      format: formatNumber,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Active Subscriptions',
      value: statsData?.activeSubscriptions ?? 0,
      format: formatNumber,
      icon: CreditCard,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Memories Today',
      value: statsData?.memoriesToday ?? 0,
      format: formatNumber,
      icon: Database,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      label: 'Revenue (MTD)',
      value: statsData?.revenueMTD ?? 0,
      format: formatCurrency,
      icon: DollarSign,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">System overview and statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-none border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <div className={`p-2 rounded-none ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            {statsLoading ? (
              <Skeleton className="mt-2 h-9 w-24" />
            ) : (
              <p className="mt-2 text-3xl font-bold">{stat.format(stat.value)}</p>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Memories Chart */}
        <div className="rounded-none border border-border bg-card p-6">
          <h3 className="font-semibold">Memories Over Time</h3>
          <p className="text-sm text-muted-foreground">Last 7 days</p>
          {chartLoading ? (
            <Skeleton className="mt-4 h-64 w-full" />
          ) : (
            <ChartContainer config={memoryChartConfig} className="mt-4 h-64">
              <AreaChart data={chartData?.memories ?? []}>
                <defs>
                  <linearGradient id="fillMemories" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => formatShortDate(value as string)}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  fill="url(#fillMemories)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>

        {/* Revenue Chart */}
        <div className="rounded-none border border-border bg-card p-6">
          <h3 className="font-semibold">Revenue Over Time</h3>
          <p className="text-sm text-muted-foreground">Last 7 days</p>
          {chartLoading ? (
            <Skeleton className="mt-4 h-64 w-full" />
          ) : (
            <ChartContainer config={revenueChartConfig} className="mt-4 h-64">
              <BarChart data={chartData?.revenue ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => formatShortDate(value as string)}
                      formatter={(value) => formatCurrency(value as number)}
                    />
                  }
                />
                <Bar
                  dataKey="value"
                  fill="var(--color-value)"
                  radius={0}
                />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </div>
    </div>
  );
}
