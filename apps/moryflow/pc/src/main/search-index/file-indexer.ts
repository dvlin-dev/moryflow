/**
 * [INPUT]: Vault 路径与文件变更事件
 * [OUTPUT]: Files 索引构建计数
 * [POS]: PC 全局搜索 Files 索引器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import {
  deleteSearchDocumentById,
  deleteSearchDocumentsByIds,
  listSearchDocumentsByKind,
  upsertSearchDocument,
} from './store.js';

export type FileIndexer = {
  rebuild: (vaultPath: string) => Promise<number>;
  onFileAddedOrChanged: (vaultPath: string, filePath: string) => Promise<void>;
  onFileDeleted: (vaultPath: string, filePath: string) => Promise<void>;
};

const FILE_IGNORES = ['**/.git/**', '**/node_modules/**', '**/.moryflow/**'];

const isMarkdownFile = (filePath: string) => filePath.toLowerCase().endsWith('.md');

const resolveRelativePathWithinVault = (vaultPath: string, filePath: string): string | null => {
  const vaultRoot = path.resolve(vaultPath);
  const absoluteFilePath = path.resolve(filePath);
  const relativePath = path.relative(vaultRoot, absoluteFilePath);
  const isInside =
    relativePath === '' ||
    (!relativePath.startsWith(`..${path.sep}`) &&
      relativePath !== '..' &&
      !path.isAbsolute(relativePath));

  if (!isInside || relativePath.length === 0) {
    return null;
  }

  return relativePath;
};

const buildFileDocId = (vaultPath: string, relativePath: string) => {
  const digest = createHash('sha1').update(`${vaultPath}\n${relativePath}`).digest('hex');
  return `file:${digest}`;
};

const buildContentDigest = (content: string) => createHash('sha1').update(content).digest('hex');

const upsertFileDocument = async (vaultPath: string, absoluteFilePath: string) => {
  if (!isMarkdownFile(absoluteFilePath)) {
    return;
  }

  const relativePath = resolveRelativePathWithinVault(vaultPath, absoluteFilePath);
  if (!relativePath) {
    return;
  }

  let content = '';
  try {
    content = await readFile(absoluteFilePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      deleteSearchDocumentById(buildFileDocId(vaultPath, relativePath));
      return;
    }
    throw error;
  }

  const fileName = path.basename(relativePath);
  const now = Date.now();

  upsertSearchDocument({
    docId: buildFileDocId(vaultPath, relativePath),
    kind: 'file',
    vaultPath,
    entityKey: path.resolve(absoluteFilePath),
    title: fileName,
    body: content,
    updatedAt: now,
    digest: buildContentDigest(content),
    filePath: path.resolve(absoluteFilePath),
    relativePath,
    fileName,
  });
};

const syncRemovedFiles = (vaultPath: string, activeDocIds: Set<string>) => {
  const existing = listSearchDocumentsByKind('file', vaultPath);
  const staleDocIds = existing
    .filter((document) => !activeDocIds.has(document.docId))
    .map((document) => document.docId);
  deleteSearchDocumentsByIds(staleDocIds);
};

export const createFileIndexer = (): FileIndexer => {
  return {
    async rebuild(vaultPath: string) {
      const absoluteVaultPath = path.resolve(vaultPath);
      const absolutePaths = await fg('**/*.md', {
        cwd: absoluteVaultPath,
        absolute: true,
        onlyFiles: true,
        dot: false,
        followSymbolicLinks: false,
        ignore: FILE_IGNORES,
      });

      const activeDocIds = new Set<string>();

      for (const absolutePath of absolutePaths) {
        const relativePath = resolveRelativePathWithinVault(absoluteVaultPath, absolutePath);
        if (!relativePath) {
          continue;
        }
        activeDocIds.add(buildFileDocId(absoluteVaultPath, relativePath));
        await upsertFileDocument(absoluteVaultPath, absolutePath);
      }

      syncRemovedFiles(absoluteVaultPath, activeDocIds);
      return activeDocIds.size;
    },

    async onFileAddedOrChanged(vaultPath: string, filePath: string) {
      await upsertFileDocument(path.resolve(vaultPath), path.resolve(filePath));
    },

    async onFileDeleted(vaultPath: string, filePath: string) {
      if (!isMarkdownFile(filePath)) {
        return;
      }
      const absoluteVaultPath = path.resolve(vaultPath);
      const relativePath = resolveRelativePathWithinVault(absoluteVaultPath, filePath);
      if (!relativePath) {
        return;
      }
      deleteSearchDocumentById(buildFileDocId(absoluteVaultPath, relativePath));
    },
  };
};
