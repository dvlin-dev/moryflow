/**
 * [PROVIDES]: Memory 消息处理工具
 * [DEPENDS]: none
 * [POS]: 过滤 messages 并构建 Memory 文本
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export function normalizePreferenceList(input?: string): string[] {
  if (!input) {
    return [];
  }

  return input
    .split(/[,|\n]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function filterMessagesByPreferences(
  messages: Record<string, string | null>[],
  includes?: string,
  excludes?: string,
): Record<string, string | null>[] {
  const includeList = normalizePreferenceList(includes).map((value) =>
    value.toLowerCase(),
  );
  const excludeList = normalizePreferenceList(excludes).map((value) =>
    value.toLowerCase(),
  );

  if (includeList.length === 0 && excludeList.length === 0) {
    return messages;
  }

  const filtered = messages.filter((message) => {
    const content = message.content ?? '';
    const normalized = content.toLowerCase();
    if (includeList.length > 0) {
      const hasInclude = includeList.some((term) => normalized.includes(term));
      if (!hasInclude) {
        return false;
      }
    }
    if (excludeList.length > 0) {
      const hasExclude = excludeList.some((term) => normalized.includes(term));
      if (hasExclude) {
        return false;
      }
    }
    return true;
  });

  return filtered.length > 0 ? filtered : messages;
}

export function buildMemoryFromMessages(
  messages: Record<string, string | null>[],
): string {
  return messages
    .map((message) => message.content || '')
    .filter((text) => text.trim().length > 0)
    .join('\n');
}
