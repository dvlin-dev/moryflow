/**
 * [PROVIDES]: resolvePreloadPath - 预加载脚本路径解析
 * [DEPENDS]: node:path, node:fs
 * [POS]: 主进程为 BrowserWindow 提供 preload 路径
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import path from 'node:path';
import { existsSync } from 'node:fs';

/**
 * 解析预加载脚本路径，优先使用构建时传入的入口，其次尝试 js，再回退 mjs。
 */
export const resolvePreloadPath = () => {
  const candidate = process.env.ELECTRON_PRELOAD_ENTRY;
  if (candidate) {
    return path.join(__dirname, candidate);
  }

  const jsPath = path.join(__dirname, '../preload/index.js');
  if (existsSync(jsPath)) {
    return jsPath;
  }

  return path.join(__dirname, '../preload/index.mjs');
};
