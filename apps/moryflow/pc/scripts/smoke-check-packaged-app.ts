#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  appNameFromBundle,
  ensurePackageExists,
  resolveSmokeCheckAppPath,
  smokeLaunch,
} from './smoke-check-packaged-app-lib';

const HELP_TEXT = `Usage: pnpm exec tsx scripts/smoke-check-packaged-app.ts (--app <MoryFlow.app> | --app-dir <release-dir>) --require-package <name>

Verifies that a packaged macOS app contains required runtime packages and that the
main process stays alive for the configured smoke window.

Options:
  --app <path>                Path to the packaged .app bundle
  --app-dir <path>            Directory that contains exactly one packaged .app bundle
  --require-package <name>    Runtime package that must exist inside app.asar (repeatable)
  --timeout-ms <number>       Smoke window in milliseconds (default: 12000)`;

const fail = (message: string): never => {
  throw new Error(message);
};

const isFlag = (value: string) => value.startsWith('--');

const parseArgs = (argv: string[]) => {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  let appPath: string | undefined;
  let appDir: string | undefined;
  let timeoutMs = 12_000;
  const requiredPackages: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!isFlag(current)) continue;
    const value = argv[index + 1];
    if (!value || isFlag(value)) {
      fail(`Missing value for ${current}`);
    }

    switch (current) {
      case '--app':
        appPath = value;
        break;
      case '--app-dir':
        appDir = value;
        break;
      case '--require-package':
        requiredPackages.push(value);
        break;
      case '--timeout-ms':
        timeoutMs = Number.parseInt(value, 10);
        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
          fail(`Invalid --timeout-ms: ${value}`);
        }
        break;
      default:
        fail(`Unknown flag: ${current}`);
    }

    index += 1;
  }

  if (appPath && appDir) fail('Use either --app or --app-dir, not both');
  if (!appPath && !appDir) fail('Missing --app or --app-dir');
  if (requiredPackages.length === 0) fail('At least one --require-package is required');

  return {
    appPath: appPath ? path.resolve(appPath) : undefined,
    appDir: appDir ? path.resolve(appDir) : undefined,
    timeoutMs,
    requiredPackages,
  };
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const appPath = await resolveSmokeCheckAppPath(args);
  const appName = appNameFromBundle(appPath);
  const asarPath = path.join(appPath, 'Contents', 'Resources', 'app.asar');
  const binaryPath = path.join(appPath, 'Contents', 'MacOS', appName);

  await fs.access(asarPath);
  await fs.access(binaryPath);

  for (const packageName of args.requiredPackages) {
    await ensurePackageExists(asarPath, packageName);
  }

  const launch = await smokeLaunch(binaryPath, args.timeoutMs);

  console.log(
    JSON.stringify(
      {
        app: appPath,
        checkedPackages: args.requiredPackages,
        timeoutMs: args.timeoutMs,
        stdoutBytes: Buffer.byteLength(launch.stdout),
        stderrBytes: Buffer.byteLength(launch.stderr),
        status: 'ok',
      },
      null,
      2
    )
  );
};

await main();
