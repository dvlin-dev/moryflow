/**
 * [PROVIDES]: Desktop Bash 命令执行审计日志（JSONL）
 * [DEPENDS]: node:crypto, ./audit-log
 * [POS]: PC Agent Runtime bash 执行元数据落地
 * [UPDATE]: 2026-03-03 - 默认仅落盘命令指纹与结构化特征；命令预览需显式开关并强制脱敏
 * [UPDATE]: 2026-03-03 - 扩展 token 脱敏规则，覆盖 sk-proj/pk-live 等连字符前缀
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { createHash, randomUUID } from 'node:crypto';
import { appendDesktopAuditLog } from './audit-log.js';

const DEFAULT_PREVIEW_MAX_CHARS = 120;
const MIN_PREVIEW_MAX_CHARS = 32;
const MAX_PREVIEW_MAX_CHARS = 512;

export type BashCommandAuditInput = {
  sessionId: string;
  userId?: string;
  command: string;
  requestedCwd?: string;
  resolvedCwd: string;
  exitCode: number;
  durationMs: number;
  failed: boolean;
  error?: string;
  timestamp: number;
};

export type BashCommandAuditRecord = {
  eventId: string;
  sessionId: string;
  userId?: string;
  commandFingerprint: string;
  commandLength: number;
  argTokenCount: number;
  containsPipe: boolean;
  containsRedirect: boolean;
  containsEnvAssignment: boolean;
  commandPreview?: string;
  requestedCwd?: string;
  resolvedCwd: string;
  exitCode: number;
  durationMs: number;
  failed: boolean;
  error?: string;
  timestamp: number;
};

export type BashAuditPrivacyConfig = {
  /** 是否允许落盘命令预览（默认 false） */
  persistCommandPreview?: boolean;
  /** 命令预览最大字符数（仅在 persistCommandPreview=true 时生效） */
  previewMaxChars?: number;
};

export type DesktopBashAuditWriter = {
  append: (event: BashCommandAuditInput) => Promise<void>;
};

const normalizeCommandForStats = (command: string): string => command.trim().replace(/\s+/g, ' ');

const resolvePreviewMaxChars = (raw?: number): number => {
  if (!Number.isFinite(raw)) {
    return DEFAULT_PREVIEW_MAX_CHARS;
  }
  return Math.max(MIN_PREVIEW_MAX_CHARS, Math.min(MAX_PREVIEW_MAX_CHARS, Math.floor(raw!)));
};

const sanitizeCommandPreview = (command: string): string => {
  return command
    .replace(/(https?:\/\/[^/\s:@]+):[^@\s/]+@/gi, '$1:[REDACTED]@')
    .replace(
      /((?:--?(?:token|password|passwd|secret|api[-_]?key|authorization))=)(\S+)/gi,
      '$1[REDACTED]'
    )
    .replace(
      /((?:--?(?:token|password|passwd|secret|api[-_]?key|authorization))\s+)(\S+)/gi,
      '$1[REDACTED]'
    )
    .replace(
      /\b((?:export\s+)?(?:[A-Za-z_][A-Za-z0-9_]*?(?:TOKEN|SECRET|PASSWORD|PASSWD)|API_KEY|ACCESS_KEY|PRIVATE_KEY))=([^\s]+)/gi,
      '$1=[REDACTED]'
    )
    .replace(/\b(?:sk|pk|ghp|gho|ghu|pat)[-_][A-Za-z0-9_-]{8,}\b/g, '[REDACTED_TOKEN]');
};

const truncatePreview = (text: string, maxChars: number): string =>
  text.length <= maxChars ? text : `${text.slice(0, maxChars)}...`;

export const buildBashAuditRecord = (
  event: BashCommandAuditInput,
  privacyConfig: BashAuditPrivacyConfig = {}
): BashCommandAuditRecord => {
  const normalizedCommand = normalizeCommandForStats(event.command);
  const persistCommandPreview = privacyConfig.persistCommandPreview === true;
  const previewMaxChars = resolvePreviewMaxChars(privacyConfig.previewMaxChars);
  const commandPreview =
    persistCommandPreview && normalizedCommand.length > 0
      ? truncatePreview(sanitizeCommandPreview(normalizedCommand), previewMaxChars)
      : undefined;

  return {
    eventId: randomUUID(),
    sessionId: event.sessionId,
    userId: event.userId,
    commandFingerprint: createHash('sha256').update(event.command).digest('hex'),
    commandLength: event.command.length,
    argTokenCount: normalizedCommand.length > 0 ? normalizedCommand.split(' ').length : 0,
    containsPipe: event.command.includes('|'),
    containsRedirect: /[<>]/.test(event.command),
    containsEnvAssignment: /(^|\s)(?:export\s+)?[A-Za-z_][A-Za-z0-9_]*=/.test(event.command),
    commandPreview,
    requestedCwd: event.requestedCwd,
    resolvedCwd: event.resolvedCwd,
    exitCode: event.exitCode,
    durationMs: event.durationMs,
    failed: event.failed,
    error: event.error,
    timestamp: event.timestamp,
  };
};

export const createDesktopBashAuditWriter = (
  privacyConfig: BashAuditPrivacyConfig = {}
): DesktopBashAuditWriter => ({
  async append(event) {
    await appendDesktopAuditLog({
      sessionId: event.sessionId,
      suffix: '.bash.jsonl',
      payload: buildBashAuditRecord(event, privacyConfig),
    });
  },
});
