/**
 * 告警管理页面
 * 显示告警规则和告警历史
 */

import { useState } from 'react';
import { PageHeader, SimplePagination } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, RefreshCw } from 'lucide-react';
import { usePagination } from '@/hooks';
import { toast } from 'sonner';
import {
  useAlertRules,
  useAlertHistory,
  useAlertStats,
  useTriggerDetection,
  AlertRulesTable,
  AlertHistoryTable,
  AlertRuleDialog,
  AlertStatsCards,
  type AlertRule,
  type AlertLevel,
} from '@/features/alerts';

const PAGE_SIZE = 20;

const DAYS_OPTIONS = [
  { value: '7', label: '最近 7 天' },
  { value: '14', label: '最近 14 天' },
  { value: '30', label: '最近 30 天' },
];

const LEVEL_OPTIONS: Array<{ value: AlertLevel | ''; label: string }> = [
  { value: '', label: '全部级别' },
  { value: 'critical', label: '严重' },
  { value: 'warning', label: '警告' },
];

export default function AlertsPage() {
  // 状态
  const [days, setDays] = useState('7');
  const [level, setLevel] = useState<AlertLevel | ''>('');
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // 分页
  const { page, setPage, getTotalPages } = usePagination({ pageSize: PAGE_SIZE });

  // 数据查询
  const { data: rulesData, isLoading: rulesLoading } = useAlertRules();
  const { data: historyData, isLoading: historyLoading } = useAlertHistory({
    level: level || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const { data: stats, isLoading: statsLoading } = useAlertStats(parseInt(days));

  const triggerMutation = useTriggerDetection();

  const rules = rulesData?.rules ?? [];
  const history = historyData?.history ?? [];
  const totalPages = getTotalPages(historyData?.total ?? 0);

  const handleTriggerDetection = async () => {
    try {
      await triggerMutation.mutateAsync();
      toast.success('检测已触发');
    } catch {
      toast.error('触发检测失败');
    }
  };

  const handleEditRule = (rule: AlertRule) => {
    setEditingRule(rule);
  };

  const handleCloseDialog = () => {
    setEditingRule(null);
    setShowCreateDialog(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="告警管理"
        description="配置告警规则和查看告警历史"
        action={
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[140px]">
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

            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerDetection}
              disabled={triggerMutation.isPending}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${triggerMutation.isPending ? 'animate-spin' : ''}`}
              />
              执行检测
            </Button>

            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新建规则
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <AlertStatsCards stats={stats} isLoading={statsLoading} />

      {/* Tabs */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">规则 ({rules.length})</TabsTrigger>
          <TabsTrigger value="history">历史 ({historyData?.total ?? 0})</TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <AlertRulesTable rules={rules} isLoading={rulesLoading} onEdit={handleEditRule} />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <Select
              value={level}
              onValueChange={(v) => {
                setLevel(v as AlertLevel | '');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="按级别筛选" />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertHistoryTable history={history} isLoading={historyLoading} />

          {totalPages > 1 && (
            <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <AlertRuleDialog
        rule={editingRule}
        open={showCreateDialog || !!editingRule}
        onOpenChange={handleCloseDialog}
      />
    </div>
  );
}
