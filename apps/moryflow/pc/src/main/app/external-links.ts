/**
 * [PROVIDES]: 外链与导航校验（openExternal + will-navigate guard）
 * [DEPENDS]: electron shell, node:url, node:path
 * [POS]: main 进程安全边界（外链与导航拦截）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const LOCALHOST_WITHOUT_SCHEME_PATTERN =
  /^(localhost|127\.0\.0\.1|\[::1\]|::1)(?::\d{1,5})?(?:[/?#].*)?$/i;

export type ExternalLinkPolicy = {
  allowedProtocols: Set<string>;
  allowLocalhostHttp: boolean;
  rendererOrigin: string | null;
  rendererRoot: string | null;
};

type ExternalLinkPolicyOptions = {
  rendererOrigin?: string | null;
  rendererRoot?: string | null;
  allowLocalhostHttp?: boolean;
};

export const createExternalLinkPolicy = (
  options: ExternalLinkPolicyOptions
): ExternalLinkPolicy => {
  return {
    allowedProtocols: new Set(['https:']),
    allowLocalhostHttp: options.allowLocalhostHttp ?? false,
    rendererOrigin: options.rendererOrigin ?? null,
    rendererRoot: options.rendererRoot ?? null,
  };
};

type ParsedExternalUrlCandidate = {
  normalized: string;
  parsed: URL;
};

const parseExternalUrlCandidate = (rawUrl: string): ParsedExternalUrlCandidate | null => {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = LOCALHOST_WITHOUT_SCHEME_PATTERN.test(trimmed) ? `http://${trimmed}` : trimmed;
  try {
    return { normalized, parsed: new URL(normalized) };
  } catch {
    return null;
  }
};

const isAllowedExternalUrlCandidate = (
  candidate: ParsedExternalUrlCandidate,
  policy: ExternalLinkPolicy
): boolean => {
  if (
    candidate.parsed.protocol === 'http:' &&
    policy.allowLocalhostHttp &&
    LOCALHOST_HOSTS.has(candidate.parsed.hostname.toLowerCase())
  ) {
    return true;
  }

  return policy.allowedProtocols.has(candidate.parsed.protocol);
};

export const isAllowedExternalUrl = (rawUrl: string, policy: ExternalLinkPolicy): boolean => {
  const candidate = parseExternalUrlCandidate(rawUrl);
  if (!candidate) {
    return false;
  }
  return isAllowedExternalUrlCandidate(candidate, policy);
};

export const isAllowedNavigationUrl = (rawUrl: string, policy: ExternalLinkPolicy): boolean => {
  try {
    const parsed = new URL(rawUrl);
    if (policy.rendererOrigin && parsed.origin === policy.rendererOrigin) {
      return true;
    }

    if (parsed.protocol === 'file:' && policy.rendererRoot) {
      const targetPath = fileURLToPath(parsed);
      const normalizedRoot = path.resolve(policy.rendererRoot);
      const normalizedTarget = path.resolve(targetPath);
      const relative = path.relative(normalizedRoot, normalizedTarget);
      if (relative === '') {
        return true;
      }
      if (relative === '..' || relative.startsWith(`..${path.sep}`)) {
        return false;
      }
      if (path.isAbsolute(relative)) {
        return false;
      }
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

export const openExternalSafe = async (
  rawUrl: string,
  policy: ExternalLinkPolicy
): Promise<boolean> => {
  const candidate = parseExternalUrlCandidate(rawUrl);
  if (!candidate || !isAllowedExternalUrlCandidate(candidate, policy)) {
    console.warn('[external-links] blocked openExternal:', rawUrl);
    return false;
  }

  try {
    await shell.openExternal(candidate.normalized);
    return true;
  } catch (error) {
    console.error('[external-links] openExternal failed:', error);
    return false;
  }
};
