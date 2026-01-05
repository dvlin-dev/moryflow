import { ScrollArea } from '@moryflow/ui/components/scroll-area'
import { Button } from '@moryflow/ui/components/button'
import { PlusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { McpServerState } from '@shared/ipc'
import type { McpServerEntry } from './constants'

type McpListProps = {
  servers: McpServerEntry[]
  activeIndex: number
  onActiveChange: (index: number) => void
  onAdd: () => void
  getServerState?: (id: string) => McpServerState | undefined
}

const getStatusColor = (state?: McpServerState) => {
  if (!state) return 'bg-muted-foreground/50'
  switch (state.status) {
    case 'connected':
      return 'bg-success'
    case 'connecting':
      return 'bg-warning animate-pulse'
    case 'failed':
      return 'bg-destructive'
    default:
      return 'bg-muted-foreground/50'
  }
}

export const McpList = ({
  servers,
  activeIndex,
  onActiveChange,
  onAdd,
  getServerState,
}: McpListProps) => (
  <div className="h-full w-52 shrink-0 overflow-hidden rounded-xl bg-background">
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-3">
        <p className="text-sm font-medium">MCP 列表</p>
        <Button type="button" size="sm" variant="ghost" onClick={onAdd} className="h-7 px-2">
          <PlusIcon className="mr-1 size-3.5" />
          添加
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-0.5 px-2 pb-2">
          {servers.map((server, index) => {
            const state = getServerState?.(server.id)
            const isActive = activeIndex === index
            return (
              <button
                key={server.id}
                type="button"
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-fast',
                  isActive
                    ? 'bg-muted/60 font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                )}
                onClick={() => onActiveChange(index)}
              >
                <span className={cn('size-2 shrink-0 rounded-full', getStatusColor(state))} />
                <span className="truncate">{server.name || '未命名'}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {server.type === 'stdio' ? 'Stdio' : 'HTTP'}
                </span>
              </button>
            )
          })}
          {servers.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              还没有服务器
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  </div>
)
