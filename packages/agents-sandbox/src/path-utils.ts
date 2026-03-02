/**
 * [PROVIDES]: 外部路径标准化与目录归属判断
 * [DEPENDS]: node:path
 * [POS]: 沙盒授权路径与跨模块权限判定的单一事实源
 */

import path from 'node:path';

const WINDOWS_DRIVE_ROOT_RE = /^[a-z]:\/$/i;

/**
 * 统一外部路径格式：
 * 1) trim + resolve + normalize
 * 2) 统一为 `/` 分隔符，跨平台可比较
 * 3) 去掉非根路径尾部 `/`
 * 4) Windows 下转小写，避免大小写差异导致重复授权
 */
export const normalizeAuthorizedPath = (value: string): string => {
  const resolved = path.resolve(value.trim());
  const normalized = path.normalize(resolved).replace(/\\/g, '/');
  const isRootPath = normalized === '/' || WINDOWS_DRIVE_ROOT_RE.test(normalized);
  const trimmed = isRootPath ? normalized : normalized.replace(/\/+$/g, '');
  return process.platform === 'win32' ? trimmed.toLowerCase() : trimmed;
};

/**
 * 判断 candidate 是否等于 root 或位于 root 下方。
 */
export const isPathEqualOrWithin = (candidate: string, root: string): boolean => {
  if (candidate === root) {
    return true;
  }
  if (root === '/' || WINDOWS_DRIVE_ROOT_RE.test(root)) {
    return candidate.startsWith(root);
  }
  return candidate.startsWith(`${root}/`);
};
