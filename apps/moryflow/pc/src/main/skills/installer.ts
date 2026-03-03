/**
 * [PROVIDES]: Skills 安装与原子覆盖能力（本地拷贝/远端下载）
 * [DEPENDS]: node:fs/node:path, skills/file-utils, skills/remote
 * [POS]: Skills 目录写入边界
 * [UPDATE]: 2026-03-03 - 覆盖安装增加 requireExistingTarget 守卫，规避并发卸载回弹
 *
 * [PROTOCOL]: 本文件变更时，必须同步更新 Header 与 `src/main/CLAUDE.md`
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { MORYFLOW_DIR } from './constants.js';
import {
  copyDirectoryTree,
  directoryExists,
  removeDirectoryIfExists,
  replaceDirectoryAtomically,
} from './file-utils.js';
import { downloadSkillSnapshot } from './remote.js';
import type { CuratedSkill } from './types.js';

const createStagingRoot = async (prefix: string): Promise<string> => {
  await fs.mkdir(MORYFLOW_DIR, { recursive: true });
  return fs.mkdtemp(path.join(MORYFLOW_DIR, `${prefix}-`));
};

const withStagingDirectory = async (
  skillName: string,
  action: (stagingDir: string) => Promise<void>
): Promise<void> => {
  const stagingRoot = await createStagingRoot(`skill-staging-${skillName}`);
  const stagingDir = path.join(stagingRoot, skillName);

  try {
    await action(stagingDir);
  } finally {
    await fs.rm(stagingRoot, { recursive: true, force: true });
  }
};

type OverwriteSkillOptions = {
  requireExistingTarget?: boolean;
};

export const installSkillIfMissing = async (
  sourceDir: string,
  targetDir: string
): Promise<boolean> => {
  if (await directoryExists(targetDir)) {
    return false;
  }

  await copyDirectoryTree(sourceDir, targetDir);
  return true;
};

export const overwriteSkillFromDirectory = async (
  sourceDir: string,
  targetDir: string,
  options: OverwriteSkillOptions = {}
): Promise<boolean> => {
  let replaced = false;
  await withStagingDirectory(path.basename(targetDir), async (stagingDir) => {
    await removeDirectoryIfExists(stagingDir);
    await copyDirectoryTree(sourceDir, stagingDir);
    replaced = await replaceDirectoryAtomically(stagingDir, targetDir, options);
  });
  return replaced;
};

export const overwriteSkillFromRemote = async (
  skill: CuratedSkill,
  revision: string,
  targetDir: string
): Promise<void> => {
  await withStagingDirectory(skill.name, async (stagingDir) => {
    await removeDirectoryIfExists(stagingDir);
    await downloadSkillSnapshot(skill, revision, stagingDir);
    await replaceDirectoryAtomically(stagingDir, targetDir);
  });
};
