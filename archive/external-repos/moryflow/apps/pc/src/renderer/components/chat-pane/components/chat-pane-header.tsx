import { memo, useMemo, useState } from 'react'
import type { ChatSessionSummary } from '@shared/ipc'
import { Button } from '@moryflow/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@moryflow/ui/components/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@moryflow/ui/components/tooltip'
import { useTranslation } from '@/lib/i18n'
import { CheckIcon, MoreHorizontalIcon, PanelRightIcon, PlusIcon, Trash2Icon } from 'lucide-react'

type ChatPaneHeaderProps = {
  sessions: ChatSessionSummary[]
  activeSession: ChatSessionSummary | null
  onSelectSession: (sessionId: string) => void
  onCreateSession: () => void | Promise<unknown>
  onDeleteSession: (sessionId: string) => void | Promise<unknown>
  isSessionReady: boolean
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export const ChatPaneHeader = memo(
  ({
    sessions,
    activeSession,
    onSelectSession,
    onCreateSession,
    onDeleteSession,
    isSessionReady,
    collapsed,
    onToggleCollapse,
  }: ChatPaneHeaderProps) => {
    const { t } = useTranslation('chat')

    return (
      <header className="flex shrink-0 items-center justify-between p-2">
        {/* 左侧：切换按钮 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground transition-colors duration-fast hover:text-foreground"
              onClick={onToggleCollapse}
              aria-label={collapsed ? t('expand') : t('collapse')}
            >
              <PanelRightIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">{collapsed ? t('expand') : t('collapse')}</TooltipContent>
        </Tooltip>
        {/* 右侧：历史和新建按钮 */}
        <div
          className={`flex items-center gap-1 transition-opacity duration-200 ${
            collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        >
          <HistoryDropdown
            sessions={sessions}
            activeSession={activeSession}
            onSelectSession={onSelectSession}
            onDeleteSession={onDeleteSession}
            disabled={!isSessionReady}
            t={t}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground transition-colors duration-fast hover:text-foreground"
                onClick={() => void onCreateSession()}
                disabled={!isSessionReady}
                aria-label={t('newConversation')}
              >
                <PlusIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('newConversation')}</TooltipContent>
          </Tooltip>
        </div>
      </header>
    )
  }
)

ChatPaneHeader.displayName = 'ChatPaneHeader'

type HistoryDropdownProps = {
  sessions: ChatSessionSummary[]
  activeSession: ChatSessionSummary | null
  onSelectSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void | Promise<unknown>
  disabled?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any
}

const HistoryDropdown = ({
  sessions,
  activeSession,
  onSelectSession,
  onDeleteSession,
  disabled,
  t,
}: HistoryDropdownProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const items = useMemo(
    () =>
      sessions.length > 0
        ? sessions
        : [
            {
              id: '__placeholder__',
              title: t('preparing'),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
    [sessions, t]
  )

  const handleDelete = (event: React.MouseEvent, sessionId: string) => {
    event.stopPropagation()
    event.preventDefault()
    void onDeleteSession(sessionId)
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground transition-colors duration-fast hover:text-foreground"
              disabled={disabled}
              aria-label={t('history')}
            >
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('history')}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t('history')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-64 overflow-y-auto">
          {items.map((session) => {
            const isActive = activeSession?.id === session.id
            const isHovered = hoveredId === session.id
            const isPlaceholder = session.id === '__placeholder__'

            return (
              <DropdownMenuItem
                key={session.id}
                onSelect={(event) => {
                  event.preventDefault()
                  if (disabled) {
                    return
                  }
                  onSelectSession(session.id)
                }}
                onMouseEnter={() => setHoveredId(session.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="group flex items-center gap-2 focus:outline-hidden focus:ring-0"
                disabled={isPlaceholder}
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm text-foreground">{session.title}</span>
                  {!isPlaceholder && (
                    <span className="text-xs text-muted-foreground">
                      {formatSessionTimestamp(session.updatedAt)}
                    </span>
                  )}
                </div>
                {/* 删除按钮：hover 时显示，位于对号左边 */}
                {!isPlaceholder && isHovered && (
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, session.id)}
                    className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={t('deleteChat')}
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                )}
                {/* 当前对话对号 */}
                {isActive && <CheckIcon className="size-4 shrink-0 text-muted-foreground" />}
              </DropdownMenuItem>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const formatSessionTimestamp = (timestamp: number) => {
  try {
    // 使用浏览器默认 locale
    return new Intl.DateTimeFormat(undefined, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp))
  } catch {
    return ''
  }
}
