/**
 * [PROPS]: { enabled, onEnabledChange, label?, hint? }
 * [EMITS]: onEnabledChange(enabled)
 * [POS]: Providers 设置页通用的“启用/禁用服务商”展示组件（详情面板内显式展示开关）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Label } from '@anyhunt/ui/components/label';
import { Switch } from '@anyhunt/ui/components/switch';

type ProviderEnabledToggleProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  label?: string;
  hint?: string;
};

export const ProviderEnabledToggle = ({
  enabled,
  onEnabledChange,
  label = 'Enabled',
  hint,
}: ProviderEnabledToggleProps) => {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
      <div className="min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <Switch checked={enabled} onCheckedChange={onEnabledChange} />
    </div>
  );
};
