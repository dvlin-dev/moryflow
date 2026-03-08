#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

type Channel = 'stable' | 'beta';
type TargetKey = 'darwin-arm64' | 'darwin-x64' | 'win32-x64';

type TargetDefinition = {
  key: TargetKey;
  artifactDir: string;
  releaseDir: string;
  feedFilename: string;
  directExtension: '.dmg' | '.exe';
};

type ParsedArgs = {
  version: string;
  channel: Channel;
  baseUrl: string;
  inputDir: string;
  outputDir: string;
  githubRepo: string;
  targets: TargetDefinition[];
};

type TargetBundle = {
  target: TargetDefinition;
  sourceDir: string;
  files: string[];
};

const TARGETS: TargetDefinition[] = [
  {
    key: 'darwin-arm64',
    artifactDir: 'darwin-arm64',
    releaseDir: 'darwin/arm64',
    feedFilename: 'latest-mac.yml',
    directExtension: '.dmg',
  },
  {
    key: 'darwin-x64',
    artifactDir: 'darwin-x64',
    releaseDir: 'darwin/x64',
    feedFilename: 'latest-mac.yml',
    directExtension: '.dmg',
  },
  {
    key: 'win32-x64',
    artifactDir: 'win32-x64',
    releaseDir: 'win32/x64',
    feedFilename: 'latest.yml',
    directExtension: '.exe',
  },
];

const HELP_TEXT = `Usage: pnpm exec tsx scripts/prepare-release-artifacts.ts --version <version> --channel <stable|beta> --base-url <url> --input-dir <dir> --output-dir <dir> [--github-repo owner/repo]

Reads per-platform electron-builder outputs from <input-dir>/<target>, rewrites latest*.yml
to versioned download URLs, and prepares:
  - <output-dir>/releases/v<version>/...
  - <output-dir>/channels/<channel>/...
  - <output-dir>/github-release-assets/...

Optional:
  --targets <darwin-arm64,darwin-x64,win32-x64>`;

const fail = (message: string): never => {
  throw new Error(message);
};

const isFlag = (value: string) => value.startsWith('--');

const parseTargets = (value: string | undefined): TargetDefinition[] => {
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
  const targets: TargetDefinition[] = [];
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

const parseArgs = (argv: string[]): ParsedArgs => {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!isFlag(item)) continue;
    const value = argv[index + 1];
    if (!value || isFlag(value)) {
      fail(`Missing value for ${item}`);
    }
    values.set(item, value);
    index += 1;
  }

  const version = values.get('--version');
  const channel = values.get('--channel');
  const baseUrl = values.get('--base-url');
  const inputDir = values.get('--input-dir');
  const outputDir = values.get('--output-dir');
  const githubRepo = values.get('--github-repo') ?? 'dvlin-dev/moryflow';
  const targets = parseTargets(values.get('--targets'));

  if (!version) fail('Missing --version');
  if (!channel || (channel !== 'stable' && channel !== 'beta')) {
    fail('Missing or invalid --channel (stable|beta)');
  }
  if (!baseUrl) fail('Missing --base-url');
  if (!inputDir) fail('Missing --input-dir');
  if (!outputDir) fail('Missing --output-dir');

  return {
    version,
    channel,
    baseUrl: baseUrl.replace(/\/+$/, ''),
    inputDir: path.resolve(inputDir),
    outputDir: path.resolve(outputDir),
    githubRepo,
    targets,
  };
};

const ensureCleanDir = async (dir: string) => {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
};

const readDirFiles = async (dir: string) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) continue;
    files.push(entry.name);
  }
  return files.sort();
};

const findSingle = (files: string[], predicate: (file: string) => boolean, label: string) => {
  const matches = files.filter(predicate);
  if (matches.length !== 1) {
    fail(`Expected exactly one ${label}, got ${matches.length}: ${matches.join(', ')}`);
  }
  return matches[0];
};

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

const versionRootUrl = (baseUrl: string, version: string, releaseDir: string) =>
  `${baseUrl}/releases/v${version}/${releaseDir}`;

const rewriteUrl = (original: unknown, prefix: string) => {
  if (typeof original !== 'string' || original.trim().length === 0) {
    return original;
  }
  const filename = path.posix.basename(original);
  return `${prefix}/${filename}`;
};

const rewriteFeed = async (bundle: TargetBundle, args: ParsedArgs) => {
  const yaml = await loadYamlModule();
  const feedPath = path.join(bundle.sourceDir, bundle.target.feedFilename);
  const raw = await fs.readFile(feedPath, 'utf8');
  const parsed = yaml.load(raw);

  if (!parsed || typeof parsed !== 'object') {
    fail(`Feed file is not a YAML object: ${feedPath}`);
  }

  const releasePrefix = versionRootUrl(args.baseUrl, args.version, bundle.target.releaseDir);
  const mutable = parsed as Record<string, unknown>;
  mutable['version'] = args.version;
  mutable['path'] = rewriteUrl(mutable['path'], releasePrefix);

  if (Array.isArray(mutable['files'])) {
    mutable['files'] = (mutable['files'] as Array<Record<string, unknown>>).map((fileEntry) => ({
      ...fileEntry,
      url: rewriteUrl(fileEntry.url, releasePrefix),
    }));
  }

  const rewritten = yaml.dump(mutable, {
    lineWidth: 120,
    noRefs: true,
  });

  const channelFeedPath = path.join(
    args.outputDir,
    'channels',
    args.channel,
    bundle.target.releaseDir,
    bundle.target.feedFilename
  );
  await fs.mkdir(path.dirname(channelFeedPath), { recursive: true });
  await fs.writeFile(channelFeedPath, rewritten);
};

const copyReleaseFiles = async (bundle: TargetBundle, args: ParsedArgs) => {
  const releaseDir = path.join(
    args.outputDir,
    'releases',
    `v${args.version}`,
    bundle.target.releaseDir
  );
  await fs.mkdir(releaseDir, { recursive: true });

  for (const file of bundle.files) {
    if (file === bundle.target.feedFilename) continue;
    await fs.copyFile(path.join(bundle.sourceDir, file), path.join(releaseDir, file));
  }
};

const copyGithubAssets = async (bundle: TargetBundle, args: ParsedArgs) => {
  const assetDir = path.join(args.outputDir, 'github-release-assets');
  await fs.mkdir(assetDir, { recursive: true });

  for (const file of bundle.files) {
    if (file === bundle.target.feedFilename) continue;
    await fs.copyFile(path.join(bundle.sourceDir, file), path.join(assetDir, file));
  }
};

const findDirectUrl = (bundle: TargetBundle, args: ParsedArgs) => {
  const filename = findSingle(
    bundle.files,
    (file) => file.endsWith(bundle.target.directExtension),
    `${bundle.target.key} direct download`
  );
  return `${versionRootUrl(args.baseUrl, args.version, bundle.target.releaseDir)}/${filename}`;
};

const createManifest = async (bundles: TargetBundle[], args: ParsedArgs) => {
  const downloads = Object.fromEntries(
    bundles.map((bundle) => [
      bundle.target.key,
      {
        feedUrl: `${args.baseUrl}/channels/${args.channel}/${bundle.target.releaseDir}/${bundle.target.feedFilename}`,
        directUrl: findDirectUrl(bundle, args),
      },
    ])
  );

  const manifest = {
    channel: args.channel,
    version: args.version,
    publishedAt: new Date().toISOString(),
    notesUrl: `https://github.com/${args.githubRepo}/releases/tag/v${args.version}`,
    notesSummary: [],
    rolloutPercentage: 100,
    minimumSupportedVersion: null,
    blockedVersions: [] as string[],
    downloads,
  };

  const manifestPath = path.join(args.outputDir, 'channels', args.channel, 'manifest.json');
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
};

const getBundles = async (args: ParsedArgs) => {
  const bundles: TargetBundle[] = [];
  for (const target of args.targets) {
    const sourceDir = path.join(args.inputDir, target.artifactDir);
    let stats: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stats = await fs.stat(sourceDir);
    } catch {
      fail(`Missing artifact directory: ${sourceDir}`);
    }
    if (!stats.isDirectory()) {
      fail(`Artifact path is not a directory: ${sourceDir}`);
    }

    const files = await readDirFiles(sourceDir);
    findSingle(files, (file) => file === target.feedFilename, `${target.key} feed`);
    bundles.push({ target, sourceDir, files });
  }
  return bundles;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  await ensureCleanDir(args.outputDir);

  const bundles = await getBundles(args);
  for (const bundle of bundles) {
    await copyReleaseFiles(bundle, args);
    await copyGithubAssets(bundle, args);
    await rewriteFeed(bundle, args);
  }
  await createManifest(bundles, args);

  console.log(
    JSON.stringify(
      {
        version: args.version,
        channel: args.channel,
        outputDir: args.outputDir,
        targets: bundles.map((bundle) => bundle.target.key),
      },
      null,
      2
    )
  );
};

await main();
