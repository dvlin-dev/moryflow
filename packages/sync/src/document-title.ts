/**
 * [PROVIDES]: sync 文档标题归一化工具
 * [DEPENDS]: path canonical 工具
 * [POS]: PC/Server 共享的 document title 派生事实源
 */

import { normalizeSyncPath } from './path.js';

const basenameFromSyncPath = (rawPath: string): string => {
  const normalized = normalizeSyncPath(rawPath);
  const segments = normalized.split('/').filter((segment) => segment.length > 0);
  return segments.at(-1) ?? normalized;
};

const stripLastExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex <= 0) {
    return fileName;
  }

  return fileName.slice(0, lastDotIndex);
};

export function resolveSyncDocumentTitle(rawPath: string, rawTitle?: string | null): string {
  const explicitTitle = rawTitle?.trim();
  if (explicitTitle) {
    return explicitTitle;
  }

  const fileName = basenameFromSyncPath(rawPath);
  const stemTitle = stripLastExtension(fileName).trim();
  if (stemTitle.length > 0) {
    return stemTitle;
  }

  const fileNameTitle = fileName.trim();
  if (fileNameTitle.length > 0) {
    return fileNameTitle;
  }

  const normalizedPath = normalizeSyncPath(rawPath).trim();
  return normalizedPath.length > 0 ? normalizedPath : 'Untitled';
}
