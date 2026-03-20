/**
 * [PROPS]: effectiveStatus, lastError
 * [EMITS]: none
 * [POS]: Telegram 配置页顶部状态栏（标题 + 运行状态 + 错误提示）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Badge } from '@moryflow/ui/components/badge';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

type Props = {
  effectiveStatus: {
    text: string;
    tone: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  lastError?: string | null;
};

const STATUS_TEXT_KEYS = {
  'Not connected': 'telegramStatusNotConnected',
  Disabled: 'telegramStatusDisabled',
  'Missing token': 'telegramStatusMissingToken',
  Running: 'telegramStatusRunning',
  Stopped: 'telegramStatusStopped',
} as const;

export const TelegramHeader = ({ effectiveStatus, lastError }: Props) => {
  const { t } = useTranslation('workspace');
  const statusKey = STATUS_TEXT_KEYS[effectiveStatus.text as keyof typeof STATUS_TEXT_KEYS];
  const statusLabel = statusKey ? t(statusKey) : effectiveStatus.text;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">{t('telegramBotTitle')}</h3>
        <Badge variant={effectiveStatus.tone}>{statusLabel}</Badge>
      </div>
      {lastError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
          <AlertCircle className="size-3.5 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">{lastError}</p>
        </div>
      )}
    </div>
  );
};
