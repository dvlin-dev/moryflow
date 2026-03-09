import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function isDocsOnlyStagedFile(filePath) {
  return filePath.endsWith('.md') || filePath.endsWith('.mdx');
}

export function shouldSkipPrecommitTypecheck(stagedFiles) {
  if (stagedFiles.length === 0) {
    return false;
  }

  return stagedFiles.every(isDocsOnlyStagedFile);
}

export function getStagedFiles() {
  const output = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMRD'], {
    encoding: 'utf8',
  });

  return output
    .split('\n')
    .map((filePath) => filePath.trim())
    .filter(Boolean);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(shouldSkipPrecommitTypecheck(getStagedFiles()) ? 0 : 1);
}
