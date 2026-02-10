/**
 * [PROVIDES]: ChatThreadsList - Chat Mode Threads 列表
 * [DEPENDS]: useChatSessions（共享 store）
 * [POS]: Sidebar Chat Mode 内容区（threads list + row actions）
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

export const ChatThreadsList = memo(function ChatThreadsList() {
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

  if (!isReady) {
    return <div className="px-3 py-3 text-sm text-muted-foreground">Preparing…</div>;
  }

  if (sorted.length === 0) {
    return <div className="px-3 py-3 text-sm text-muted-foreground">No threads yet.</div>;
  }

  return (
    <div className="px-2 py-1">
      {sorted.map((session) => {
        const isActive = session.id === activeSessionId;
        const isEditing = editingId === session.id;

        return (
          <div
            key={session.id}
            className={cn(
              'group flex w-full items-center rounded-md text-sm',
              'transition-colors hover:bg-muted/40',
              isActive && 'bg-accent/60 text-foreground'
            )}
          >
            {isEditing ? (
              <div className="flex-1 px-2.5 py-1.5">
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
                  className="h-6 w-full bg-transparent outline-hidden"
                />
              </div>
            ) : (
              <button
                type="button"
                className="flex-1 truncate px-2.5 py-1.5 text-left outline-hidden"
                onClick={() => selectSession(session.id)}
              >
                {session.title}
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
