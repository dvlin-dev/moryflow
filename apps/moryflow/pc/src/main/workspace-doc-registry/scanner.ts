import path from 'node:path';
import type { Dirent } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { normalizeSyncPath } from '@moryflow/sync';

export interface WorkspaceDocCandidate {
  path: string;
  // Stable identity used to keep the same documentId across rename/move.
  fingerprint: string;
  // Content-level fingerprint for offline change detection during reconcile.
  contentFingerprint: string;
}

const isMarkdownFile = (name: string): boolean => {
  const lower = name.toLowerCase();
  return lower.endsWith('.md') || lower.endsWith('.markdown');
};

const buildFingerprints = async (
  fullPath: string
): Promise<Pick<WorkspaceDocCandidate, 'fingerprint' | 'contentFingerprint'>> => {
  const info = await stat(fullPath);
  return {
    fingerprint: `${info.dev}:${info.ino}`,
    contentFingerprint: `${info.size}:${info.mtimeMs}`,
  };
};

export const scanWorkspaceDocuments = async (
  workspacePath: string,
  relativePath = ''
): Promise<WorkspaceDocCandidate[]> => {
  const fullPath = relativePath ? path.join(workspacePath, relativePath) : workspacePath;
  let entries: Dirent[];

  try {
    entries = await readdir(fullPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: WorkspaceDocCandidate[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const nextRelativePath = normalizeSyncPath(
      relativePath ? `${relativePath}/${entry.name}` : entry.name
    );
    const nextFullPath = path.join(workspacePath, nextRelativePath);

    if (entry.isDirectory()) {
      results.push(...(await scanWorkspaceDocuments(workspacePath, nextRelativePath)));
      continue;
    }

    if (!isMarkdownFile(entry.name)) {
      continue;
    }

    const fingerprints = await buildFingerprints(nextFullPath);
    results.push({
      path: nextRelativePath,
      ...fingerprints,
    });
  }

  return results;
};
