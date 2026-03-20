#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

type UpdateFeedFile = {
  url: string;
  sha512: string;
  size: number;
};

type UpdateFeed = {
  version: string;
  files: UpdateFeedFile[];
  path: string;
  sha512: string;
  releaseDate: string;
};

type MergeInput = {
  arm64Feed: UpdateFeed;
  x64Feed: UpdateFeed;
};

type MergeResult = UpdateFeed;

const fail = (message: string): never => {
  throw new Error(message);
};

const isFlag = (value: string) => value.startsWith('--');

const loadYamlModule = async () => {
  try {
    return (await import('js-yaml')) as {
      load: (source: string) => any;
      dump: (value: unknown, options?: Record<string, unknown>) => string;
    };
  } catch (error) {
    fail(`Failed to load js-yaml: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const mergeUpdateFeeds = (input: MergeInput): MergeResult => {
  const { arm64Feed, x64Feed } = input;

  if (!arm64Feed || typeof arm64Feed !== 'object') {
    fail('arm64 feed is not a valid object');
  }
  if (!x64Feed || typeof x64Feed !== 'object') {
    fail('x64 feed is not a valid object');
  }

  if (!Array.isArray(arm64Feed.files)) {
    fail('arm64 feed is missing files array');
  }
  if (!Array.isArray(x64Feed.files)) {
    fail('x64 feed is missing files array');
  }

  return {
    version: arm64Feed.version,
    files: [...arm64Feed.files, ...x64Feed.files],
    path: arm64Feed.path,
    sha512: arm64Feed.sha512,
    releaseDate: arm64Feed.releaseDate,
  };
};

const parseArgs = (argv: string[]) => {
  const HELP_TEXT = `Usage: pnpm exec tsx scripts/merge-update-yml.ts --arm64-dir <dir> --x64-dir <dir> --feed-file <name> --output-dir <dir>

Merges two architecture-specific update feed yml files into a single file
that electron-updater can use for multi-arch auto-update.`;

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!isFlag(current)) continue;
    const value = argv[index + 1];
    if (!value || isFlag(value)) {
      fail(`Missing value for ${current}`);
    }
    values.set(current, value);
    index += 1;
  }

  const arm64Dir = values.get('--arm64-dir');
  const x64Dir = values.get('--x64-dir');
  const feedFile = values.get('--feed-file');
  const outputDir = values.get('--output-dir');

  if (!arm64Dir) fail('Missing --arm64-dir');
  if (!x64Dir) fail('Missing --x64-dir');
  if (!feedFile) fail('Missing --feed-file');
  if (!outputDir) fail('Missing --output-dir');

  return {
    arm64Dir: path.resolve(arm64Dir),
    x64Dir: path.resolve(x64Dir),
    feedFile,
    outputDir: path.resolve(outputDir),
  };
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const yaml = await loadYamlModule();

  const arm64Path = path.join(args.arm64Dir, args.feedFile);
  const x64Path = path.join(args.x64Dir, args.feedFile);

  let arm64Raw: string;
  try {
    arm64Raw = await fs.readFile(arm64Path, 'utf8');
  } catch {
    fail(`Failed to read arm64 feed file: ${arm64Path}`);
  }

  let x64Raw: string;
  try {
    x64Raw = await fs.readFile(x64Path, 'utf8');
  } catch {
    fail(`Failed to read x64 feed file: ${x64Path}`);
  }

  const arm64Feed = yaml.load(arm64Raw) as UpdateFeed;
  const x64Feed = yaml.load(x64Raw) as UpdateFeed;

  const merged = mergeUpdateFeeds({ arm64Feed, x64Feed });

  await fs.mkdir(args.outputDir, { recursive: true });

  const outputPath = path.join(args.outputDir, args.feedFile);
  const outputContent = yaml.dump(merged, { lineWidth: 120, noRefs: true });
  await fs.writeFile(outputPath, outputContent);

  console.log(
    JSON.stringify(
      {
        feedFile: args.feedFile,
        version: merged.version,
        totalFiles: merged.files.length,
        arm64Files: arm64Feed.files.length,
        x64Files: x64Feed.files.length,
        outputPath,
      },
      null,
      2
    )
  );
};

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('merge-update-yml.ts') ||
    process.argv[1].endsWith('merge-update-yml.js'));

if (isDirectRun) {
  await main();
}
