/**
 * [PROVIDES]: Skills 文件系统与解析工具（安全路径/Frontmatter/目录复制）
 * [DEPENDS]: node:fs/node:path, skills/constants, skills/types
 * [POS]: Skills registry 的底层工具层
 * [UPDATE]: 2026-03-03 - 原子替换支持 requireExistingTarget，避免并发卸载被覆盖回弹
 *
 * [PROTOCOL]: 本文件变更时，必须同步更新 Header 与 `src/main/CLAUDE.md`
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { MAX_SKILL_FILE_LIST } from './constants.js';
import type { ParsedSkill } from './types.js';

export const toKebabCase = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

export const xmlEscape = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

export const isInsidePath = (baseDir: string, targetPath: string): boolean => {
  const rel = path.relative(baseDir, targetPath);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

export const readIfExists = async (targetPath: string): Promise<string | null> => {
  try {
    return await fs.readFile(targetPath, 'utf-8');
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

export const directoryExists = async (targetPath: string): Promise<boolean> => {
  const stat = await fs.stat(targetPath).catch(() => null);
  return Boolean(stat?.isDirectory());
};

const parseFrontmatter = (raw: string): { attrs: Record<string, string>; body: string } => {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) {
    return { attrs: {}, body: raw };
  }

  const attrs: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx <= 0) {
      continue;
    }
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key || !value) {
      continue;
    }
    attrs[key] = value.replace(/^['"]|['"]$/g, '');
  }

  return { attrs, body: raw.slice(match[0].length) };
};

const resolveTitleFromBody = (body: string): string | null => {
  const heading = body.match(/^#\s+(.+)$/m);
  return heading?.[1]?.trim() ?? null;
};

const resolveDescriptionFromBody = (body: string): string | null => {
  const lines = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
  if (lines.length === 0) {
    return null;
  }
  return lines[0];
};

const collectFiles = async (baseDir: string): Promise<string[]> => {
  const files: string[] = [];

  const walk = async (dir: string) => {
    if (files.length >= MAX_SKILL_FILE_LIST) {
      return;
    }

    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= MAX_SKILL_FILE_LIST) {
        break;
      }

      if (entry.isSymbolicLink()) {
        continue;
      }

      const abs = path.join(dir, entry.name);
      if (!isInsidePath(baseDir, abs)) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(abs);
        continue;
      }

      if (entry.isFile()) {
        files.push(abs);
      }
    }
  };

  await walk(baseDir);
  return files;
};

export const parseSkillFromDirectory = async (skillDir: string): Promise<ParsedSkill | null> => {
  const stat = await fs.lstat(skillDir).catch(() => null);
  if (!stat || !stat.isDirectory() || stat.isSymbolicLink()) {
    return null;
  }

  const realBase = await fs.realpath(skillDir).catch(() => null);
  if (!realBase) {
    return null;
  }

  const skillFile = path.join(realBase, 'SKILL.md');
  const raw = await readIfExists(skillFile);
  if (!raw) {
    return null;
  }

  const { attrs, body } = parseFrontmatter(raw);
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return null;
  }

  const directoryName = toKebabCase(path.basename(realBase));
  const frontmatterName = attrs['name'] ? toKebabCase(attrs['name']) : '';
  const name = directoryName || frontmatterName;
  if (!name) {
    return null;
  }

  const title = attrs['title'] ?? resolveTitleFromBody(trimmedBody) ?? name;
  const description =
    attrs['description'] ?? resolveDescriptionFromBody(trimmedBody) ?? 'No description provided.';
  const files = await collectFiles(realBase);
  const mtime = (await fs.stat(skillFile)).mtimeMs;

  return {
    name,
    title,
    description,
    content: trimmedBody,
    location: realBase,
    updatedAt: Math.floor(mtime),
    files,
  };
};

export const copyDirectoryTree = async (sourceDir: string, targetDir: string): Promise<void> => {
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const sourceEntry = path.join(sourceDir, entry.name);
    const targetEntry = path.join(targetDir, entry.name);

    if (!isInsidePath(targetDir, targetEntry)) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyDirectoryTree(sourceEntry, targetEntry);
      continue;
    }

    if (entry.isFile()) {
      await fs.mkdir(path.dirname(targetEntry), { recursive: true });
      await fs.copyFile(sourceEntry, targetEntry);
    }
  }
};

export const removeDirectoryIfExists = async (targetDir: string): Promise<void> => {
  await fs.rm(targetDir, { recursive: true, force: true });
};

type ReplaceDirectoryOptions = {
  requireExistingTarget?: boolean;
};

export const replaceDirectoryAtomically = async (
  stagingDir: string,
  targetDir: string,
  options: ReplaceDirectoryOptions = {}
): Promise<boolean> => {
  const parentDir = path.dirname(targetDir);
  await fs.mkdir(parentDir, { recursive: true });

  const backupDir = path.join(
    parentDir,
    `${path.basename(targetDir)}.backup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  const hasTarget = await directoryExists(targetDir);
  if (options.requireExistingTarget && !hasTarget) {
    return false;
  }

  if (hasTarget) {
    await fs.rename(targetDir, backupDir);
  }

  try {
    await fs.rename(stagingDir, targetDir);
    if (hasTarget) {
      await fs.rm(backupDir, { recursive: true, force: true });
    }
    return true;
  } catch (error) {
    if (hasTarget) {
      const backupExists = await directoryExists(backupDir);
      if (backupExists) {
        await fs.rename(backupDir, targetDir).catch(() => undefined);
      }
    }
    throw error;
  }
};
