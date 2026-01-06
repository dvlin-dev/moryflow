/**
 * Admin Browser Pool Status - 浏览器池状态监控
 */
import { useBrowserStatus, type BrowserPoolDetailedStatus } from '@/features/browser';
import { Skeleton, Progress } from '@aiget/ui/primitives';
import { Monitor, Cpu, HardDrive, Clock, Activity, Server, AlertCircle } from 'lucide-react';

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatMemory(gb: number): string {
  return `${gb.toFixed(2)} GB`;
}

function PageHeader() {
  return (
    <div>
      <h2 className="text-2xl font-bold">Browser Pool</h2>
      <p className="text-muted-foreground">Monitor browser instances and pool status</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="space-y-6">
      <PageHeader />
      <div className="flex flex-col items-center justify-center h-64 border border-destructive/20 bg-destructive/5 rounded-none">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive font-medium">Failed to load browser status</p>
        <p className="text-muted-foreground text-sm mt-1">{message}</p>
      </div>
    </div>
  );
}

function StatsGrid({ status }: { status: BrowserPoolDetailedStatus }) {
  const stats = [
    {
      label: 'Active Instances',
      value: `${status.total} / ${status.config.maxPoolSize}`,
      subValue: `${status.healthy} healthy`,
      icon: Monitor,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Active Pages',
      value: `${status.totalPages} / ${status.config.maxConcurrentPages}`,
      subValue: `${status.waitingCount} waiting`,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Pool Utilization',
      value: `${status.utilization.poolUtilization}%`,
      subValue: `Page: ${status.utilization.pageUtilization}%`,
      icon: Server,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      label: 'System Resources',
      value: `${status.system.cpuCount} CPU`,
      subValue: `${formatMemory(status.system.freeMemoryGB)} free`,
      icon: Cpu,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-none border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <div className={`p-2 rounded-none ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{stat.subValue}</p>
        </div>
      ))}
    </div>
  );
}

function ConfigurationCard({ status }: { status: BrowserPoolDetailedStatus }) {
  return (
    <div className="rounded-none border border-border bg-card p-6">
      <h3 className="font-semibold flex items-center gap-2">
        <HardDrive className="h-4 w-4" />
        Pool Configuration
      </h3>
      <div className="mt-4 space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Max Pool Size</span>
          <span className="font-medium">{status.config.maxPoolSize}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Warmup Count</span>
          <span className="font-medium">{status.config.warmupCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Max Pages per Browser</span>
          <span className="font-medium">{status.config.maxPagesPerBrowser}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Idle Timeout</span>
          <span className="font-medium">{formatTime(status.config.idleTimeoutSeconds)}</span>
        </div>
      </div>
    </div>
  );
}

function SystemResourcesCard({ status }: { status: BrowserPoolDetailedStatus }) {
  const memoryUsagePercent =
    ((status.system.totalMemoryGB - status.system.freeMemoryGB) / status.system.totalMemoryGB) * 100;

  return (
    <div className="rounded-none border border-border bg-card p-6">
      <h3 className="font-semibold flex items-center gap-2">
        <Cpu className="h-4 w-4" />
        System Resources
      </h3>
      <div className="mt-4 space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">CPU Cores</span>
          <span className="font-medium">{status.system.cpuCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Memory</span>
          <span className="font-medium">{formatMemory(status.system.totalMemoryGB)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Free Memory</span>
          <span className="font-medium">{formatMemory(status.system.freeMemoryGB)}</span>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-muted-foreground">Memory Usage</span>
            <span className="font-medium">{Math.round(memoryUsagePercent)}%</span>
          </div>
          <Progress value={memoryUsagePercent} className="h-2" />
        </div>
      </div>
    </div>
  );
}

function InstancesCard({ status }: { status: BrowserPoolDetailedStatus }) {
  return (
    <div className="rounded-none border border-border bg-card p-6">
      <h3 className="font-semibold flex items-center gap-2 mb-4">
        <Monitor className="h-4 w-4" />
        Browser Instances ({status.instances.length})
      </h3>
      {status.instances.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No active browser instances</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {status.instances.map((instance) => (
            <div
              key={instance.id}
              className={`p-4 border rounded-none ${
                instance.isHealthy ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm truncate" title={instance.id}>
                  {instance.id.split('-').slice(-1)[0]}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-none ${
                    instance.isHealthy ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                  }`}
                >
                  {instance.isHealthy ? 'Healthy' : 'Unhealthy'}
                </span>
              </div>
              <div className="mt-2 text-sm space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Pages</span>
                  <span className="font-medium text-foreground">
                    {instance.pageCount} / {status.config.maxPagesPerBrowser}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Idle</span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(instance.idleSeconds)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BrowserPage() {
  const { data: status, isLoading, error } = useBrowserStatus();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState message={error instanceof Error ? error.message : 'Unknown error'} />;
  }

  if (!status) {
    return <ErrorState message="No data received" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader />
      <StatsGrid status={status} />
      <div className="grid gap-4 md:grid-cols-2">
        <ConfigurationCard status={status} />
        <SystemResourcesCard status={status} />
      </div>
      <InstancesCard status={status} />
    </div>
  );
}
