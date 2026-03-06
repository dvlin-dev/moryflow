/**
 * 告警规则创建/编辑对话框
 */

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateAlertRule, useUpdateAlertRule } from '../hooks';
import type { AlertRule, AlertRuleType, AlertLevel } from '../types';
import {
  ALERT_LEVEL_OPTIONS,
  ALERT_RULE_COOLDOWN_OPTIONS,
  ALERT_RULE_TIME_WINDOW_OPTIONS,
  ALERT_RULE_TYPE_OPTIONS,
  buildAlertRuleDto,
  getAlertRuleFormValues,
  type AlertRuleFormValues,
} from '../alert-rule-form';

interface AlertRuleDialogProps {
  rule: AlertRule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AlertRuleDialog({ rule, open, onOpenChange }: AlertRuleDialogProps) {
  const createMutation = useCreateAlertRule();
  const updateMutation = useUpdateAlertRule();
  const isEdit = !!rule;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<AlertRuleFormValues>({
    defaultValues: getAlertRuleFormValues(null),
  });

  const ruleType = useWatch({ control, name: 'type' }) ?? 'tool_failure_rate';
  const level = useWatch({ control, name: 'level' }) ?? 'warning';
  const timeWindow = useWatch({ control, name: 'timeWindow' }) ?? 3600;
  const cooldown = useWatch({ control, name: 'cooldown' }) ?? 3600;
  const enabled = useWatch({ control, name: 'enabled' }) ?? true;

  useEffect(() => {
    reset(getAlertRuleFormValues(rule));
  }, [rule, reset]);

  const onSubmit = async (data: AlertRuleFormValues) => {
    const dto = buildAlertRuleDto(data);

    if (isEdit && rule) {
      await updateMutation.mutateAsync({ id: rule.id, dto });
    } else {
      await createMutation.mutateAsync(dto);
    }

    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const getSubmitLabel = () => {
    if (isPending) {
      return '保存中...';
    }
    if (isEdit) {
      return '保存更改';
    }
    return '创建规则';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑告警规则' : '创建告警规则'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">规则名称</Label>
            <Input
              id="name"
              placeholder="例如：Tool 失败率告警"
              {...register('name', { required: '请输入规则名称' })}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>规则类型</Label>
            <Select value={ruleType} onValueChange={(v) => setValue('type', v as AlertRuleType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALERT_RULE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div>
                      <p>{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Level */}
          <div className="space-y-2">
            <Label>告警级别</Label>
            <Select value={level} onValueChange={(v) => setValue('level', v as AlertLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALERT_LEVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Threshold */}
          <div className="space-y-2">
            <Label htmlFor="threshold">阈值 {ruleType.includes('rate') ? '(%)' : '(次数)'}</Label>
            <Input
              id="threshold"
              type="number"
              {...register('threshold', {
                required: true,
                min: 1,
                valueAsNumber: true,
              })}
            />
          </div>

          {/* Time Window */}
          <div className="space-y-2">
            <Label>时间窗口</Label>
            <Select
              value={String(timeWindow)}
              onValueChange={(v) => setValue('timeWindow', Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALERT_RULE_TIME_WINDOW_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Min Count (for rate-based rules) */}
          {ruleType.includes('rate') && (
            <div className="space-y-2">
              <Label htmlFor="minCount">最小调用次数</Label>
              <Input
                id="minCount"
                type="number"
                {...register('minCount', { min: 1, valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">只有调用次数超过此值时才会触发告警</p>
            </div>
          )}

          {/* Cooldown */}
          <div className="space-y-2">
            <Label>冷却时间</Label>
            <Select value={String(cooldown)} onValueChange={(v) => setValue('cooldown', Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALERT_RULE_COOLDOWN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">在此时间段内相同告警不会重复发送</p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">通知邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              {...register('email', {
                required: '请输入通知邮箱',
                pattern: {
                  value: /^\S+@\S+\.\S+$/,
                  message: '请输入有效邮箱地址',
                },
              })}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          {/* Enabled */}
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">启用规则</Label>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={(v) => setValue('enabled', v)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {getSubmitLabel()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
