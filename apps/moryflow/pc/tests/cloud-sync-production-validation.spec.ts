import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, rm, writeFile } from 'node:fs/promises';

import {
  assertUsageDelta,
  buildCloudSyncValidationFileName,
  findSearchHitByToken,
  hasSyncSettled,
} from '../src/main/cloud-sync/production-validation.helpers';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mainEntry = path.join(appRoot, 'dist/main/index.js');
const rendererEntry = path.join(appRoot, 'dist/renderer/index.html');

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required for cloud sync production validation`);
  }
  return value;
}

async function launchApp(userDataPath: string) {
  return electron.launch({
    args: [mainEntry],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: pathToFileURL(rendererEntry).toString(),
      MORYFLOW_E2E: 'true',
      MORYFLOW_E2E_USER_DATA: userDataPath,
    },
  });
}

async function anyhuntSearch(query: string) {
  const apiKey = requireEnv('ANYHUNT_API_KEY');
  const baseUrl = (
    process.env.ANYHUNT_API_BASE_URL?.trim() ||
    process.env.ANYHUNT_BASE_URL?.trim()?.replace(/\/api\/v1\/?$/, '')
  )?.replace(/\/$/, '');

  if (!baseUrl) {
    throw new Error('ANYHUNT_API_BASE_URL is required for cloud sync reconciliation');
  }

  const response = await fetch(`${baseUrl}/api/v1/sources/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      top_k: 5,
      source_types: ['note_markdown'],
    }),
  });
  const payload = (await response.json()) as {
    results?: Array<{
      title: string;
      display_path: string | null;
      snippet: string;
    }>;
  };

  if (!response.ok) {
    throw new Error(`Anyhunt sources.search failed: ${response.status} ${JSON.stringify(payload)}`);
  }

  return payload.results ?? [];
}

async function pollUntil<T>(
  task: () => Promise<T>,
  predicate: (value: T) => boolean,
  timeoutMs = 60_000,
  intervalMs = 1_000
): Promise<{ ok: true; value: T } | { ok: false; value: T | undefined }> {
  const deadline = Date.now() + timeoutMs;
  let lastValue: T | undefined;

  while (Date.now() < deadline) {
    lastValue = await task();
    if (predicate(lastValue)) {
      return {
        ok: true,
        value: lastValue,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return {
    ok: false,
    value: lastValue,
  };
}

async function readStatusDetail(page: Page) {
  return page.evaluate(() => window.desktopAPI.cloudSync.getStatusDetail());
}

async function triggerSyncAndWaitForSettlement(
  page: Page,
  statusBefore: Awaited<ReturnType<typeof readStatusDetail>>
) {
  await page.evaluate(() => window.desktopAPI.cloudSync.triggerSync());

  const settled = await pollUntil(
    () => readStatusDetail(page),
    (statusAfter) => hasSyncSettled(statusBefore, statusAfter)
  );

  if (!settled.ok) {
    throw new Error(
      `cloud sync did not settle after triggerSync: ${JSON.stringify(settled.value)}`
    );
  }

  return settled.value;
}

test.describe('Cloud sync production validation', () => {
  let electronApp: ElectronApplication;
  let page: Page;
  let workspace = '';
  let workspaceName = '';
  let filePath = '';
  let fileToken = '';
  let fileName = '';
  let needsRemoteCleanup = false;

  test.beforeAll(async () => {
    const userDataPath = requireEnv('MORYFLOW_E2E_USER_DATA');
    workspace = requireEnv('MORYFLOW_VALIDATION_WORKSPACE');
    workspaceName = path.basename(workspace);
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    fileToken = `codex cloud sync ${runId}`;
    fileName = buildCloudSyncValidationFileName(runId);
    filePath = path.join(workspace, fileName);

    electronApp = await launchApp(userDataPath);
    page = await electronApp.firstWindow();
    page.setDefaultTimeout(30_000);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => Boolean(window.desktopAPI?.cloudSync));
  });

  test.afterAll(async () => {
    try {
      await rm(filePath, { force: true });
    } catch {
      // ignore local cleanup miss in best-effort teardown
    }
    if (needsRemoteCleanup && page && !page.isClosed()) {
      try {
        await page.evaluate(() => window.desktopAPI.cloudSync.triggerSync());
        await pollUntil(async () => {
          const results = await page.evaluate((query) => {
            return window.desktopAPI.cloudSync.search({
              query,
              topK: 5,
            });
          }, fileToken);
          return !results.some(
            (item) =>
              item.title.includes(fileToken) ||
              item.path?.includes(fileName) ||
              item.snippet.includes(fileToken)
          );
        }, Boolean);
        await pollUntil(async () => {
          const results = await anyhuntSearch(fileToken);
          return !results.some(
            (item) =>
              item.title.includes(path.basename(fileName, '.md')) ||
              item.display_path?.includes(fileName) ||
              item.snippet.includes(fileToken)
          );
        }, Boolean);
      } catch (error) {
        console.warn('[cloud-sync-production-validation] cleanup failed', error);
      }
    }
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('binds workspace, syncs file, reconciles usage and Anyhunt search', async () => {
    const fileBody = `# Cloud Sync Validation\n\nQuery token: ${fileToken}\n`;
    const fileSizeBytes = Buffer.byteLength(fileBody, 'utf8');

    const usageBefore = await page.evaluate(() => window.desktopAPI.cloudSync.getUsage());
    const statusBefore = await readStatusDetail(page);

    const binding = await page.evaluate(
      async ({ localPath, vaultName }) => {
        const existing = await window.desktopAPI.cloudSync.getBinding(localPath);
        return window.desktopAPI.cloudSync.bindVault({
          localPath,
          vaultId: existing?.vaultId,
          vaultName: existing?.vaultName ?? vaultName,
        });
      },
      { localPath: workspace, vaultName: workspaceName }
    );

    expect(binding.localPath).toBe(workspace);

    await writeFile(filePath, fileBody, 'utf8');
    needsRemoteCleanup = true;
    await expect
      .poll(async () => readFile(filePath, 'utf8'), {
        timeout: 10_000,
      })
      .toContain(fileToken);

    const statusAfter = await triggerSyncAndWaitForSettlement(page, statusBefore);
    expect(hasSyncSettled(statusBefore, statusAfter)).toBe(true);
    expect(statusAfter.engineStatus).not.toBe('disabled');

    await expect
      .poll(
        async () => {
          const usage = await page.evaluate(() => window.desktopAPI.cloudSync.getUsage());
          try {
            assertUsageDelta(usageBefore, usage, fileSizeBytes);
            return true;
          } catch {
            return false;
          }
        },
        { timeout: 60_000 }
      )
      .toBe(true);

    const usageAfter = await page.evaluate(() => window.desktopAPI.cloudSync.getUsage());
    assertUsageDelta(usageBefore, usageAfter, fileSizeBytes);

    await expect
      .poll(
        async () => {
          const results = await page.evaluate((query) => {
            return window.desktopAPI.cloudSync.search({
              query,
              topK: 5,
            });
          }, fileToken);
          try {
            findSearchHitByToken(results, fileToken);
            return true;
          } catch {
            return false;
          }
        },
        { timeout: 60_000 }
      )
      .toBe(true);

    const moryflowResults = await page.evaluate((query) => {
      return window.desktopAPI.cloudSync.search({
        query,
        topK: 5,
      });
    }, fileToken);
    findSearchHitByToken(moryflowResults, fileToken);

    await expect
      .poll(
        async () => {
          const results = await anyhuntSearch(fileToken);
          return results.some(
            (item) =>
              item.title.includes(path.basename(fileName, '.md')) ||
              item.display_path?.includes(fileName) ||
              item.snippet.includes(fileToken)
          );
        },
        { timeout: 60_000 }
      )
      .toBe(true);

    const anyhuntResults = await anyhuntSearch(fileToken);
    expect(anyhuntResults.length).toBeGreaterThan(0);

    const deletionBaseline = await readStatusDetail(page);
    await rm(filePath, { force: true });
    const statusAfterDelete = await triggerSyncAndWaitForSettlement(page, deletionBaseline);
    expect(statusAfterDelete.engineStatus).not.toBe('disabled');

    await expect
      .poll(
        async () => {
          const results = await page.evaluate((query) => {
            return window.desktopAPI.cloudSync.search({
              query,
              topK: 5,
            });
          }, fileToken);
          return !results.some(
            (item) =>
              item.title.includes(fileToken) ||
              item.path?.includes(fileName) ||
              item.snippet.includes(fileToken)
          );
        },
        { timeout: 60_000 }
      )
      .toBe(true);

    await expect
      .poll(
        async () => {
          const results = await anyhuntSearch(fileToken);
          return !results.some(
            (item) =>
              item.title.includes(path.basename(fileName, '.md')) ||
              item.display_path?.includes(fileName) ||
              item.snippet.includes(fileToken)
          );
        },
        { timeout: 60_000 }
      )
      .toBe(true);

    needsRemoteCleanup = false;
  });
});
