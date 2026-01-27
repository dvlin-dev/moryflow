/**
 * [PROPS]: data, isLoading
 * [EMITS]: none
 * [POS]: 云同步统计卡片（Lucide icons direct render）
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sparkles,
  File,
  FolderOpen,
  HardDrive,
  Smartphone,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { formatBytes, formatNumber } from '../const';
import type { StorageStats } from '@/types/storage';

interface StorageStatsCardsProps {
  data?: StorageStats;
  isLoading: boolean;
}

export function StorageStatsCards({ data, isLoading }: StorageStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats: Array<{
    title: string;
    value: string;
    description: string;
    icon: LucideIcon;
  }> = [
    {
      title: '总存储使用',
      value: formatBytes(data?.storage.totalUsed ?? 0),
      description: `${formatNumber(data?.storage.userCount ?? 0)} 位用户`,
      icon: HardDrive,
    },
    {
      title: 'Vault 数量',
      value: formatNumber(data?.storage.vaultCount ?? 0),
      description: '用户笔记库',
      icon: FolderOpen,
    },
    {
      title: '文件数量',
      value: formatNumber(data?.storage.fileCount ?? 0),
      description: '同步文件总数',
      icon: File,
    },
    {
      title: '设备数量',
      value: formatNumber(data?.storage.deviceCount ?? 0),
      description: '已注册设备',
      icon: Smartphone,
    },
    {
      title: '向量化文件',
      value: formatNumber(data?.vectorize.totalCount ?? 0),
      description: `${formatNumber(data?.vectorize.userCount ?? 0)} 位用户`,
      icon: Sparkles,
    },
    {
      title: '活跃用户',
      value: formatNumber(data?.storage.userCount ?? 0),
      description: '使用云同步',
      icon: Users,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => {
        const IconComponent = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <IconComponent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
