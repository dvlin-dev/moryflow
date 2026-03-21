import { test, expect } from '@playwright/test';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type { PCHarnessSession } from './helpers/pc-harness.js';
import { createPCHarnessSession } from './helpers/pc-harness.js';
import { createFakeMembershipMemoryServer } from './helpers/fake-membership-memory-server.js';

test.describe('Moryflow PC memory harness', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  let session: PCHarnessSession | null = null;
  let fakeServer: Awaited<ReturnType<typeof createFakeMembershipMemoryServer>> | null = null;

  test.beforeAll(async () => {
    fakeServer = await createFakeMembershipMemoryServer();
    session = await createPCHarnessSession({
      tempPrefix: 'moryflow-pc-e2e-memory-',
      envOverrides: {
        VITE_MEMBERSHIP_API_URL: fakeServer.baseUrl,
      },
      pageTimeoutMs: 30_000,
    });

    await mkdir(path.join(session.workspace.vaultPath, 'Docs'), { recursive: true });
    await writeFile(path.join(session.workspace.vaultPath, 'Docs/Alpha.md'), '# Alpha\n');
  });

  test.afterEach(async ({ page: _page }, testInfo) => {
    if (testInfo.status === testInfo.expectedStatus || !session) {
      return;
    }
    session.printFailureDiagnostics();
  });

  test.afterAll(async () => {
    await session?.dispose();
    await fakeServer?.close();
  });

  test('resolves workspace profile and returns memory search results through desktopAPI', async () => {
    if (!session) {
      throw new Error('Harness session not initialized.');
    }
    const { page } = session;

    await page.waitForFunction(() => Boolean(window.desktopAPI?.membership?.syncToken));
    await page.evaluate(async () => {
      const expiresAt = new Date(Date.now() + 60_000).toISOString();
      await window.desktopAPI.membership.setAccessToken('e2e-access-token');
      await window.desktopAPI.membership.setAccessTokenExpiresAt(expiresAt);
      await window.desktopAPI.membership.syncToken('e2e-access-token');
    });

    const result = await page.evaluate(async () => {
      return window.desktopAPI.memory.search({
        query: 'alpha',
        limitPerGroup: 5,
      });
    });

    expect(result.scope.projectId).toBe('project-e2e-1');
    expect(result.groups.files.items).toHaveLength(1);
    expect(result.groups.files.items[0]).toMatchObject({
      title: 'Alpha',
      path: 'Docs/Alpha.md',
      localPath: expect.stringMatching(/Docs\/Alpha\.md$/),
      disabled: false,
      snippet: 'alpha snippet',
    });
    expect(result.groups.facts.items).toHaveLength(1);
    expect(result.groups.facts.items[0]).toMatchObject({
      text: 'Alpha fact',
      factScope: 'knowledge',
    });
  });

  test('queries graph through desktopAPI with the resolved workspace scope', async () => {
    if (!session) {
      throw new Error('Harness session not initialized.');
    }
    const { page } = session;

    const result = await page.evaluate(async () => {
      return window.desktopAPI.memory.queryGraph({
        query: 'Alpha',
        limit: 10,
      });
    });

    expect(result.scope.projectId).toBe('project-e2e-1');
    expect(result.entities).toEqual([
      expect.objectContaining({
        id: 'entity-1',
        canonicalName: 'Alpha',
        entityType: 'topic',
      }),
    ]);
    expect(result.evidenceSummary).toMatchObject({
      observationCount: 1,
      sourceCount: 1,
      memoryFactCount: 1,
    });
  });
});
