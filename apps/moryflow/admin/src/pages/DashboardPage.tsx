/**
 * [PROPS]: 无
 * [EMITS]: 无
 * [POS]: 管理后台仪表盘页面，展示系统统计、健康状态与云同步概览
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */
import { PageHeader } from '@/components/shared';
import { useStats, useHealth, StatsCard, HealthCard, TierDistribution } from '@/features/dashboard';
import { useStorageStats, formatBytes } from '@/features/storage';
import {
  Activity,
  Cloud,
  CreditCard,
  Database,
  RefreshCw,
  HardDrive,
  UserCheck,
  Users,
} from 'lucide-react';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: health, isLoading: healthLoading } = useHealth();
  const { data: storageStats, isLoading: storageLoading } = useStorageStats();

  const paidUsers =
    (stats?.usersByTier.basic || 0) +
    (stats?.usersByTier.pro || 0) +
    (stats?.usersByTier.license || 0);

  return (
    <div className="space-y-6">
      <PageHeader title="系统概览" description="查看系统统计和健康状态" />

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="总用户数"
          value={stats?.totalUsers ?? 0}
          icon={<Users className="h-4 w-4" />}
          isLoading={statsLoading}
        />
        <StatsCard
          title="总积分消耗"
          value={stats?.totalCreditsUsed ?? 0}
          icon={<CreditCard className="h-4 w-4" />}
          isLoading={statsLoading}
        />
        <StatsCard
          title="API 调用量"
          value={stats?.totalApiCalls ?? 0}
          icon={<Activity className="h-4 w-4" />}
          isLoading={statsLoading}
        />
        <StatsCard
          title="付费用户"
          value={paidUsers}
          icon={<UserCheck className="h-4 w-4" />}
          isLoading={statsLoading}
        />
      </div>

      {/* 健康状态和用户分布 */}
      <div className="grid gap-4 md:grid-cols-2">
        <HealthCard health={health} isLoading={healthLoading} />
        <TierDistribution usersByTier={stats?.usersByTier} isLoading={statsLoading} />
      </div>

      {/* 云同步统计 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          云同步概览
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="存储使用"
            value={storageStats ? formatBytes(storageStats.storage.totalUsed) : '0 B'}
            description={`${storageStats?.storage.userCount ?? 0} 个用户`}
            icon={<HardDrive className="h-4 w-4" />}
            isLoading={storageLoading}
          />
          <StatsCard
            title="Vault 数量"
            value={storageStats?.storage.vaultCount ?? 0}
            description={`${storageStats?.storage.deviceCount ?? 0} 台设备`}
            icon={<Cloud className="h-4 w-4" />}
            isLoading={storageLoading}
          />
          <StatsCard
            title="同步文件数"
            value={storageStats?.storage.fileCount ?? 0}
            icon={<RefreshCw className="h-4 w-4" />}
            isLoading={storageLoading}
          />
          <StatsCard
            title="向量化文件"
            value={storageStats?.vectorize.totalCount ?? 0}
            description={`${storageStats?.vectorize.userCount ?? 0} 个用户`}
            icon={<Database className="h-4 w-4" />}
            isLoading={storageLoading}
          />
        </div>
      </div>
    </div>
  );
}
