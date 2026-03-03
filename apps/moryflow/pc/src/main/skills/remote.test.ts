import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { downloadSkillSnapshot, fetchLatestRevision } from './remote';
import type { CuratedSkill } from './types';

const TEST_SKILL: CuratedSkill = {
  name: 'agent-browser',
  fallbackTitle: 'Agent Browser',
  fallbackDescription: 'desc',
  preinstall: true,
  recommended: true,
  source: {
    owner: 'vercel-labs',
    repo: 'agent-browser',
    ref: 'main',
    path: 'skills/agent-browser',
    sourceUrl: 'https://github.com/vercel-labs/agent-browser/tree/main/skills/agent-browser',
  },
};

const readHeader = (headers: HeadersInit | undefined, key: string): string | undefined => {
  if (!headers) {
    return undefined;
  }

  if (headers instanceof Headers) {
    return headers.get(key) ?? undefined;
  }

  const normalized = key.toLowerCase();

  if (Array.isArray(headers)) {
    const found = headers.find(([name]) => name.toLowerCase() === normalized);
    return found?.[1];
  }

  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === normalized) {
      return String(value);
    }
  }

  return undefined;
};

describe('skills remote', () => {
  const originalGitHubToken = process.env.GITHUB_TOKEN;
  const originalGhToken = process.env.GH_TOKEN;

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.GITHUB_TOKEN = originalGitHubToken;
    process.env.GH_TOKEN = originalGhToken;
  });

  it('fetches latest revision by skill path', async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.includes('/commits?')) {
        return new Response(JSON.stringify([{ sha: 'rev-123' }]), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchLatestRevision(TEST_SKILL)).resolves.toBe('rev-123');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('downloads remote skill snapshot into target directory', async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.includes('/contents/skills/agent-browser?')) {
        return new Response(
          JSON.stringify([
            {
              type: 'file',
              name: 'SKILL.md',
              path: 'skills/agent-browser/SKILL.md',
              download_url: 'https://raw.githubusercontent.com/demo/SKILL.md',
            },
            {
              type: 'dir',
              name: 'references',
              path: 'skills/agent-browser/references',
              download_url: null,
            },
          ]),
          { status: 200 }
        );
      }

      if (input.includes('/contents/skills/agent-browser/references?')) {
        return new Response(
          JSON.stringify([
            {
              type: 'file',
              name: 'usage.md',
              path: 'skills/agent-browser/references/usage.md',
              download_url: 'https://raw.githubusercontent.com/demo/usage.md',
            },
          ]),
          { status: 200 }
        );
      }

      if (input.endsWith('/SKILL.md')) {
        return new Response('# Agent Browser\n\nbody', { status: 200 });
      }

      if (input.endsWith('/usage.md')) {
        return new Response('usage', { status: 200 });
      }

      return new Response('not found', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-remote-test-'));
    const targetDir = path.join(tempRoot, 'agent-browser');

    await downloadSkillSnapshot(TEST_SKILL, 'rev-123', targetDir);

    const skillMd = await fs.readFile(path.join(targetDir, 'SKILL.md'), 'utf-8');
    const usage = await fs.readFile(path.join(targetDir, 'references', 'usage.md'), 'utf-8');

    expect(skillMd).toContain('Agent Browser');
    expect(usage).toBe('usage');

    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('rejects untrusted download host', async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.includes('/contents/skills/agent-browser?')) {
        return new Response(
          JSON.stringify([
            {
              type: 'file',
              name: 'SKILL.md',
              path: 'skills/agent-browser/SKILL.md',
              download_url: 'https://evil.example.com/SKILL.md',
            },
          ]),
          { status: 200 }
        );
      }

      return new Response('not found', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-remote-test-'));
    const targetDir = path.join(tempRoot, 'agent-browser');

    await expect(downloadSkillSnapshot(TEST_SKILL, 'rev-123', targetDir)).rejects.toThrow(
      'Blocked untrusted host'
    );

    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('keeps auth token on GitHub API calls but strips it from file download requests', async () => {
    process.env.GITHUB_TOKEN = 'test-token';
    delete process.env.GH_TOKEN;

    let apiAuthHeader: string | undefined;
    let downloadAuthHeader: string | undefined;

    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input.includes('/contents/skills/agent-browser?')) {
        apiAuthHeader = readHeader(init?.headers, 'authorization');
        return new Response(
          JSON.stringify([
            {
              type: 'file',
              name: 'SKILL.md',
              path: 'skills/agent-browser/SKILL.md',
              download_url: 'https://raw.githubusercontent.com/demo/SKILL.md',
            },
          ]),
          { status: 200 }
        );
      }

      if (input.endsWith('/SKILL.md')) {
        downloadAuthHeader = readHeader(init?.headers, 'authorization');
        return new Response('# Agent Browser\n\nbody', { status: 200 });
      }

      return new Response('not found', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-remote-test-'));
    const targetDir = path.join(tempRoot, 'agent-browser');

    await downloadSkillSnapshot(TEST_SKILL, 'rev-123', targetDir);

    expect(apiAuthHeader).toBe('Bearer test-token');
    expect(downloadAuthHeader).toBeUndefined();

    await fs.rm(tempRoot, { recursive: true, force: true });
  });
});
