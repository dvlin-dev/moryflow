/**
 * [PROPS]: { value, onChange, status, message, disabled }
 * [EMITS]: onChange(value) - 输入变更时触发
 * [POS]: 子域名输入组件，用于 PublishPanel（Lucide 图标）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { X, Loader, Check } from 'lucide-react';
import { Input } from '@moryflow/ui/components/input';
import { cn } from '@/lib/utils';
import type { SubdomainInputProps, SubdomainStatus } from './const';
import { SUBDOMAIN_SUFFIX } from './const';

/** 状态图标映射 */
const StatusIcon: Record<SubdomainStatus, React.ReactNode> = {
  idle: null,
  checking: <Loader className="h-4 w-4 animate-spin text-muted-foreground" />,
  available: <Check className="h-4 w-4 text-green-500" />,
  taken: <X className="h-4 w-4 text-destructive" />,
  invalid: <X className="h-4 w-4 text-destructive" />,
};

/** 状态颜色映射 */
const statusColorClass: Record<SubdomainStatus, string> = {
  idle: '',
  checking: '',
  available: 'text-green-500',
  taken: 'text-destructive',
  invalid: 'text-destructive',
};

export function SubdomainInput({
  value,
  onChange,
  status,
  message,
  disabled,
}: SubdomainInputProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-0">
        {/* 输入框 */}
        <div className="relative flex-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
            placeholder="my-site"
            disabled={disabled}
            className={cn(
              'rounded-r-none pr-8',
              status === 'available' && 'border-green-500 focus-visible:ring-green-500',
              (status === 'taken' || status === 'invalid') &&
                'border-destructive focus-visible:ring-destructive'
            )}
          />
          {/* 状态图标 */}
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">{StatusIcon[status]}</div>
        </div>

        {/* 后缀 */}
        <div className="flex h-9 items-center rounded-r-lg border border-l-0 border-input bg-muted px-3 text-sm text-muted-foreground">
          {SUBDOMAIN_SUFFIX}
        </div>
      </div>

      {/* 状态消息 */}
      {message && <p className={cn('text-xs', statusColorClass[status])}>{message}</p>}
    </div>
  );
}
