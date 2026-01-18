/**
 * [PROPS]: None
 * [EMITS]: Navigation to external docs
 * [POS]: 控制台 Dashboard（配额概览 + 快速上手）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 apps/anyhunt/console/CLAUDE.md。
 */
import {
  ArrowUpRight01Icon,
  Book01Icon,
  Camera01Icon,
  Key01Icon,
} from '@hugeicons/core-free-icons';
import { PageHeader } from '@anyhunt/ui';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Icon,
  Progress,
  Skeleton,
} from '@anyhunt/ui';
import { useProfile } from '@/features/settings';

export default function DashboardPage() {
  const { data: profile, isLoading } = useProfile();

  const quota = profile?.quota ?? {
    dailyLimit: 0,
    dailyUsed: 0,
    dailyRemaining: 0,
    dailyResetsAt: new Date().toISOString(),
    monthlyLimit: 0,
    monthlyUsed: 0,
    monthlyRemaining: 0,
    purchasedQuota: 0,
    periodEndAt: new Date().toISOString(),
  };

  const usagePercent = quota.monthlyLimit > 0 ? (quota.monthlyUsed / quota.monthlyLimit) * 100 : 0;
  const dailyUsagePercent =
    quota.dailyLimit > 0 ? ((quota.dailyUsed ?? 0) / quota.dailyLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Welcome to Anyhunt Web Screenshot API" />

      {/* 配额卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quota.dailyLimit > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Daily Credits</CardDescription>
              <CardTitle className="text-2xl">
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  `${quota.dailyRemaining} / ${quota.dailyLimit}`
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-2 w-full" />
              ) : (
                <Progress value={dailyUsagePercent} className="h-2" />
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {isLoading ? (
                  <Skeleton className="h-4 w-32" />
                ) : quota.dailyResetsAt ? (
                  `Resets at ${new Date(quota.dailyResetsAt).toLocaleTimeString('zh-CN')}`
                ) : (
                  'Resets at UTC midnight'
                )}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Monthly Quota</CardDescription>
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
              <p className="text-sm text-muted-foreground mt-2">
                {isLoading ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  `Used ${quota.monthlyUsed}, ${quota.monthlyRemaining} remaining`
                )}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Purchased Quota</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? <Skeleton className="h-8 w-16" /> : quota.purchasedQuota}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Pay-as-you-go quota, never expires</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Period Ends</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                new Date(quota.periodEndAt).toLocaleDateString('zh-CN')
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Monthly quota resets on this date</p>
          </CardContent>
        </Card>
      </div>

      {/* 快速开始 */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>Get started with Anyhunt API in minutes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <div className="p-2">
              <Icon icon={Key01Icon} className="h-5 w-5 text-primary" />
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

          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <div className="p-2">
              <Icon icon={Camera01Icon} className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">2. Call Scrape API</h4>
              <p className="text-sm text-muted-foreground">
                Make scrape requests using your API Key (supports screenshots)
              </p>
              <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                {`curl -X POST https://server.anyhunt.app/api/v1/scrape \\
  -H "Authorization: Bearer ah_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com", "formats": ["markdown", "screenshot"]}'`}
              </pre>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <div className="p-2">
              <Icon icon={Book01Icon} className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">3. Read Documentation</h4>
              <p className="text-sm text-muted-foreground">
                Learn about all available parameters and advanced features
              </p>
              <Button variant="link" className="px-0 h-auto mt-1" asChild>
                <a href="https://docs.anyhunt.app" target="_blank" rel="noopener noreferrer">
                  View docs <Icon icon={ArrowUpRight01Icon} className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
