import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readSkillState, writeSkillState } from './state';

describe('skills state', () => {
  it('returns default state when file is missing', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-state-test-'));
    const statePath = path.join(tempRoot, 'skills-state.json');

    const state = await readSkillState(statePath);
    expect(state).toEqual({ disabled: [], skippedPreinstall: [], managedSkills: {} });

    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('migrates legacy curatedPreinstalled state to skipped preinstall list', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-state-test-'));
    const statePath = path.join(tempRoot, 'skills-state.json');

    await fs.writeFile(
      statePath,
      JSON.stringify({
        disabled: [],
        curatedPreinstalled: true,
      })
    );

    const state = await readSkillState(statePath);
    expect(state.skippedPreinstall).toEqual(['find-skills', 'skill-creator']);

    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('normalizes disabled names and keeps managed skill records', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-state-test-'));
    const statePath = path.join(tempRoot, 'skills-state.json');

    await fs.writeFile(
      statePath,
      JSON.stringify({
        disabled: ['Agent Browser', '', 'remotion'],
        skippedPreinstall: ['Agent Browser', '', 'test-skill'],
        managedSkills: {
          'Agent Browser': {
            sourceUrl: 'https://example.com',
            revision: 'abc123',
            checkedAt: 1,
            updatedAt: 2,
          },
          broken: {
            sourceUrl: 1,
            revision: null,
          },
        },
        curatedPreinstalled: true,
      })
    );

    const state = await readSkillState(statePath);
    expect(state.disabled).toEqual(['agent-browser', 'remotion']);
    expect(state.skippedPreinstall).toEqual(['agent-browser', 'test-skill']);
    expect(state.managedSkills['agent-browser']).toEqual({
      sourceUrl: 'https://example.com',
      revision: 'abc123',
      checkedAt: 1,
      updatedAt: 2,
    });

    await writeSkillState(statePath, state);
    const persisted = JSON.parse(await fs.readFile(statePath, 'utf-8')) as {
      disabled: string[];
      skippedPreinstall: string[];
      managedSkills: Record<string, unknown>;
    };
    expect(persisted.disabled).toEqual(['agent-browser', 'remotion']);
    expect(persisted.skippedPreinstall).toEqual(['agent-browser', 'test-skill']);
    expect(Object.keys(persisted.managedSkills)).toEqual(['agent-browser']);

    await fs.rm(tempRoot, { recursive: true, force: true });
  });
});
