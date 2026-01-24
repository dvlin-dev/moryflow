/**
 * 告警规则表格
 */

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Icon } from '@/components/ui/icon';
import {
  Delete01Icon,
  More01Icon,
  Notification01Icon,
  PencilEdit01Icon,
} from '@hugeicons/core-free-icons';
import { AlertLevelBadge, AlertTypeBadge } from './alert-badges';
import { useUpdateAlertRule, useDeleteAlertRule } from '../hooks';
import type { AlertRule } from '../types';

interface AlertRulesTableProps {
  rules: AlertRule[];
  isLoading?: boolean;
  onEdit: (rule: AlertRule) => void;
}

export function AlertRulesTable({ rules, isLoading, onEdit }: AlertRulesTableProps) {
  const [deleteRule, setDeleteRule] = useState<AlertRule | null>(null);
  const updateMutation = useUpdateAlertRule();
  const deleteMutation = useDeleteAlertRule();

  const handleToggle = async (rule: AlertRule) => {
    await updateMutation.mutateAsync({
      id: rule.id,
      dto: { enabled: !rule.enabled },
    });
  };

  const handleDelete = async () => {
    if (!deleteRule) return;
    await deleteMutation.mutateAsync(deleteRule.id);
    setDeleteRule(null);
  };

  const formatCooldown = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">名称</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>级别</TableHead>
              <TableHead>冷却时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="rounded-lg border p-12 text-center">
        <Icon icon={Notification01Icon} className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">暂无告警规则</p>
        <p className="text-sm text-muted-foreground mt-1">创建第一个告警规则开始监控</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">名称</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>级别</TableHead>
              <TableHead>冷却时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">{rule.name}</TableCell>
                <TableCell>
                  <AlertTypeBadge type={rule.type} />
                </TableCell>
                <TableCell>
                  <AlertLevelBadge level={rule.level} />
                </TableCell>
                <TableCell className="font-mono text-sm">{formatCooldown(rule.cooldown)}</TableCell>
                <TableCell>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => handleToggle(rule)}
                    disabled={updateMutation.isPending}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Icon icon={More01Icon} className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(rule)}>
                        <Icon icon={PencilEdit01Icon} className="mr-2 h-4 w-4" />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteRule(rule)}
                      >
                        <Icon icon={Delete01Icon} className="mr-2 h-4 w-4" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteRule} onOpenChange={() => setDeleteRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除告警规则</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 "{deleteRule?.name}" 吗？此操作不可撤销，所有关联的告警历史也将被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
