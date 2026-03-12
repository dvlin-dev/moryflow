/**
 * [PROVIDES]: Skills 模块路径、并发与安全阈值常量
 * [DEPENDS]: node:os/node:path/node:url
 * [POS]: Moryflow PC Skills 常量定义
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILLS_MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

export const SKILLS_LOG_PREFIX = '[skills-registry]';

export const MORYFLOW_DIR = path.join(os.homedir(), '.moryflow');
export const SKILLS_DIR = path.join(MORYFLOW_DIR, 'skills');
export const CURATED_SKILLS_DIR = path.join(MORYFLOW_DIR, 'curated-skills');
export const STATE_FILE = path.join(MORYFLOW_DIR, 'skills-state.json');

export const MAX_SKILL_FILE_LIST = 200;
export const MAX_REMOTE_SYNC_CONCURRENCY = 4;
export const MAX_REMOTE_SKILL_FILES = 600;
export const MAX_REMOTE_SKILL_TOTAL_BYTES = 25 * 1024 * 1024;
export const REMOTE_REQUEST_TIMEOUT_MS = 5000;
export const REMOTE_SYNC_SUCCESS_TTL_MS = 6 * 60 * 60 * 1000;
export const REMOTE_SYNC_FAILURE_TTL_MS = 30 * 60 * 1000;

export const resolveBundledSkillRoots = (): string[] => {
  const roots = new Set<string>();
  const add = (candidate: string | null | undefined) => {
    if (!candidate || candidate.trim().length === 0) {
      return;
    }
    roots.add(path.resolve(candidate));
  };

  // 开发态：读取仓库内置 skill。
  add(path.join(process.cwd(), 'apps/moryflow/pc/src/main/skills/builtin'));
  // 构建态：electron-vite 输出目录。
  add(path.join(SKILLS_MODULE_DIR, 'builtin'));
  // 历史输出路径容错。
  add(path.join(SKILLS_MODULE_DIR, 'skills', 'builtin'));

  const processWithResourcesPath = process as NodeJS.Process & { resourcesPath?: string };
  const resourcesPath =
    typeof processWithResourcesPath.resourcesPath === 'string' &&
    processWithResourcesPath.resourcesPath.trim().length > 0
      ? processWithResourcesPath.resourcesPath
      : null;

  if (resourcesPath) {
    add(path.join(resourcesPath, 'app.asar', 'dist', 'main', 'builtin'));
    add(path.join(resourcesPath, 'app.asar.unpacked', 'dist', 'main', 'builtin'));
    add(path.join(resourcesPath, 'skills', 'builtin'));
  }

  return Array.from(roots);
};
