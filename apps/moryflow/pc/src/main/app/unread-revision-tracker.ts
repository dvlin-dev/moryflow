/**
 * [INPUT]: 会话级 snapshot revision 与 deleted 事件
 * [OUTPUT]: 未读 revision 去重与回收跟踪器（增量判定 + 删除回收 + 全量清理）
 * [POS]: 菜单栏未读 badge 的 session revision 去重事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

type UnreadRevisionTracker = {
  shouldIncrement: (sessionId: string, revision: number) => boolean;
  deleteSession: (sessionId: string) => void;
  clear: () => void;
};

const toRevision = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
};

export const createUnreadRevisionTracker = (): UnreadRevisionTracker => {
  const revisionBySession = new Map<string, number>();

  return {
    shouldIncrement: (sessionId, revision) => {
      const normalizedRevision = toRevision(revision);
      const previousRevision = revisionBySession.get(sessionId) ?? 0;
      if (normalizedRevision <= previousRevision) {
        return false;
      }
      revisionBySession.set(sessionId, normalizedRevision);
      return true;
    },
    deleteSession: (sessionId) => {
      revisionBySession.delete(sessionId);
    },
    clear: () => {
      revisionBySession.clear();
    },
  };
};
