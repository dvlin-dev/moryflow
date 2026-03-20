/**
 * [PROVIDES]: Desktop 审计日志安全落盘基座（路径归一化 + 文件名安全 + JSONL 追加）
 * [DEPENDS]: node:crypto, node:fs, node:path, node:os
 * [POS]: PC Agent Runtime 审计日志公共基础设施
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const DESKTOP_AUDIT_DIR = path.join(os.homedir(), '.moryflow', 'logs', 'agent-audit');

const SAFE_SESSION_FALLBACK = 'session';
const SAFE_SESSION_MAX_LENGTH = 64;
const FILE_SUFFIX_PATTERN = /^(\.[a-z0-9-]+)+\.jsonl$/i;

const normalizeSessionSegment = (sessionId: string): string => {
  const trimmed = sessionId.trim();
  if (trimmed.length === 0) {
    return SAFE_SESSION_FALLBACK;
  }

  const normalized = trimmed
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[-._]+|[-._]+$/g, '')
    .slice(0, SAFE_SESSION_MAX_LENGTH);

  return normalized.length > 0 ? normalized : SAFE_SESSION_FALLBACK;
};

const ensureValidSuffix = (suffix: string): string => {
  if (!FILE_SUFFIX_PATTERN.test(suffix)) {
    throw new Error(`Invalid audit log suffix: ${suffix}`);
  }
  return suffix;
};

const buildSafeFileName = (sessionId: string, suffix: string): string => {
  const digest = createHash('sha256').update(sessionId).digest('hex').slice(0, 12);
  return `${normalizeSessionSegment(sessionId)}-${digest}${suffix}`;
};

export const resolveDesktopAuditFilePath = (sessionId: string, suffix: string): string => {
  const safeSuffix = ensureValidSuffix(suffix);
  const fileName = buildSafeFileName(sessionId, safeSuffix);
  const filePath = path.join(DESKTOP_AUDIT_DIR, fileName);
  const relative = path.relative(DESKTOP_AUDIT_DIR, filePath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Audit log path escaped audit directory');
  }

  return filePath;
};

export const appendDesktopAuditLog = async (options: {
  sessionId: string;
  suffix: string;
  payload: unknown;
}): Promise<void> => {
  const filePath = resolveDesktopAuditFilePath(options.sessionId, options.suffix);
  await fs.mkdir(DESKTOP_AUDIT_DIR, { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(options.payload)}\n`, 'utf-8');
};
