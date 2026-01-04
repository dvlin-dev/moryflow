import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@aiget/ui/components/popover'
import { Button } from '@aiget/ui/components/button'
import { ScrollArea } from '@aiget/ui/components/scroll-area'
import { HammerIcon, RefreshCwIcon, Loader2Icon, Settings2Icon, PlusIcon } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { useMcpStatus } from '@/hooks/use-mcp-status'
import type { SettingsSection } from '@/components/settings-dialog/const'

type McpSelectorProps = {
  disabled?: boolean
  onOpenSettings?: (section?: SettingsSection) => void
}

const getStatusDot = (status: string) => {
  switch (status) {
    case 'connected':
      return 'bg-green-500'
    case 'connecting':
      return 'bg-yellow-500 animate-pulse'
    case 'failed':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
}

export const McpSelector = ({ disabled, onOpenSettings }: McpSelectorProps) => {
  const { t } = useTranslation('chat')
  const { servers, isReloading, reload } = useMcpStatus()
  const [open, setOpen] = useState(false)

  const hasServers = servers.length > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs transition-colors duration-fast"
          disabled={disabled}
        >
          <HammerIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="center" side="top" sideOffset={8}>
        <div className="flex items-center justify-between border-b border-border-muted px-3 py-2">
          <span className="text-sm font-medium">{t('mcpServers')}</span>
          {hasServers && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => reload()}
              disabled={isReloading}
              title={t('reconnectAllServers')}
            >
              {isReloading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-4" />
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
                    <span
                      className={`size-2 shrink-0 rounded-full ${getStatusDot(server.status)}`}
                    />
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
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpen(false)
                      onOpenSettings?.('mcp')
                    }}
                    title={t('manageServer')}
                  >
                    <Settings2Icon className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">No MCP Servers</div>
        )}
        {!hasServers && (
          <div className="border-t border-border-muted p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => {
                setOpen(false)
                onOpenSettings?.('mcp')
              }}
            >
              <PlusIcon className="mr-2 size-3.5" />
              {t('addMcpServer')}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
