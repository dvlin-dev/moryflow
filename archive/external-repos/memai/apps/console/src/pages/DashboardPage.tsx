/**
 * Memai Dashboard 页面
 * 显示配额使用、API 统计和快速入门
 */
import { PageHeader } from '@memai/ui/composed'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Progress,
  Button,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@memai/ui/primitives'
import { Brain, Key, Book, ExternalLink, Database, Activity } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { useProfile } from '@/features/settings'
import { useStatsOverview, useDailyUsage } from '@/features/stats'

const chartConfig = {
  memories: {
    label: 'Memories',
    color: 'hsl(var(--chart-1))',
  },
  apiCalls: {
    label: 'API Calls',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig

export default function DashboardPage() {
  const { data: profile, isLoading } = useProfile()
  const { data: statsOverview, isLoading: statsLoading } = useStatsOverview()
  const { data: dailyUsage, isLoading: chartLoading } = useDailyUsage(14)

  const quota = profile?.quota ?? {
    monthlyLimit: 0,
    monthlyUsed: 0,
    monthlyRemaining: 0,
    purchasedQuota: 0,
    periodEndAt: new Date().toISOString(),
  }

  const usagePercent = quota.monthlyLimit > 0 ? (quota.monthlyUsed / quota.monthlyLimit) * 100 : 0

  // Format date for chart x-axis
  const chartData = dailyUsage?.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  })) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome to Memai Semantic Memory API"
      />

      {/* Stats Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Total Memories
            </CardDescription>
            <CardTitle className="text-2xl">
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                statsOverview?.totalMemories.toLocaleString() ?? 0
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? (
                <Skeleton className="h-3 w-24" />
              ) : (
                `+${statsOverview?.thisMonthMemories ?? 0} this month`
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total API Calls
            </CardDescription>
            <CardTitle className="text-2xl">
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                statsOverview?.totalApiCalls.toLocaleString() ?? 0
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? (
                <Skeleton className="h-3 w-24" />
              ) : (
                `+${statsOverview?.thisMonthApiCalls ?? 0} this month`
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Monthly Quota
            </CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                `${quota.monthlyRemaining} / ${quota.monthlyLimit}`
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-2 w-full" />
            ) : (
              <Progress value={usagePercent} className="h-2" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Purchased Quota</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? <Skeleton className="h-8 w-16" /> : quota.purchasedQuota}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Pay-as-you-go, never expires
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Trend</CardTitle>
          <CardDescription>Daily API usage over the past 14 days</CardDescription>
        </CardHeader>
        <CardContent>
          {chartLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Skeleton className="h-[250px] w-full" />
            </div>
          ) : chartData.length === 0 || chartData.every((d) => d.memories === 0 && d.apiCalls === 0) ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No usage data yet</p>
                <p className="text-sm mt-1">Start using the API to see your usage trends</p>
              </div>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillMemories" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-memories)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-memories)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillApiCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-apiCalls)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-apiCalls)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `${value}`}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  type="monotone"
                  dataKey="memories"
                  stroke="var(--color-memories)"
                  fill="url(#fillMemories)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="apiCalls"
                  stroke="var(--color-apiCalls)"
                  fill="url(#fillApiCalls)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>Get started with Memai API in minutes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4 p-4 border rounded-none">
            <div className="p-2">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">1. Create API Key</h4>
              <p className="text-sm text-muted-foreground">
                Create a key on the API Keys page to authenticate your API requests
              </p>
              <Button variant="link" className="px-0 h-auto mt-1" asChild>
                <a href="/api-keys">Create now →</a>
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 border rounded-none">
            <div className="p-2">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">2. Call Memory API</h4>
              <p className="text-sm text-muted-foreground">
                Store and search memories using your API Key
              </p>
              <pre className="mt-2 p-3 bg-muted rounded-none text-xs overflow-x-auto">
{`curl -X POST https://server.memai.dev/v1/memories \\
  -H "X-API-Key: mm_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "User prefers dark mode"}'`}
              </pre>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 border rounded-none">
            <div className="p-2">
              <Book className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">3. Read Documentation</h4>
              <p className="text-sm text-muted-foreground">
                Learn about all available parameters and advanced features
              </p>
              <Button variant="link" className="px-0 h-auto mt-1" asChild>
                <a href="https://docs.memai.dev" target="_blank" rel="noopener noreferrer">
                  View docs <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
