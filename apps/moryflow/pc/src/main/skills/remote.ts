/**
 * [PROVIDES]: Skills 在线 revision 检查与远端快照下载
 * [DEPENDS]: node:fs/node:path, skills/constants, skills/file-utils
 * [POS]: Skills 远端同步网络边界
 *
 * [PROTOCOL]: 本文件变更时，必须同步更新 Header 与 `src/main/CLAUDE.md`
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

type GitHubContentsEntry = {
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  name: string;
  path: string;
  download_url: string | null;
};

type FetchControlOptions = {
  includeAuthToken?: boolean;
  allowedHosts?: ReadonlySet<string>;
};

const GITHUB_API_HOSTS = new Set(['api.github.com']);
const GITHUB_DOWNLOAD_HOSTS = new Set(['raw.githubusercontent.com', 'codeload.github.com']);

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

const buildContentsApiUrl = (skill: CuratedSkill, revision: string, remotePath: string): string => {
  const encodedPath = encodeGitHubPath(remotePath);
  return `https://api.github.com/repos/${skill.source.owner}/${skill.source.repo}/contents/${encodedPath}?ref=${encodeURIComponent(revision)}`;
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

const fetchFileBuffer = async (url: string): Promise<Buffer> => {
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
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const listContents = async (
  skill: CuratedSkill,
  revision: string,
  remotePath: string
): Promise<GitHubContentsEntry[]> => {
  const url = buildContentsApiUrl(skill, revision, remotePath);
  const payload = await fetchJson<GitHubContentsEntry[] | GitHubContentsEntry>(url);
  if (Array.isArray(payload)) {
    return payload;
  }
  return [payload];
};

const ensureSafeLocalPath = (targetRoot: string, relativePath: string): string => {
  const localPath = path.join(targetRoot, ...relativePath.split('/'));
  if (!isInsidePath(targetRoot, localPath)) {
    throw new Error(`Invalid remote file path: ${relativePath}`);
  }
  return localPath;
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

  const queue: string[] = [skill.source.path];
  let fileCount = 0;
  let totalBytes = 0;

  while (queue.length > 0) {
    const currentRemotePath = queue.shift();
    if (!currentRemotePath) {
      continue;
    }

    const entries = await listContents(skill, revision, currentRemotePath);
    for (const entry of entries) {
      if (entry.type === 'dir') {
        queue.push(entry.path);
        continue;
      }

      if (entry.type !== 'file') {
        continue;
      }

      const relativePath = path.posix.relative(skill.source.path, entry.path);
      if (!relativePath || relativePath.startsWith('..')) {
        continue;
      }

      if (!entry.download_url) {
        throw new Error(`Missing download URL for ${skill.name}/${entry.path}`);
      }

      if (fileCount >= MAX_REMOTE_SKILL_FILES) {
        throw new Error(`Skill ${skill.name} exceeded max file limit (${MAX_REMOTE_SKILL_FILES})`);
      }

      const content = await fetchFileBuffer(entry.download_url);
      totalBytes += content.byteLength;
      if (totalBytes > MAX_REMOTE_SKILL_TOTAL_BYTES) {
        throw new Error(
          `Skill ${skill.name} exceeded max size limit (${MAX_REMOTE_SKILL_TOTAL_BYTES} bytes)`
        );
      }

      const localPath = ensureSafeLocalPath(targetDir, relativePath);
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, content);
      fileCount += 1;
    }
  }

  const skillFile = path.join(targetDir, 'SKILL.md');
  const stat = await fs.stat(skillFile).catch(() => null);
  if (!stat?.isFile()) {
    throw new Error(`Remote snapshot for ${skill.name} is missing SKILL.md`);
  }
};
