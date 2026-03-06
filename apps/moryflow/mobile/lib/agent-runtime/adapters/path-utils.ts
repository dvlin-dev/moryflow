/**
 * 纯 JavaScript 路径工具
 * 不依赖 expo-file-system，避免 URL 编码问题
 */

import type { PathUtils } from '@moryflow/agents-adapter';

/**
 * 移除 file:// 前缀，返回纯路径
 */
function stripFileProtocol(filePath: string): string {
  return filePath.startsWith('file://') ? filePath.slice(7) : filePath;
}

/**
 * 检查是否有 file:// 前缀
 */
function hasFileProtocol(filePath: string): boolean {
  return filePath.startsWith('file://');
}

export const pathUtils: PathUtils = {
  join(...parts: string[]): string {
    const filtered = parts.filter((p) => p && p.length > 0);
    if (filtered.length === 0) return '';

    let result = filtered[0];
    for (let i = 1; i < filtered.length; i++) {
      const part = filtered[i];
      const cleanPart = part.startsWith('/') ? part.slice(1) : part;
      if (!result.endsWith('/')) {
        result += '/';
      }
      result += cleanPart;
    }
    return result;
  },

  resolve(...parts: string[]): string {
    return pathUtils.normalize(pathUtils.join(...parts));
  },

  dirname(filePath: string): string {
    if (!filePath) return '.';

    const hasProtocol = hasFileProtocol(filePath);
    const pathPart = stripFileProtocol(filePath);
    const normalized = pathPart.endsWith('/') ? pathPart.slice(0, -1) : pathPart;
    const lastSlash = normalized.lastIndexOf('/');

    if (lastSlash === -1) return '.';
    if (lastSlash === 0) return hasProtocol ? 'file:///' : '/';

    const result = normalized.slice(0, lastSlash);
    return hasProtocol ? `file://${result}` : result;
  },

  basename(filePath: string, ext?: string): string {
    if (!filePath) return '';

    const pathPart = stripFileProtocol(filePath);
    const normalized = pathPart.endsWith('/') ? pathPart.slice(0, -1) : pathPart;
    const lastSlash = normalized.lastIndexOf('/');
    const name = lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);

    if (ext && name.endsWith(ext)) {
      return name.slice(0, -ext.length);
    }
    return name;
  },

  extname(filePath: string): string {
    const name = pathUtils.basename(filePath);
    const lastDot = name.lastIndexOf('.');
    if (lastDot === -1 || lastDot === 0) return '';
    return name.slice(lastDot);
  },

  isAbsolute(filePath: string): boolean {
    return filePath.startsWith('/') || filePath.startsWith('file://');
  },

  normalize(filePath: string): string {
    if (!filePath) return '';

    const hasProtocol = hasFileProtocol(filePath);
    const pathPart = stripFileProtocol(filePath);
    const isAbsolute = pathPart.startsWith('/');

    const parts = pathPart.split('/');
    const result: string[] = [];

    for (const part of parts) {
      if (part === '' || part === '.') continue;
      if (part === '..') {
        if (result.length > 0) {
          result.pop();
        }
      } else {
        result.push(part);
      }
    }

    const normalizedPath = (isAbsolute ? '/' : '') + result.join('/');
    return hasProtocol ? `file://${normalizedPath}` : normalizedPath;
  },

  relative(from: string, to: string): string {
    const fromPath = stripFileProtocol(pathUtils.normalize(from));
    const toPath = stripFileProtocol(pathUtils.normalize(to));

    const fromParts = fromPath.split('/').filter((p) => p);
    const toParts = toPath.split('/').filter((p) => p);

    // 找到公共前缀
    let commonLength = 0;
    const minLength = Math.min(fromParts.length, toParts.length);
    for (let i = 0; i < minLength; i++) {
      if (fromParts[i] === toParts[i]) {
        commonLength++;
      } else {
        break;
      }
    }

    // 构建相对路径
    const upCount = fromParts.length - commonLength;
    const relativeParts = toParts.slice(commonLength);
    const result = [...Array(upCount).fill('..'), ...relativeParts];
    return result.join('/') || '.';
  },

  sep: '/',
};
