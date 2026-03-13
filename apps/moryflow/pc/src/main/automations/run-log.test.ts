/* @vitest-environment node */

import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const tempDirs: string[] = [];

const createTempDir = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'automation-run-log-'));
  tempDirs.push(dir);
  return dir;
};

describe('automation run log', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map(async (dir) => {
        await fs.rm(dir, { recursive: true, force: true });
      })
    );
  });

  it('appends records, reads recent records and filters by job', async () => {
    const { createAutomationRunLogStore } = await import('./run-log.js');
    const baseDir = await createTempDir();
    const store = createAutomationRunLogStore({ baseDir });

    await store.append({
      id: 'run-1',
      jobId: 'job-1',
      startedAt: 1,
      finishedAt: 2,
      status: 'ok',
      outputText: 'hello',
    });
    await store.append({
      id: 'run-2',
      jobId: 'job-2',
      startedAt: 3,
      finishedAt: 4,
      status: 'error',
      errorMessage: 'failed',
    });
    await store.append({
      id: 'run-3',
      jobId: 'job-1',
      startedAt: 5,
      finishedAt: 6,
      status: 'ok',
      outputText: 'world',
    });

    expect((await store.listRecent({ limit: 10 })).map((record) => record.id)).toEqual([
      'run-3',
      'run-2',
      'run-1',
    ]);
    expect(
      (await store.listRecent({ jobId: 'job-1', limit: 10 })).map((record) => record.id)
    ).toEqual(['run-3', 'run-1']);
  });

  it('uses the userData automation-run-logs directory when no baseDir is provided', async () => {
    const { createAutomationRunLogStore } = await import('./run-log.js');
    const userDataDir = await createTempDir();
    const store = createAutomationRunLogStore({
      getUserDataPath: () => userDataDir,
    } as never);

    await store.append({
      id: 'run-1',
      jobId: 'job-1',
      startedAt: 1,
      finishedAt: 2,
      status: 'ok',
      outputText: 'hello',
    });

    const persisted = await fs.readFile(
      path.join(userDataDir, 'automation-run-logs', 'job-1.jsonl'),
      'utf8'
    );
    expect(persisted).toContain('"id":"run-1"');
  });

  it('removes the persisted log file for a deleted automation job', async () => {
    const { createAutomationRunLogStore } = await import('./run-log.js');
    const baseDir = await createTempDir();
    const store = createAutomationRunLogStore({ baseDir });

    await store.append({
      id: 'run-1',
      jobId: 'job-1',
      startedAt: 1,
      finishedAt: 2,
      status: 'ok',
      outputText: 'hello',
    });

    await store.removeJobLogs('job-1');

    await expect(fs.readFile(path.join(baseDir, 'job-1.jsonl'), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });
});
