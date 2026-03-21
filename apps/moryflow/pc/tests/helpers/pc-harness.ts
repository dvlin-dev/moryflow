import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { access, mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import { attachLogCapture, type LogCapture } from './log-capture.js';
import {
  createFakeLlmServer,
  type FakeLlmServer,
  type FakeLlmServerInput,
} from './fake-llm-server.js';
import { seedWorkspace, type SeededWorkspace } from './workspace-seed.js';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const mainEntry = path.join(appRoot, 'dist/main/index.js');
const rendererEntry = path.join(appRoot, 'dist/renderer/index.html');

export const assertPCHarnessBuildArtifacts = async (entries?: {
  mainEntry?: string;
  rendererEntry?: string;
}) => {
  const resolvedMainEntry = entries?.mainEntry ?? mainEntry;
  const resolvedRendererEntry = entries?.rendererEntry ?? rendererEntry;

  try {
    await Promise.all([access(resolvedMainEntry), access(resolvedRendererEntry)]);
  } catch {
    throw new Error(
      [
        'Moryflow PC Playwright harness requires built desktop artifacts.',
        `Missing: ${resolvedMainEntry}`,
        `Missing: ${resolvedRendererEntry}`,
        'Run `pnpm --filter @moryflow/pc build` before targeted Playwright specs.',
      ].join('\n')
    );
  }
};

type CreatePCHarnessSessionInput = {
  tempPrefix: string;
  workspace?: {
    vaultName?: string;
  };
  fakeLlm?: FakeLlmServerInput | null;
  envOverrides?: Record<string, string>;
  pageTimeoutMs?: number;
  maxLogEntries?: number;
};

export type PCHarnessSession = {
  electronApp: ElectronApplication;
  page: Page;
  tempRoot: string;
  userDataRoot: string;
  workspace: SeededWorkspace;
  fakeLlm: FakeLlmServer | null;
  logs: LogCapture;
  printFailureDiagnostics: () => void;
  dispose: () => Promise<void>;
};

const launchApp = async (
  userDataPath: string,
  envOverrides?: Record<string, string>
): Promise<ElectronApplication> => {
  const rendererUrl = pathToFileURL(rendererEntry).toString();
  return electron.launch({
    args: [mainEntry],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: rendererUrl,
      MORYFLOW_E2E: 'true',
      MORYFLOW_E2E_USER_DATA: userDataPath,
      ...(envOverrides ?? {}),
    },
  });
};

export const createPCHarnessSession = async (
  input: CreatePCHarnessSessionInput
): Promise<PCHarnessSession> => {
  await assertPCHarnessBuildArtifacts();

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), input.tempPrefix));
  const userDataRoot = path.join(tempRoot, 'user-data');
  await mkdir(userDataRoot, { recursive: true });

  const workspace = await seedWorkspace({
    rootDir: tempRoot,
    userDataRoot,
    vaultName: input.workspace?.vaultName,
  });

  const fakeLlm = input.fakeLlm ? await createFakeLlmServer(input.fakeLlm) : null;
  const electronApp = await launchApp(userDataRoot, input.envOverrides);
  const page = await electronApp.firstWindow();
  const logs = attachLogCapture({
    electronApp,
    page,
    maxEntries: input.maxLogEntries,
  });

  page.setDefaultTimeout(input.pageTimeoutMs ?? 30_000);
  page.setDefaultNavigationTimeout(input.pageTimeoutMs ?? 30_000);
  await page.waitForLoadState('domcontentloaded');
  await page.addInitScript(() => {
    localStorage.setItem('moryflow_language', 'en');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });

  return {
    electronApp,
    page,
    tempRoot,
    userDataRoot,
    workspace,
    fakeLlm,
    logs,
    printFailureDiagnostics() {
      logs.dumpRecent();
      if (fakeLlm) {
        console.log('[e2e fake llm requests]\n', JSON.stringify(fakeLlm.getRequests(), null, 2));
      }
      console.log('[e2e page url]', page.url());
    },
    async dispose() {
      logs.dispose();
      await electronApp.close();
      if (fakeLlm) {
        await fakeLlm.close();
      }
      await rm(tempRoot, { recursive: true, force: true });
    },
  };
};
