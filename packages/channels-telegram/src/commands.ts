/**
 * [INPUT]: Telegram message text
 * [OUTPUT]: TelegramCommandIntent | null
 * [POS]: Telegram 命令解析（/start、/new）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

export type TelegramCommandIntent =
  | {
      kind: 'start';
    }
  | {
      kind: 'new';
    };

const normalizeCommandToken = (text: string): string | null => {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) {
    return null;
  }
  const token = trimmed.split(/\s+/, 1)[0]?.trim().toLowerCase();
  if (!token) {
    return null;
  }
  const [command] = token.split('@');
  return command || null;
};

export const parseTelegramCommand = (text: string | undefined): TelegramCommandIntent | null => {
  if (!text) {
    return null;
  }
  const command = normalizeCommandToken(text);
  if (command === '/start') {
    return { kind: 'start' };
  }
  if (command === '/new') {
    return { kind: 'new' };
  }
  return null;
};
