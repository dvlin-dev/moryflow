/**
 * [PROVIDES]: Skills 在线 revision 检查与远端快照下载
 * [DEPENDS]: node:fs/node:path, skills/constants, skills/file-utils
 * [POS]: Skills 远端同步网络边界
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  MAX_REMOTE_SKILL_FILES,
  MAX_REMOTE_SKILL_TOTAL_BYTES,
  REMOTE_REQUEST_TIMEOUT_MS,
} from './constants.js';
import { isInsidePath } from './file-utils.js';
import type { CuratedSkill } from './types.js';

type GitHubCommit = {
  sha: string;
};

type GitHubTreeEntry = {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  size?: number;
};

type FetchControlOptions = {
  includeAuthToken?: boolean;
  allowedHosts?: ReadonlySet<string>;
};

type GitHubTreeResponse = {
  tree: GitHubTreeEntry[];
  truncated: boolean;
};

type RemoteSkillFile = {
  relativePath: string;
  remotePath: string;
  mode: number;
  size: number | null;
};

const GITHUB_API_HOSTS = new Set(['api.github.com']);
const GITHUB_DOWNLOAD_HOSTS = new Set(['raw.githubusercontent.com', 'codeload.github.com']);
const DEFAULT_FILE_MODE = 0o644;

const buildHeaders = (includeAuthToken: boolean): HeadersInit => {
  const headers: HeadersInit = {
    'User-Agent': 'moryflow-pc-skills-sync',
  };

  if (includeAuthToken) {
    const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    if (token && token.trim().length > 0) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
};

const assertTrustedHttpsUrl = (url: string, allowedHosts?: ReadonlySet<string>): URL => {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') {
    throw new Error(`Blocked non-https url: ${url}`);
  }
  if (allowedHosts && !allowedHosts.has(parsed.hostname)) {
    throw new Error(`Blocked untrusted host: ${parsed.hostname}`);
  }
  return parsed;
};

const fetchWithTimeout = async (
  url: string,
  init?: RequestInit,
  options?: FetchControlOptions
): Promise<Response> => {
  assertTrustedHttpsUrl(url, options?.allowedHosts);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        ...buildHeaders(options?.includeAuthToken !== false),
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} when requesting ${url}`);
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
};

const encodeGitHubPath = (value: string): string =>
  value
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

const buildCommitsApiUrl = (skill: CuratedSkill): string => {
  const params = new URLSearchParams({
    sha: skill.source.ref,
    path: skill.source.path,
    per_page: '1',
  });
  return `https://api.github.com/repos/${skill.source.owner}/${skill.source.repo}/commits?${params.toString()}`;
};

const buildTreeApiUrl = (skill: CuratedSkill, revision: string): string => {
  const treeRef = encodeURIComponent(`${revision}:${skill.source.path}`);
  return `https://api.github.com/repos/${skill.source.owner}/${skill.source.repo}/git/trees/${treeRef}?recursive=1`;
};

const buildRawDownloadUrl = (skill: CuratedSkill, revision: string, remotePath: string): string => {
  const encodedPath = encodeGitHubPath(remotePath);
  return `https://raw.githubusercontent.com/${skill.source.owner}/${skill.source.repo}/${encodeURIComponent(revision)}/${encodedPath}`;
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    },
    { allowedHosts: GITHUB_API_HOSTS }
  );
  return (await response.json()) as T;
};

const readResponseBufferWithLimit = async (
  response: Response,
  maxBytes: number
): Promise<Buffer> => {
  const contentLengthHeader = response.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new Error(`File exceeded remaining size limit (${maxBytes} bytes)`);
    }
  }

  if (!response.body) {
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > maxBytes) {
      throw new Error(`File exceeded remaining size limit (${maxBytes} bytes)`);
    }
    return Buffer.from(arrayBuffer);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new Error(`File exceeded remaining size limit (${maxBytes} bytes)`);
    }
    chunks.push(value);
  }

  return Buffer.concat(
    chunks.map((chunk) => Buffer.from(chunk)),
    totalBytes
  );
};

const fetchFileBuffer = async (url: string, maxBytes: number): Promise<Buffer> => {
  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        Accept: 'application/octet-stream',
      },
    },
    {
      includeAuthToken: false,
      allowedHosts: GITHUB_DOWNLOAD_HOSTS,
    }
  );
  return readResponseBufferWithLimit(response, maxBytes);
};

const ensureSafeLocalPath = (targetRoot: string, relativePath: string): string => {
  const localPath = path.join(targetRoot, ...relativePath.split('/'));
  if (!isInsidePath(targetRoot, localPath)) {
    throw new Error(`Invalid remote file path: ${relativePath}`);
  }
  return localPath;
};

const normalizeFileMode = (mode: string): number => {
  const parsed = Number.parseInt(mode, 8);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_FILE_MODE;
  }
  const permissionBits = parsed & 0o777;
  return permissionBits > 0 ? permissionBits : DEFAULT_FILE_MODE;
};

const listRemoteSkillFiles = async (
  skill: CuratedSkill,
  revision: string
): Promise<RemoteSkillFile[]> => {
  const payload = await fetchJson<GitHubTreeResponse>(buildTreeApiUrl(skill, revision));
  if (payload.truncated) {
    throw new Error(`Git tree payload truncated for ${skill.name}`);
  }

  return payload.tree
    .filter((entry) => entry.type === 'blob')
    .map((entry) => {
      const normalizedPath = entry.path.replace(/^\/+/, '');
      if (!normalizedPath || normalizedPath.startsWith('..')) {
        return null;
      }

      const remotePath = path.posix.join(skill.source.path, normalizedPath);
      const size =
        typeof entry.size === 'number' && Number.isFinite(entry.size) ? entry.size : null;
      return {
        relativePath: normalizedPath,
        remotePath,
        mode: normalizeFileMode(entry.mode),
        size,
      } satisfies RemoteSkillFile;
    })
    .filter((entry): entry is RemoteSkillFile => entry !== null);
};

export const fetchLatestRevision = async (skill: CuratedSkill): Promise<string> => {
  const commits = await fetchJson<GitHubCommit[]>(buildCommitsApiUrl(skill));
  const latest = commits[0]?.sha;
  if (!latest) {
    throw new Error(`No commits found for ${skill.name}`);
  }
  return latest;
};

export const downloadSkillSnapshot = async (
  skill: CuratedSkill,
  revision: string,
  targetDir: string
): Promise<void> => {
  await fs.mkdir(targetDir, { recursive: true });

  const remoteFiles = await listRemoteSkillFiles(skill, revision);
  let fileCount = 0;
  let totalBytes = 0;

  for (const file of remoteFiles) {
    if (fileCount >= MAX_REMOTE_SKILL_FILES) {
      throw new Error(`Skill ${skill.name} exceeded max file limit (${MAX_REMOTE_SKILL_FILES})`);
    }

    const remainingBytes = MAX_REMOTE_SKILL_TOTAL_BYTES - totalBytes;
    if (remainingBytes <= 0) {
      throw new Error(
        `Skill ${skill.name} exceeded max size limit (${MAX_REMOTE_SKILL_TOTAL_BYTES} bytes)`
      );
    }

    if (file.size !== null && file.size > remainingBytes) {
      throw new Error(
        `Skill ${skill.name} exceeded max size limit (${MAX_REMOTE_SKILL_TOTAL_BYTES} bytes)`
      );
    }

    const downloadUrl = buildRawDownloadUrl(skill, revision, file.remotePath);
    const content = await fetchFileBuffer(downloadUrl, remainingBytes);
    totalBytes += content.byteLength;
    if (totalBytes > MAX_REMOTE_SKILL_TOTAL_BYTES) {
      throw new Error(
        `Skill ${skill.name} exceeded max size limit (${MAX_REMOTE_SKILL_TOTAL_BYTES} bytes)`
      );
    }

    const localPath = ensureSafeLocalPath(targetDir, file.relativePath);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, content, { mode: file.mode });
    fileCount += 1;
  }

  const skillFile = path.join(targetDir, 'SKILL.md');
  const stat = await fs.stat(skillFile).catch(() => null);
  if (!stat?.isFile()) {
    throw new Error(`Remote snapshot for ${skill.name} is missing SKILL.md`);
  }
};
