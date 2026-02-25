/**
 * [PROPS]: McpPanelProps - MCP 面板展示与管理入口
 * [EMITS]: onOpenSettings/onClose - 打开设置/关闭面板
 * [POS]: Chat Prompt 输入框 MCP 面板（+ 菜单复用）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Plus, Loader, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@moryflow/ui/components/button';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { useMcpStatus } from '@/hooks/use-mcp-status';
import type { SettingsSection } from '@/components/settings-dialog/const';

export type McpPanelProps = {
  disabled?: boolean;
  onOpenSettings?: (section?: SettingsSection) => void;
  onClose?: () => void;
  className?: string;
};

const getStatusDot = (status: string) => {
  switch (status) {
    case 'connected':
      return 'bg-green-500';
    case 'connecting':
      return 'bg-yellow-500 animate-pulse';
    case 'failed':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
};

export const McpPanel = ({ disabled, onOpenSettings, onClose, className }: McpPanelProps) => {
  const { t } = useTranslation('chat');
  const { servers, isReloading, reload } = useMcpStatus();

  const hasServers = servers.length > 0;

  return (
    <div className={cn('w-64 p-0', className)}>
      <div className="flex items-center justify-between border-b border-border-muted px-3 py-2">
        <span className="text-sm font-medium">{t('mcpServers')}</span>
        {hasServers && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => reload()}
            disabled={isReloading || disabled}
            title={t('reconnectAllServers')}
          >
            {isReloading ? (
              <Loader className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
        )}
      </div>
      {hasServers ? (
        <ScrollArea className="max-h-60">
          <div className="divide-y">
            {servers.map((server) => (
              <div
                key={server.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className={`size-2 shrink-0 rounded-full ${getStatusDot(server.status)}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{server.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {server.status === 'connected'
                        ? t('toolCount', { count: server.toolCount ?? 0 })
                        : server.status === 'connecting'
                          ? t('connecting')
                          : server.error || t('notConnected')}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClose?.();
                    onOpenSettings?.('mcp');
                  }}
                  disabled={disabled}
                  title={t('manageServer')}
                >
                  <Settings className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="px-3 py-6 text-center text-sm text-muted-foreground">
          {t('noMcpServers')}
        </div>
      )}
      {!hasServers && (
        <div className="border-t border-border-muted p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => {
              onClose?.();
              onOpenSettings?.('mcp');
            }}
            disabled={disabled}
          >
            <Plus className="mr-2 size-3.5" />
            {t('addMcpServer')}
          </Button>
        </div>
      )}
    </div>
  );
};
