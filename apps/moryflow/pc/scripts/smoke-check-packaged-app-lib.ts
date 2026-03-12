import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { listPackage } from '@electron/asar';

const FAILURE_PATTERNS = [
  'ERR_MODULE_NOT_FOUND',
  'Uncaught Exception',
  'A JavaScript error occurred in the main process',
];

const fail = (message: string): never => {
  throw new Error(message);
};

export const findAppBundles = async (searchDir: string): Promise<string[]> => {
  const entries = await fs.readdir(searchDir, { withFileTypes: true });
  const bundles: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const entryPath = path.join(searchDir, entry.name);
    if (entry.name.endsWith('.app')) {
      bundles.push(entryPath);
      continue;
    }

    bundles.push(...(await findAppBundles(entryPath)));
  }

  return bundles;
};

export const resolveSmokeCheckAppPath = async (args: { appPath?: string; appDir?: string }) => {
  if (args.appPath) {
    return args.appPath;
  }

  const searchDir = args.appDir;
  if (!searchDir) {
    fail('Missing --app or --app-dir');
  }

  const appBundles = await findAppBundles(searchDir);
  if (appBundles.length === 0) {
    fail(`Could not find a packaged .app bundle under ${searchDir}`);
  }
  if (appBundles.length > 1) {
    fail(
      `Expected exactly one packaged .app bundle under ${searchDir}, found ${appBundles.length}: ${appBundles.join(', ')}`
    );
  }

  return appBundles[0];
};

export const appNameFromBundle = (appPath: string) => {
  const basename = path.basename(appPath);
  if (!basename.endsWith('.app')) {
    fail(`--app must point to a .app bundle: ${appPath}`);
  }
  return basename.slice(0, -'.app'.length);
};

export const ensurePackageExists = async (asarPath: string, packageName: string) => {
  const packagePrefix = `/node_modules/${packageName}`;
  const entries = listPackage(asarPath);
  const found = entries.some(
    (entry) => entry === packagePrefix || entry.startsWith(`${packagePrefix}/`)
  );

  if (!found) {
    fail(`Missing required package in app.asar: ${packageName}`);
  }
};

const containsFailureSignature = (buffer: string) =>
  FAILURE_PATTERNS.find((pattern) => buffer.includes(pattern));

const killProcess = async (child: ReturnType<typeof spawn>) => {
  if (child.exitCode !== null) return;

  child.kill('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 250));
  if (child.exitCode === null) {
    child.kill('SIGKILL');
  }
  await new Promise((resolve) => setTimeout(resolve, 50));
};

export const smokeLaunch = async (binaryPath: string, timeoutMs: number) => {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  const child = spawn(binaryPath, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      CI: process.env.CI ?? '1',
      MORYFLOW_RELEASE_SMOKE: '1',
    },
  });

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdoutChunks.push(chunk);
  });
  child.stderr.on('data', (chunk) => {
    stderrChunks.push(chunk);
  });

  const result = await new Promise<{
    status: 'alive' | 'exited';
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (child.exitCode !== null) {
        resolve({
          status: 'exited',
          code: child.exitCode,
          signal: child.signalCode ?? null,
        });
        return;
      }
      resolve({ status: 'alive', code: null, signal: null });
    }, timeoutMs);

    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.once('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ status: 'exited', code, signal });
    });
  });

  const stdout = stdoutChunks.join('');
  const stderr = stderrChunks.join('');
  const failureSignature = containsFailureSignature(`${stdout}\n${stderr}`);

  if (result.status === 'exited') {
    fail(
      `Packaged app exited before smoke timeout (code=${String(result.code)} signal=${String(result.signal)}).\n${stderr || stdout}`
    );
  }

  if (failureSignature) {
    await killProcess(child);
    fail(`Packaged app emitted failure signature "${failureSignature}".\n${stderr || stdout}`);
  }

  await killProcess(child);

  return {
    stdout,
    stderr,
  };
};
