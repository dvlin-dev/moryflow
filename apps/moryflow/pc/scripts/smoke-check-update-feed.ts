#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

type Channel = 'stable' | 'beta';
type TargetKey = 'darwin-arm64' | 'darwin-x64' | 'win32-x64';
type Target = {
  key: TargetKey;
  releaseDir: string;
  feedFilename: string;
};

const TARGETS: Target[] = [
  { key: 'darwin-arm64', releaseDir: 'darwin/arm64', feedFilename: 'latest-mac.yml' },
  { key: 'darwin-x64', releaseDir: 'darwin/x64', feedFilename: 'latest-mac.yml' },
  { key: 'win32-x64', releaseDir: 'win32/x64', feedFilename: 'latest.yml' },
];

const HELP_TEXT = `Usage: pnpm exec tsx scripts/smoke-check-update-feed.ts --version <version> --channel <stable|beta> --base-url <url> --input-dir <dir>

Validates generated manifest.json and latest*.yml outputs.

Optional:
  --targets <darwin-arm64,darwin-x64,win32-x64>`;

const fail = (message: string): never => {
  throw new Error(message);
};

const isFlag = (value: string) => value.startsWith('--');

const parseTargets = (value: string | undefined): Target[] => {
  if (!value) {
    return TARGETS;
  }

  const keys = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    fail('Missing or invalid --targets');
  }

  const seen = new Set<TargetKey>();
  const targets: Target[] = [];
  for (const key of keys) {
    const target = TARGETS.find((item) => item.key === key);
    if (!target) {
      fail(`Unsupported --targets entry: ${key}`);
    }
    if (seen.has(target.key)) continue;
    seen.add(target.key);
    targets.push(target);
  }
  return targets;
};

const parseArgs = (argv: string[]) => {
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

  const version = values.get('--version');
  const channel = values.get('--channel') as Channel | undefined;
  const baseUrl = values.get('--base-url');
  const inputDir = values.get('--input-dir');
  const targets = parseTargets(values.get('--targets'));

  if (!version) fail('Missing --version');
  if (!channel || (channel !== 'stable' && channel !== 'beta')) {
    fail('Missing or invalid --channel (stable|beta)');
  }
  if (!baseUrl) fail('Missing --base-url');
  if (!inputDir) fail('Missing --input-dir');

  return {
    version,
    channel,
    baseUrl: baseUrl.replace(/\/+$/, ''),
    inputDir: path.resolve(inputDir),
    targets,
  };
};

const loadYamlModule = async () => {
  try {
    return (await import('js-yaml')) as {
      load: (source: string) => any;
    };
  } catch (error) {
    fail(`Failed to load js-yaml: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const assertHttps = (value: string, label: string, baseUrl: string) => {
  if (!value.startsWith('https://')) {
    fail(`${label} must be https: ${value}`);
  }
  if (!value.startsWith(baseUrl)) {
    fail(`${label} must start with ${baseUrl}: ${value}`);
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = path.join(args.inputDir, 'channels', args.channel, 'manifest.json');
  const manifestRaw = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw) as {
    channel: Channel;
    version: string;
    downloads?: Record<string, { feedUrl: string; directUrl: string }>;
  };

  if (manifest.channel !== args.channel) {
    fail(`Manifest channel mismatch: expected ${args.channel}, got ${manifest.channel}`);
  }
  if (manifest.version !== args.version) {
    fail(`Manifest version mismatch: expected ${args.version}, got ${manifest.version}`);
  }
  if (!manifest.downloads) {
    fail('Manifest downloads map is missing');
  }

  const yaml = await loadYamlModule();

  for (const target of args.targets) {
    const entry = manifest.downloads[target.key];
    if (!entry) {
      fail(`Missing manifest download entry for ${target.key}`);
    }
    assertHttps(entry.feedUrl, `${target.key} feedUrl`, args.baseUrl);
    assertHttps(entry.directUrl, `${target.key} directUrl`, args.baseUrl);

    const localFeedPath = path.join(
      args.inputDir,
      'channels',
      args.channel,
      target.releaseDir,
      target.feedFilename
    );
    const localReleaseDir = path.join(
      args.inputDir,
      'releases',
      `v${args.version}`,
      target.releaseDir
    );

    const [feedRaw, releaseFiles] = await Promise.all([
      fs.readFile(localFeedPath, 'utf8'),
      fs.readdir(localReleaseDir),
    ]);
    const feed = yaml.load(feedRaw) as Record<string, unknown>;
    if (feed?.version !== args.version) {
      fail(`${target.key} feed version mismatch: ${String(feed?.version)}`);
    }
    if (typeof feed?.path !== 'string') {
      fail(`${target.key} feed path is missing`);
    }
    assertHttps(feed.path, `${target.key} feed path`, args.baseUrl);

    const pathFilename = path.posix.basename(feed.path);
    if (!releaseFiles.includes(pathFilename)) {
      fail(`${target.key} release directory is missing ${pathFilename}`);
    }

    if (Array.isArray(feed.files)) {
      for (const item of feed.files as Array<Record<string, unknown>>) {
        if (typeof item.url !== 'string') {
          fail(`${target.key} feed files entry missing url`);
        }
        assertHttps(item.url, `${target.key} feed file url`, args.baseUrl);
        const filename = path.posix.basename(item.url);
        if (!releaseFiles.includes(filename)) {
          fail(`${target.key} release directory is missing ${filename}`);
        }
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        version: args.version,
        channel: args.channel,
        status: 'ok',
      },
      null,
      2
    )
  );
};

await main();
