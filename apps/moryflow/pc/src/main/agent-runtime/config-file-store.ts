/**
 * [PROVIDES]: Desktop Runtime 配置文件读写基座（串行化更新）
 * [DEPENDS]: node:crypto, node:fs, node:path, node:os
 * [POS]: 统一 `~/.moryflow/config.jsonc` 的原子读写，避免多模块并发写覆盖
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CONFIG_DIR = path.join(os.homedir(), '.moryflow');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.jsonc');

const writeDesktopConfigFile = async (content: string): Promise<void> => {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  const tmpPath = `${CONFIG_PATH}.${randomUUID()}.tmp`;
  await fs.writeFile(tmpPath, content, 'utf-8');
  await fs.rename(tmpPath, CONFIG_PATH);
};

export const readDesktopConfigFile = async (): Promise<string> => {
  try {
    return await fs.readFile(CONFIG_PATH, 'utf-8');
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
};

export const readDesktopConfigFileSync = (): string => {
  try {
    return readFileSync(CONFIG_PATH, 'utf-8');
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
};

let writeQueue: Promise<void> = Promise.resolve();

/**
 * 串行化配置写入，确保每次更新都基于最新磁盘内容，避免跨模块 cache 覆盖。
 */
export const updateDesktopConfigFile = async (
  updater: (currentContent: string) => string | Promise<string>
): Promise<string> => {
  const operation = writeQueue.then(async () => {
    const currentContent = await readDesktopConfigFile();
    const nextContent = await updater(currentContent);
    if (nextContent !== currentContent) {
      await writeDesktopConfigFile(nextContent);
    }
    return nextContent;
  });

  writeQueue = operation.then(
    () => undefined,
    () => undefined
  );

  return operation;
};
