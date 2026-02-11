/**
 * [PROVIDES]: ChatThreadsList - AgentSub=chat Threads 列表
 * [DEPENDS]: useChatSessions（共享 store）
 * [POS]: Sidebar AgentSub=chat 内容区（threads list + row actions）
 *
 * [UPDATE]: 2026-02-10 - 修复标题截断：确保在可拖拽侧栏宽度变化时仍显示省略号（min-w-0 + span.truncate）
 * [UPDATE]: 2026-02-11 - 横向间距收敛：移除列表容器额外 padding，和侧边栏统一 gutter 对齐
 * [UPDATE]: 2026-02-11 - 改为由列表子容器统一控制 inset（不在线程行内做对齐补丁），激活背景与文本对齐关系更稳定
 * [UPDATE]: 2026-02-11 - 线程项增加统一前导占位槽（size-4 + gap-2），使文本左边线与带图标列表一致
 * [UPDATE]: 2026-02-11 - 列表容器 inset 改为复用 sidebar 常量（与全局 gutter 解耦，按列表规则独立维护）
 * [UPDATE]: 2026-02-11 - 行内水平 padding 收敛为 0（保留前导占位槽），和 Files 列表文字基线严格对齐
 * [UPDATE]: 2026-02-11 - 线程行背景增加轻微左右外扩（-mx-1 + px-1 抵消），保证文字对齐不变、背景可略超出
 * [UPDATE]: 2026-02-11 - 与 Files 列表统一回调行内 padding 为 px-2.5，保持两块间距一致且避免视觉过紧
 * [UPDATE]: 2026-02-11 - 移除线程行空白前导占位槽，避免视觉上出现“额外左 padding”
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { memo, useCallback, useMemo, useState } from 'react';
import { Ellipsis, PencilLine, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@anyhunt/ui/components/dropdown-menu';
import { cn } from '@/lib/utils';
import { useChatSessions } from '@/components/chat-pane/hooks';
import { SIDEBAR_LIST_INSET_X_CLASS } from '../const';

type ChatThreadsListProps = {
  onOpenThread?: (sessionId: string) => void;
};

export const ChatThreadsList = memo(function ChatThreadsList({
  onOpenThread,
}: ChatThreadsListProps) {
  const { sessions, activeSessionId, selectSession, renameSession, deleteSession, isReady } =
    useChatSessions();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const sorted = useMemo(() => sessions, [sessions]);

  const commitRename = useCallback(
    async (sessionId: string) => {
      const nextTitle = editingTitle.trim();
      if (!nextTitle) {
        setEditingId(null);
        setEditingTitle('');
        return;
      }

      try {
        await renameSession(sessionId, nextTitle);
      } finally {
        setEditingId(null);
        setEditingTitle('');
      }
    },
    [editingTitle, renameSession]
  );

  const handleDelete = useCallback(
    async (sessionId: string) => {
      const ok = window.confirm('Delete this thread?');
      if (!ok) {
        return;
      }
      await deleteSession(sessionId);
    },
    [deleteSession]
  );

  const handleOpen = useCallback(
    (sessionId: string) => {
      if (onOpenThread) {
        onOpenThread(sessionId);
        return;
      }
      selectSession(sessionId);
    },
    [onOpenThread, selectSession]
  );

  if (!isReady) {
    return (
      <div className={cn('py-3 text-sm text-muted-foreground', SIDEBAR_LIST_INSET_X_CLASS)}>
        Preparing…
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className={cn('py-3 text-sm text-muted-foreground', SIDEBAR_LIST_INSET_X_CLASS)}>
        No threads yet.
      </div>
    );
  }

  return (
    <div className={cn('py-1', SIDEBAR_LIST_INSET_X_CLASS)}>
      {sorted.map((session) => {
        const isActive = session.id === activeSessionId;
        const isEditing = editingId === session.id;

        return (
          <div
            key={session.id}
            className={cn(
              'group -mx-1 flex w-full min-w-0 items-center rounded-md text-sm',
              'transition-colors hover:bg-muted/40',
              isActive && 'bg-accent/60 text-foreground'
            )}
          >
            {isEditing ? (
              <div className="flex min-w-0 flex-1 items-center gap-0 px-2.5 py-1.5">
                <input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => void commitRename(session.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void commitRename(session.id);
                      return;
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setEditingId(null);
                      setEditingTitle('');
                    }
                  }}
                  autoFocus
                  className="h-6 w-full min-w-0 bg-transparent outline-hidden"
                />
              </div>
            ) : (
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-0 px-2.5 py-1.5 text-left outline-hidden"
                onClick={() => handleOpen(session.id)}
              >
                <span className="block min-w-0 flex-1 truncate">{session.title}</span>
              </button>
            )}

            {!isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'flex size-8 items-center justify-center rounded-md',
                      'text-muted-foreground transition-opacity hover:bg-muted/50 hover:text-foreground',
                      'opacity-0 group-hover:opacity-100'
                    )}
                    aria-label="Thread actions"
                  >
                    <Ellipsis className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={4}>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingId(session.id);
                      setEditingTitle(session.title);
                    }}
                  >
                    <PencilLine className="mr-2 size-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => void handleDelete(session.id)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
    </div>
  );
});

ChatThreadsList.displayName = 'ChatThreadsList';
