import { test, expect, type Page } from '@playwright/test';
import type { FakeMembershipMemoryServerInput } from './helpers/fake-membership-memory-server.js';
import { createFakeMembershipMemoryServer } from './helpers/fake-membership-memory-server.js';
import { createPCHarnessSession, type PCHarnessSession } from './helpers/pc-harness.js';

async function authenticateDesktopSession(page: Page) {
  await page.waitForFunction(() => Boolean(window.desktopAPI?.membership?.syncToken));
  await page.evaluate(async () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    await window.desktopAPI.membership.setAccessToken('e2e-access-token');
    await window.desktopAPI.membership.setAccessTokenExpiresAt(expiresAt);
    await window.desktopAPI.membership.syncToken('e2e-access-token');
  });
}

async function openMemoryDestination(page: Page) {
  await page.waitForFunction(() => Boolean(window.desktopAPI));
  await expect(page.getByTestId('workspace-shell')).toBeVisible();
  await page.getByRole('button', { name: 'Memory' }).click();
  await expect(page.getByRole('heading', { name: 'Memory' })).toBeVisible();
}

async function openKnowledgePanel(page: Page) {
  await page.getByRole('button', { name: 'Open knowledge details' }).click();
  await expect(page.getByRole('heading', { name: 'Knowledge' })).toBeVisible();
}

async function withMemorySession<T>(
  input: FakeMembershipMemoryServerInput,
  run: (session: PCHarnessSession) => Promise<T>
) {
  const fakeServer = await createFakeMembershipMemoryServer(input);
  const session = await createPCHarnessSession({
    tempPrefix: 'moryflow-pc-e2e-memory-ui-',
    envOverrides: {
      VITE_MEMBERSHIP_API_URL: fakeServer.baseUrl,
    },
    pageTimeoutMs: 30_000,
  });

  try {
    await authenticateDesktopSession(session.page);
    await openMemoryDestination(session.page);
    return await run(session);
  } finally {
    await session.dispose();
    await fakeServer.close();
  }
}

test.describe('Moryflow PC memory dashboard UI', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test('shows scanning state while knowledge overview is still loading', async () => {
    await withMemorySession(
      {
        delays: { overviewMs: 4_000 },
      },
      async ({ page }) => {
        await expect(page.getByText('Scanning workspace...')).toBeVisible();
        await expect(
          page.getByText('Preparing searchable knowledge from your workspace.')
        ).toBeVisible();
      }
    );
  });

  test('shows needs-attention state with file-level guidance', async () => {
    await withMemorySession(
      {
        overview: {
          sourceCount: 3,
          indexedSourceCount: 2,
          attentionSourceCount: 1,
          derivedCount: 24,
          lastIndexedAt: '2026-03-22T00:00:00.000Z',
        },
        attentionItems: [
          {
            documentId: 'doc-attention-1',
            title: 'Unreadable.pdf',
            path: 'Docs/Unreadable.pdf',
            state: 'NEEDS_ATTENTION',
            userFacingReason: 'This file could not be indexed yet.',
            lastAttemptAt: '2026-03-22T00:00:00.000Z',
          },
        ],
      },
      async ({ page }) => {
        await expect(page.getByText('Some files need attention')).toBeVisible();
        await expect(page.getByText('1 file is not searchable yet.')).toBeVisible();

        await openKnowledgePanel(page);
        await expect(page.getByText('Needs attention')).toBeVisible();
        await expect(page.getByText('Unreadable.pdf', { exact: true })).toBeVisible();
        await expect(page.getByText('This file could not be indexed yet.')).toBeVisible();
      }
    );
  });

  test('shows indexing state without collapsing into attention', async () => {
    await withMemorySession(
      {
        overview: {
          sourceCount: 5,
          indexedSourceCount: 3,
          indexingSourceCount: 2,
          derivedCount: 18,
          lastIndexedAt: '2026-03-22T00:00:00.000Z',
        },
        indexingItems: [
          {
            documentId: 'doc-indexing-1',
            title: 'Roadmap.md',
            path: 'Docs/Roadmap.md',
            state: 'INDEXING',
            userFacingReason: 'Indexing is in progress.',
            lastAttemptAt: '2026-03-22T00:00:00.000Z',
          },
          {
            documentId: 'doc-indexing-2',
            title: 'Ideas.md',
            path: 'Docs/Ideas.md',
            state: 'INDEXING',
            userFacingReason: 'Indexing is in progress.',
            lastAttemptAt: '2026-03-22T00:00:00.000Z',
          },
        ],
      },
      async ({ page }) => {
        await expect(page.getByText('Indexing files')).toBeVisible();
        await expect(page.getByText('2 files are becoming searchable.')).toBeVisible();

        await openKnowledgePanel(page);
        await expect(page.getByRole('heading', { name: 'Indexing' })).toBeVisible();
        await expect(page.getByText('Roadmap.md', { exact: true })).toBeVisible();
        await expect(page.getByText('Ideas.md', { exact: true })).toBeVisible();
      }
    );
  });

  test('shows ready state once all searchable files are indexed', async () => {
    await withMemorySession(
      {
        overview: {
          sourceCount: 2,
          indexedSourceCount: 2,
          derivedCount: 12,
          lastIndexedAt: '2026-03-22T00:00:00.000Z',
        },
      },
      async ({ page }) => {
        await expect(page.getByText('Knowledge is ready')).toBeVisible();
        await expect(page.getByText('2 / 2 files are searchable.')).toBeVisible();
      }
    );
  });
});
