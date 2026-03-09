import {
  test,
  expect,
  _electron as electron,
  type TestInfo,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { randomUUID } from 'node:crypto';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mainEntry = path.join(appRoot, 'dist/main/index.js');
const rendererEntry = path.join(appRoot, 'dist/renderer/index.html');

const launchApp = async (userDataPath: string) => {
  const rendererUrl = pathToFileURL(rendererEntry).toString();
  return electron.launch({
    args: [mainEntry],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: rendererUrl,
      MORYFLOW_E2E: 'true',
      MORYFLOW_E2E_USER_DATA: userDataPath,
    },
  });
};

const prepareApp = async (): Promise<{
  electronApp: ElectronApplication;
  page: Page;
  stdoutLogs: string[];
  stderrLogs: string[];
  cleanup: () => Promise<void>;
}> => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'moryflow-pc-auth-e2e-'));
  const userDataRoot = path.join(tempRoot, 'user-data');
  await mkdir(userDataRoot, { recursive: true });

  const vaultName = 'E2E Vault';
  const vaultPath = path.join(tempRoot, vaultName);
  const vaultId = randomUUID();
  const storeDir = path.join(userDataRoot, 'stores');

  await mkdir(vaultPath, { recursive: true });
  await mkdir(storeDir, { recursive: true });
  await writeFile(
    path.join(storeDir, 'vault-store.json'),
    JSON.stringify({
      vaults: [{ id: vaultId, path: vaultPath, name: vaultName, addedAt: Date.now() }],
      activeVaultId: vaultId,
      migrated: true,
    })
  );

  const electronApp = await launchApp(userDataRoot);
  const stdoutLogs: string[] = [];
  const stderrLogs: string[] = [];
  const proc = electronApp.process();
  proc?.stdout?.on('data', (chunk) => stdoutLogs.push(chunk.toString()));
  proc?.stderr?.on('data', (chunk) => stderrLogs.push(chunk.toString()));
  const page = await electronApp.firstWindow();
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(30_000);
  page.on('console', (msg) => stdoutLogs.push(`[console:${msg.type()}] ${msg.text()}\n`));
  page.on('pageerror', (error) => stderrLogs.push(`[pageerror] ${error.message}\n`));
  page.on('requestfailed', (request) =>
    stderrLogs.push(
      `[requestfailed] ${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'unknown'}\n`
    )
  );
  await page.waitForLoadState('domcontentloaded');
  await page.addInitScript(() => {
    localStorage.setItem('moryflow_language', 'en');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });

  return {
    electronApp,
    page,
    stdoutLogs,
    stderrLogs,
    cleanup: async () => {
      await electronApp.close();
      await rm(tempRoot, { recursive: true, force: true });
    },
  };
};

const openAccountSection = async (page: Page) => {
  await page.waitForFunction(() => Boolean(window.desktopAPI));
  await expect(page.getByTestId('workspace-shell')).toBeVisible();
  await page.getByTestId('topbar-account-entry-button').click();
  await expect(page.getByTestId('settings-dialog')).toBeVisible();
};

const enterRegisterForm = async (page: Page) => {
  await page.getByRole('button', { name: 'Sign up now' }).click();
  await page.getByLabel('Nickname').fill('E2E User');
  await page.getByLabel('Email').fill('e2e-auth@moryflow.com');
  await page.getByLabel('Password').fill('secret-123');
};

const dumpFailureContext = async ({
  page,
  stdoutLogs,
  stderrLogs,
  testInfo,
}: {
  page: Page;
  stdoutLogs: string[];
  stderrLogs: string[];
  testInfo: TestInfo;
}) => {
  if (testInfo.status === testInfo.expectedStatus) {
    return;
  }

  const screenshotPath = testInfo.outputPath('account-auth-failure.png');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  const pageText = await page
    .locator('body')
    .innerText()
    .catch(() => '');
  const trimmedStdout = stdoutLogs.slice(-120).join('');
  const trimmedStderr = stderrLogs.slice(-120).join('');

  if (trimmedStdout) {
    console.log('[account-auth stdout]\n', trimmedStdout);
  }
  if (trimmedStderr) {
    console.log('[account-auth stderr]\n', trimmedStderr);
  }
  if (pageText) {
    console.log('[account-auth body]\n', pageText);
  }
  console.log('[account-auth page url]', page.url());
  console.log('[account-auth screenshot]', screenshotPath);
};

test.describe('Moryflow PC account auth flow', () => {
  test('enters otp screen only after initial verification otp send succeeds', async (_fixtures, testInfo) => {
    const { page, cleanup, stdoutLogs, stderrLogs } = await prepareApp();
    const requestLog: string[] = [];

    await page.route('**/api/v1/auth/sign-up/email', async (route) => {
      requestLog.push('sign-up');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: null,
          user: {
            id: 'user_e2e_1',
            email: 'e2e-auth@moryflow.com',
            name: 'E2E User',
            emailVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    try {
      await openAccountSection(page);
      await enterRegisterForm(page);
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Verification Code')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Verify Email' })).toBeVisible();
      expect(requestLog).toEqual(['sign-up']);
    } finally {
      await dumpFailureContext({ page, stdoutLogs, stderrLogs, testInfo });
      await cleanup();
    }
  });

  test('keeps register form visible when initial verification otp send fails', async (_fixtures, testInfo) => {
    const { page, cleanup, stdoutLogs, stderrLogs } = await prepareApp();

    await page.route('**/api/v1/auth/sign-up/email', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'SEND_FAILED',
          message: 'Failed to send code',
        }),
      });
    });

    try {
      await openAccountSection(page);
      await enterRegisterForm(page);
      await page.getByRole('button', { name: 'Sign Up' }).click();

      await expect(page.getByText('Failed to send code')).toBeVisible();
      await expect(page.getByLabel('Nickname')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Verify Email' })).toHaveCount(0);
    } finally {
      await dumpFailureContext({ page, stdoutLogs, stderrLogs, testInfo });
      await cleanup();
    }
  });
});
