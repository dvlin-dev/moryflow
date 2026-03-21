import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const stableReleaseTagPattern = /^v\d+\.\d+\.\d+$/;

function parseArgs(argv) {
  const args = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }

    args.set(key, value);
    index += 1;
  }

  return args;
}

function buildHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'moryflow-release-notes-generator',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function requestJson(url, { token, fetchImpl = fetch, ...init } = {}) {
  const response = await fetchImpl(url, {
    ...init,
    headers: {
      ...(token ? buildHeaders(token) : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${body}`);
  }

  return response.json();
}

export function selectPreviousPublishedStableRelease(releases, currentTag) {
  return [...releases]
    .filter(
      (release) =>
        release?.tag_name !== currentTag &&
        !release?.draft &&
        !release?.prerelease &&
        stableReleaseTagPattern.test(release?.tag_name ?? '') &&
        typeof release?.published_at === 'string'
    )
    .sort((left, right) => {
      const leftTimestamp = new Date(left.published_at).getTime();
      const rightTimestamp = new Date(right.published_at).getTime();
      return rightTimestamp - leftTimestamp;
    })[0];
}

async function listReleases({ repo, token, fetchImpl = fetch, maxPages = 10, perPage = 100 }) {
  const releases = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const pageItems = await requestJson(
      `https://api.github.com/repos/${repo}/releases?per_page=${perPage}&page=${page}`,
      {
        fetchImpl,
        token,
      }
    );

    releases.push(...pageItems);

    if (pageItems.length < perPage) {
      break;
    }
  }

  return releases;
}

export async function generateReleaseNotes({
  currentTag,
  fetchImpl = fetch,
  repo,
  targetCommitish,
  token,
}) {
  const releases = await listReleases({ fetchImpl, repo, token });
  const previousRelease = selectPreviousPublishedStableRelease(releases, currentTag);

  const payload = {
    tag_name: currentTag,
    target_commitish: targetCommitish,
  };

  if (previousRelease?.tag_name) {
    payload.previous_tag_name = previousRelease.tag_name;
  }

  const notes = await requestJson(`https://api.github.com/repos/${repo}/releases/generate-notes`, {
    body: JSON.stringify(payload),
    fetchImpl,
    method: 'POST',
    token,
  });

  return {
    body: notes.body,
    name: notes.name ?? currentTag,
    previousTagName: previousRelease?.tag_name ?? null,
  };
}

async function writeOutputFile(outputPath, content) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, content, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = args.get('repo');
  const currentTag = args.get('tag');
  const targetCommitish = args.get('target');
  const outputPath = args.get('output');
  const titleOutputPath = args.get('title-output');
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;

  if (!repo || !currentTag || !targetCommitish || !outputPath || !titleOutputPath) {
    throw new Error(
      'Usage: node scripts/generate-release-notes.mjs --repo <owner/repo> --tag <tag> --target <sha> --output <notes.md> --title-output <title.txt>'
    );
  }

  if (!token) {
    throw new Error('GITHUB_TOKEN or GH_TOKEN is required.');
  }

  const notes = await generateReleaseNotes({
    currentTag,
    repo,
    targetCommitish,
    token,
  });

  await writeOutputFile(outputPath, `${notes.body.trim()}\n`);
  await writeOutputFile(titleOutputPath, `${notes.name.trim()}\n`);

  if (notes.previousTagName) {
    console.log(`Generated release notes for ${currentTag} from ${notes.previousTagName}.`);
    return;
  }

  console.log(
    `Generated release notes for ${currentTag} without a previous stable release baseline.`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
