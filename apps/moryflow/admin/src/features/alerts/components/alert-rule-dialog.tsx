/**
 * 告警规则创建/编辑对话框
 */

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useCreateAlertRule, useUpdateAlertRule } from '../hooks'
import type { AlertRule, AlertRuleType, AlertLevel, CreateAlertRuleDto } from '../types'

interface AlertRuleDialogProps {
  rule: AlertRule | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormData {
  name: string
  type: AlertRuleType
  level: AlertLevel
  threshold: number
  timeWindow: number
  minCount: number
  cooldown: number
  email: string
  enabled: boolean
}

const TYPE_OPTIONS: { value: AlertRuleType; label: string; description: string }[] = [
  {
    value: 'tool_failure_rate',
    label: 'Tool 失败率',
    description: '当 Tool 失败率超过阈值时告警',
  },
  {
    value: 'agent_consecutive',
    label: 'Agent 连续失败',
    description: '当 Agent 连续失败时告警',
  },
  {
    value: 'system_failure_rate',
    label: '系统失败率',
    description: '当系统整体失败率超过阈值时告警',
  },
]

const LEVEL_OPTIONS: { value: AlertLevel; label: string }[] = [
  { value: 'warning', label: '警告' },
  { value: 'critical', label: '严重' },
]

const COOLDOWN_OPTIONS = [
  { value: 300, label: '5 分钟' },
  { value: 900, label: '15 分钟' },
  { value: 1800, label: '30 分钟' },
  { value: 3600, label: '1 小时' },
  { value: 7200, label: '2 小时' },
  { value: 86400, label: '24 小时' },
]

const TIME_WINDOW_OPTIONS = [
  { value: 300, label: '5 分钟' },
  { value: 900, label: '15 分钟' },
  { value: 1800, label: '30 分钟' },
  { value: 3600, label: '1 小时' },
  { value: 7200, label: '2 小时' },
]

export function AlertRuleDialog({ rule, open, onOpenChange }: AlertRuleDialogProps) {
  const createMutation = useCreateAlertRule()
  const updateMutation = useUpdateAlertRule()
  const isEdit = !!rule

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      type: 'tool_failure_rate',
      level: 'warning',
      threshold: 10,
      timeWindow: 3600,
      minCount: 10,
      cooldown: 3600,
      email: 'zhangbaolin.work@foxmail.com',
      enabled: true,
    },
  })

  const ruleType = watch('type')

  useEffect(() => {
    if (rule) {
      reset({
        name: rule.name,
        type: rule.type,
        level: rule.level,
        threshold: rule.condition.threshold,
        timeWindow: rule.condition.timeWindow,
        minCount: rule.condition.minCount ?? 10,
        cooldown: rule.cooldown,
        email: rule.actions[0]?.target ?? 'zhangbaolin.work@foxmail.com',
        enabled: rule.enabled,
      })
    } else {
      reset({
        name: '',
        type: 'tool_failure_rate',
        level: 'warning',
        threshold: 10,
        timeWindow: 3600,
        minCount: 10,
        cooldown: 3600,
        email: 'zhangbaolin.work@foxmail.com',
        enabled: true,
      })
    }
  }, [rule, reset])

  const onSubmit = async (data: FormData) => {
    const dto: CreateAlertRuleDto = {
      name: data.name,
      type: data.type,
      level: data.level,
      condition: {
        metric:
          data.type === 'agent_consecutive' ? 'consecutive_failures' : 'failure_rate',
        operator: 'gt',
        threshold: data.threshold,
        timeWindow: data.timeWindow,
        minCount: data.minCount,
      },
      actions: [{ channel: 'email', target: data.email }],
      cooldown: data.cooldown,
      enabled: data.enabled,
    }

    if (isEdit) {
      await updateMutation.mutateAsync({ id: rule.id, dto })
    } else {
      await createMutation.mutateAsync(dto)
    }

    onOpenChange(false)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

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
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>规则类型</Label>
            <Select
              value={watch('type')}
              onValueChange={(v) => setValue('type', v as AlertRuleType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
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
            <Select
              value={watch('level')}
              onValueChange={(v) => setValue('level', v as AlertLevel)}
            >
              <SelectTrigger>
                <SelectValue />
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

          {/* Threshold */}
          <div className="space-y-2">
            <Label htmlFor="threshold">
              阈值 {ruleType.includes('rate') ? '(%)' : '(次数)'}
            </Label>
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
              value={String(watch('timeWindow'))}
              onValueChange={(v) => setValue('timeWindow', Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_WINDOW_OPTIONS.map((opt) => (
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
              <p className="text-xs text-muted-foreground">
                只有调用次数超过此值时才会触发告警
              </p>
            </div>
          )}

          {/* Cooldown */}
          <div className="space-y-2">
            <Label>冷却时间</Label>
            <Select
              value={String(watch('cooldown'))}
              onValueChange={(v) => setValue('cooldown', Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COOLDOWN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              在此时间段内相同告警不会重复发送
            </p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">通知邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              {...register('email', { required: '请输入通知邮箱' })}
            />
          </div>

          {/* Enabled */}
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">启用规则</Label>
            <Switch
              id="enabled"
              checked={watch('enabled')}
              onCheckedChange={(v) => setValue('enabled', v)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '保存中...' : isEdit ? '保存更改' : '创建规则'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
