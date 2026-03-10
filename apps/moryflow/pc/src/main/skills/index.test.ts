import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { CuratedSkill } from './types';

const TEST_SKILL: CuratedSkill = {
  name: 'test-skill',
  fallbackTitle: 'Test Skill',
  fallbackDescription: 'desc',
  preinstall: true,
  recommended: true,
  source: {
    owner: 'example',
    repo: 'skills',
    ref: 'main',
    path: 'skills/test-skill',
    sourceUrl: 'https://github.com/example/skills/tree/main/skills/test-skill',
  },
};

const createDeferred = <T>() => {
  let resolve: (value: T) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const exists = async (targetPath: string): Promise<boolean> => {
  const stat = await fs.stat(targetPath).catch(() => null);
  return Boolean(stat);
};

describe('skills registry', () => {
  let tempRoot = '';
  let bundledRoot = '';
  let stateFile = '';
  let skillsDir = '';
  let curatedDir = '';
  let resetRegistryForTests: (() => Promise<void>) | null = null;

  const importRegistry = async (options?: {
    fetchLatestRevision?: (skill: CuratedSkill) => Promise<string>;
    beforeOverwriteSkillFromDirectory?: (params: {
      sourceDir: string;
      targetDir: string;
    }) => Promise<void> | void;
    overwriteSkillFromRemote?: (
      skill: CuratedSkill,
      revision: string,
      targetDir: string
    ) => Promise<void>;
  }) => {
    vi.resetModules();

    vi.doMock('./catalog.js', () => ({
      CURATED_SKILLS: [TEST_SKILL],
      CURATED_SKILL_MAP: new Map([[TEST_SKILL.name, TEST_SKILL]]),
    }));

    vi.doMock('./constants.js', async () => {
      const actual = await vi.importActual<typeof import('./constants.js')>('./constants.js');
      return {
        ...actual,
        MORYFLOW_DIR: tempRoot,
        SKILLS_DIR: skillsDir,
        CURATED_SKILLS_DIR: curatedDir,
        STATE_FILE: stateFile,
        MAX_REMOTE_SYNC_CONCURRENCY: 1,
        resolveBundledSkillRoots: () => [bundledRoot],
      };
    });

    vi.doMock('./remote.js', async () => {
      const actual = await vi.importActual<typeof import('./remote.js')>('./remote.js');
      return {
        ...actual,
        fetchLatestRevision: options?.fetchLatestRevision ?? (async () => 'rev-1'),
      };
    });

    vi.doMock('./installer.js', async () => {
      const actual = await vi.importActual<typeof import('./installer.js')>('./installer.js');
      return {
        ...actual,
        overwriteSkillFromDirectory: async (
          sourceDir: string,
          targetDir: string,
          overwriteOptions?: { requireExistingTarget?: boolean }
        ) => {
          await options?.beforeOverwriteSkillFromDirectory?.({ sourceDir, targetDir });
          return actual.overwriteSkillFromDirectory(sourceDir, targetDir, overwriteOptions);
        },
        overwriteSkillFromRemote:
          options?.overwriteSkillFromRemote ?? actual.overwriteSkillFromRemote,
      };
    });

    const mod = await import('./index');
    resetRegistryForTests = mod.resetSkillsRegistryForTests;
    await mod.resetSkillsRegistryForTests();
    return mod;
  };

  const writeBaseState = async () => {
    await fs.mkdir(tempRoot, { recursive: true });
    await fs.writeFile(
      stateFile,
      JSON.stringify(
        {
          disabled: [],
          skippedPreinstall: [],
          managedSkills: {
            [TEST_SKILL.name]: {
              sourceUrl: TEST_SKILL.source.sourceUrl,
              revision: 'rev-1',
              checkedAt: 0,
              updatedAt: 0,
            },
          },
        },
        null,
        2
      ),
      'utf-8'
    );
  };

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-index-test-'));
    bundledRoot = path.join(tempRoot, 'bundled');
    stateFile = path.join(tempRoot, 'skills-state.json');
    skillsDir = path.join(tempRoot, 'skills');
    curatedDir = path.join(tempRoot, 'curated-skills');

    const bundledSkillDir = path.join(bundledRoot, TEST_SKILL.name);
    await fs.mkdir(bundledSkillDir, { recursive: true });
    await fs.writeFile(
      path.join(bundledSkillDir, 'SKILL.md'),
      `---
name: ${TEST_SKILL.name}
description: Demo
---

# Test Skill

Demo body
`,
      'utf-8'
    );

    await writeBaseState();
  });

  afterEach(async () => {
    if (resetRegistryForTests) {
      await resetRegistryForTests();
      resetRegistryForTests = null;
    }
    vi.doUnmock('./catalog.js');
    vi.doUnmock('./constants.js');
    vi.doUnmock('./remote.js');
    vi.doUnmock('./installer.js');
    vi.restoreAllMocks();
    vi.resetModules();
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    }
  });

  it('keeps disabled toggles when remote sync writes managed state', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    const deferredRevision = createDeferred<string>();
    const fetchLatestRevision = vi.fn(async () => deferredRevision.promise);
    const { getSkillsRegistry } = await importRegistry({ fetchLatestRevision });
    const registry = getSkillsRegistry();

    await registry.refresh();
    await registry.setEnabled(TEST_SKILL.name, false);
    deferredRevision.resolve('rev-1');
    await registry.waitForIdleForTests();

    const persisted = JSON.parse(await fs.readFile(stateFile, 'utf-8')) as {
      disabled: string[];
      managedSkills: Record<string, { checkedAt: number }>;
    };
    expect(persisted.managedSkills[TEST_SKILL.name]?.checkedAt).toBe(123);

    expect(persisted.disabled).toEqual([TEST_SKILL.name]);
  });

  it('keeps preinstall skill removed after explicit uninstall', async () => {
    const deferredRevision = createDeferred<string>();
    const { getSkillsRegistry } = await importRegistry({
      fetchLatestRevision: vi.fn(async () => deferredRevision.promise),
    });
    const registry = getSkillsRegistry();

    await registry.refresh();

    const installedDir = path.join(skillsDir, TEST_SKILL.name);
    expect(await exists(installedDir)).toBe(true);

    await registry.uninstall(TEST_SKILL.name);
    expect(await exists(installedDir)).toBe(false);

    const persisted = JSON.parse(await fs.readFile(stateFile, 'utf-8')) as {
      skippedPreinstall: string[];
    };
    expect(persisted.skippedPreinstall).toEqual([TEST_SKILL.name]);

    await registry.refresh();
    const persistedAfterRefresh = JSON.parse(await fs.readFile(stateFile, 'utf-8')) as {
      skippedPreinstall: string[];
    };
    expect(persistedAfterRefresh.skippedPreinstall).toEqual([TEST_SKILL.name]);
    expect(await exists(installedDir)).toBe(false);

    deferredRevision.resolve('rev-1');
    await registry.waitForIdleForTests();
  });

  it('does not reinstall when uninstall happens during remote sync overwrite', async () => {
    const overwriteStarted = createDeferred<void>();
    const releaseOverwrite = createDeferred<void>();
    const installedTarget = path.join(skillsDir, TEST_SKILL.name);
    const fetchLatestRevision = vi.fn(async () => 'rev-2');
    const { getSkillsRegistry } = await importRegistry({
      fetchLatestRevision,
      overwriteSkillFromRemote: vi.fn(async () => undefined),
      beforeOverwriteSkillFromDirectory: async ({ targetDir }) => {
        if (targetDir !== installedTarget) {
          return;
        }
        overwriteStarted.resolve();
        await releaseOverwrite.promise;
      },
    });
    const registry = getSkillsRegistry();

    await registry.refresh();
    await overwriteStarted.promise;

    await registry.uninstall(TEST_SKILL.name);
    releaseOverwrite.resolve();
    await registry.waitForIdleForTests();

    const persisted = JSON.parse(await fs.readFile(stateFile, 'utf-8')) as {
      managedSkills: Record<string, { revision: string }>;
    };
    expect(persisted.managedSkills[TEST_SKILL.name]?.revision).toBe('rev-2');

    expect(await exists(installedTarget)).toBe(false);
  });
});
