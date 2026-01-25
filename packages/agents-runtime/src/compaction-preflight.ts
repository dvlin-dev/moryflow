/**
 * [PROVIDES]: createCompactionPreflightGate - 会话压缩预处理门闩
 * [DEPENDS]: none
 * [POS]: 运行时通用的 compaction 预处理去重与 TTL 清理
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type CompactionPreflightGateOptions = {
  ttlMs?: number;
  now?: () => number;
};

export const createCompactionPreflightGate = (options: CompactionPreflightGateOptions = {}) => {
  const ttlMs = options.ttlMs ?? 60_000;
  const now = options.now ?? Date.now;
  const preparedAt = new Map<string, { preparedAt: number; modelId: string }>();

  const cleanup = () => {
    const current = now();
    for (const [chatId, entry] of preparedAt) {
      if (current - entry.preparedAt >= ttlMs) {
        preparedAt.delete(chatId);
      }
    }
  };

  const markPrepared = (chatId: string, modelId: string) => {
    cleanup();
    preparedAt.set(chatId, { preparedAt: now(), modelId });
  };

  const consumePrepared = (chatId: string, modelId: string): boolean => {
    cleanup();
    const entry = preparedAt.get(chatId);
    if (!entry) {
      return false;
    }
    preparedAt.delete(chatId);
    if (entry.modelId !== modelId) {
      return false;
    }
    return now() - entry.preparedAt < ttlMs;
  };

  return { markPrepared, consumePrepared };
};
