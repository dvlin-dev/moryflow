/**
 * [PROVIDES]: 外链与导航校验（openExternal + will-navigate guard）
 * [DEPENDS]: electron shell, node:url, node:path
 * [POS]: main 进程安全边界（外链与导航拦截）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

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

export const isAllowedExternalUrl = (rawUrl: string, policy: ExternalLinkPolicy): boolean => {
  try {
    const parsed = new URL(rawUrl);
    if (
      parsed.protocol === 'http:' &&
      policy.allowLocalhostHttp &&
      LOCALHOST_HOSTS.has(parsed.hostname)
    ) {
      return true;
    }

    return policy.allowedProtocols.has(parsed.protocol);
  } catch {
    return false;
  }
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
  if (!isAllowedExternalUrl(rawUrl, policy)) {
    console.warn('[external-links] blocked openExternal:', rawUrl);
    return false;
  }

  try {
    await shell.openExternal(rawUrl);
    return true;
  } catch (error) {
    console.error('[external-links] openExternal failed:', error);
    return false;
  }
};
