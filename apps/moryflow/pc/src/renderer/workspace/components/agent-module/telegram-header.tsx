/**
 * [PROPS]: effectiveStatus, lastError
 * [EMITS]: none
 * [POS]: Telegram 配置页顶部状态栏（标题 + 运行状态 + 错误提示）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Badge } from '@moryflow/ui/components/badge';

type Props = {
  effectiveStatus: {
    text: string;
    tone: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  lastError?: string | null;
};

export const TelegramHeader = ({ effectiveStatus, lastError }: Props) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2">
      <h3 className="text-sm font-medium">Telegram Bot</h3>
      <Badge variant={effectiveStatus.tone}>{effectiveStatus.text}</Badge>
    </div>
    {lastError && <p className="text-xs text-destructive">{lastError}</p>}
  </div>
);
