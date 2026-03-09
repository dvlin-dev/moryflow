import { access, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GENERATED_PATTERNS = [/^generated\//, /\/routeTree\.gen\./, /\/\.tanstack\//];
const ALLOWED_GENERATED_OUTPUTS = new Set(['generated/harness/agent-surface.json']);
const REPO_DOC_PATH_PATTERN = /`([^`\n]+)`/g;

const defaultExists = async (targetPath) => {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const normalizeFilePath = (value) => value.split(path.sep).join('/');

const parseGitStatusEntry = (line) => {
  const trimmed = line.trimEnd();
  if (!trimmed || trimmed.length < 3) return null;
  const stagedStatus = trimmed[0];
  const worktreeStatus = trimmed[1];
  const payload = trimmed.slice(3);
  const paths = payload.includes(' -> ')
    ? payload
        .split(' -> ')
        .map((item) => normalizeFilePath(item.trim()))
        .filter(Boolean)
    : payload
      ? [normalizeFilePath(payload)]
      : [];
  if (paths.length === 0) {
    return null;
  }
  return {
    stagedStatus,
    worktreeStatus,
    paths,
  };
};

const parseCommittedDiffEntry = (line) => {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const [status, ...paths] = trimmed
    .split('\t')
    .map((item) => normalizeFilePath(item.trim()))
    .filter(Boolean);
  if (!status || paths.length === 0) {
    return null;
  }
  return {
    status,
    paths,
  };
};

const collectReferenceSensitivePaths = (entries, isReferenceSensitiveEntry) =>
  entries
    .filter((entry) => isReferenceSensitiveEntry(entry))
    .flatMap((entry) => entry.paths)
    .filter(Boolean);

const readGitStatusEntries = (rootDir) =>
  readGitLines(rootDir, ['status', '--porcelain'])
    .map((line) => parseGitStatusEntry(line))
    .filter(Boolean);

const isReferenceSensitiveWorkingTreeEntry = (entry) =>
  entry.stagedStatus === 'D' ||
  entry.worktreeStatus === 'D' ||
  entry.stagedStatus === 'R' ||
  entry.worktreeStatus === 'R';

const listReferenceSensitiveWorkingTreeFiles = (rootDir = process.cwd()) =>
  collectReferenceSensitivePaths(
    readGitStatusEntries(rootDir),
    isReferenceSensitiveWorkingTreeEntry
  );

const readCommittedDiffEntries = (rootDir, comparisonBase) =>
  readGitLines(rootDir, [
    'diff',
    '--name-status',
    '--find-renames',
    '--diff-filter=ACMRD',
    `${comparisonBase}..HEAD`,
  ])
    .map((line) => parseCommittedDiffEntry(line))
    .filter(Boolean);

const isReferenceSensitiveCommittedEntry = (entry) =>
  entry.status.startsWith('D') || entry.status.startsWith('R');

const listCommittedReferenceSensitiveFiles = (
  rootDir = process.cwd(),
  compareBaseRef = 'origin/main'
) => {
  const comparisonBase = resolveComparisonBase(rootDir, compareBaseRef);
  if (!comparisonBase) {
    return [];
  }
  return collectReferenceSensitivePaths(
    readCommittedDiffEntries(rootDir, comparisonBase),
    isReferenceSensitiveCommittedEntry
  );
};

const parseGitStatusLine = (line) => {
  const entry = parseGitStatusEntry(line);
  if (!entry) return null;
  return entry.paths;
};

const listCommittedDiffEntries = (rootDir = process.cwd(), compareBaseRef = 'origin/main') => {
  const comparisonBase = resolveComparisonBase(rootDir, compareBaseRef);
  if (!comparisonBase) {
    return [];
  }
  return readCommittedDiffEntries(rootDir, comparisonBase);
};

const flattenCommittedDiffPaths = (entries) =>
  entries.flatMap((entry) => {
    if (entry.status.startsWith('R') || entry.status.startsWith('C')) {
      return entry.paths;
    }
    return [entry.paths.at(-1)];
  });

const parseGitStatusLineLegacy = (line) => {
  const trimmed = line.trimEnd();
  if (!trimmed) return null;
  const payload = trimmed.slice(3);
  if (payload.includes(' -> ')) {
    return payload
      .split(' -> ')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return payload ? [payload] : null;
};

const readGitLines = (rootDir, args) => {
  try {
    const output = execFileSync('git', args, {
      cwd: rootDir,
      encoding: 'utf8',
    });
    return output
      .split('\n')
      .filter(Boolean)
      .map((item) => normalizeFilePath(item));
  } catch {
    return [];
  }
};

export const listChangedFiles = (rootDir = process.cwd()) =>
  readGitLines(rootDir, ['status', '--porcelain'])
    .flatMap((line) => parseGitStatusLine(line) ?? parseGitStatusLineLegacy(line) ?? [])
    .filter(Boolean);

const resolveComparisonBase = (rootDir, compareBaseRef) => {
  if (!compareBaseRef) {
    return null;
  }
  try {
    const output = execFileSync('git', ['merge-base', 'HEAD', compareBaseRef], {
      cwd: rootDir,
      encoding: 'utf8',
    }).trim();
    return output.length > 0 ? output : null;
  } catch {
    return null;
  }
};

const canResolveComparisonBase = (rootDir, compareBaseRef) =>
  compareBaseRef ? resolveComparisonBase(rootDir, compareBaseRef) !== null : true;

export const listCommittedDiffFiles = (rootDir = process.cwd(), compareBaseRef = 'origin/main') => {
  return flattenCommittedDiffPaths(listCommittedDiffEntries(rootDir, compareBaseRef));
};

export const listTrackedFiles = (rootDir = process.cwd()) => readGitLines(rootDir, ['ls-files']);

export const isGeneratedArtifactPath = (filePath) => {
  if (filePath === 'generated' || filePath === 'generated/') {
    return false;
  }
  return GENERATED_PATTERNS.some((pattern) => pattern.test(filePath));
};

export const isAllowedGeneratedOutput = (filePath) =>
  ALLOWED_GENERATED_OUTPUTS.has(normalizeFilePath(filePath));

const isPlanDocPath = (filePath) =>
  normalizeFilePath(filePath).startsWith('docs/plans/') &&
  normalizeFilePath(filePath).endsWith('.md');

const isClaudeOrAgentsFilePath = (filePath) => {
  const normalized = normalizeFilePath(filePath);
  return (
    normalized === 'CLAUDE.md' ||
    normalized === 'AGENTS.md' ||
    normalized.endsWith('/CLAUDE.md') ||
    normalized.endsWith('/AGENTS.md')
  );
};

const resolveReferencedRepoPath = (rootDir, sourceFile, reference) => {
  const resolvedPath = resolveDocReferencePath(rootDir, sourceFile, reference);
  const relativePath = path.relative(rootDir, resolvedPath);
  if (!relativePath || relativePath.startsWith('..')) {
    return null;
  }
  return normalizeFilePath(relativePath);
};

const collectImpactedContractFiles = async (rootDir, candidateFiles) => {
  if (candidateFiles.length === 0) {
    return [];
  }

  const candidateSet = new Set(candidateFiles.map((filePath) => normalizeFilePath(filePath)));
  const contractFiles = listTrackedFiles(rootDir).filter(isClaudeOrAgentsFilePath);
  const impacted = [];

  for (const contractFile of contractFiles) {
    const absolutePath = path.join(rootDir, contractFile);
    if (!(await defaultExists(absolutePath))) {
      continue;
    }
    const text = await import('node:fs/promises').then((fs) => fs.readFile(absolutePath, 'utf8'));
    const references = collectBacktickPaths(text);
    const referencesChangedFile = references.some((reference) => {
      const resolvedReference = resolveReferencedRepoPath(rootDir, contractFile, reference);
      return resolvedReference ? candidateSet.has(resolvedReference) : false;
    });
    if (referencesChangedFile) {
      impacted.push(contractFile);
    }
  }

  return impacted;
};

export const listFilesForValidation = async (
  rootDir = process.cwd(),
  compareBaseRef = 'origin/main'
) => {
  const workingTreeFiles = listChangedFiles(rootDir);
  const committedDiffFiles = listCommittedDiffFiles(rootDir, compareBaseRef);
  const candidateFiles =
    workingTreeFiles.length > 0
      ? [...new Set([...workingTreeFiles, ...committedDiffFiles])]
      : committedDiffFiles;
  const referenceSensitiveFiles = [
    ...new Set([
      ...listReferenceSensitiveWorkingTreeFiles(rootDir),
      ...listCommittedReferenceSensitiveFiles(rootDir, compareBaseRef),
    ]),
  ];
  const impactedContractFiles = await collectImpactedContractFiles(
    rootDir,
    referenceSensitiveFiles
  );
  return [...new Set([...candidateFiles, ...impactedContractFiles])];
};

export const isPlanWritebackSatisfied = (text) => {
  return (
    text.includes('docs/design/') || text.includes('docs/reference/') || text.includes('CLAUDE.md')
  );
};

const isRepoPathCandidate = (value) => {
  if (!value || value.startsWith('http') || value.startsWith('/')) return false;
  if (value.includes('*') || value.includes('{') || value.includes('}')) return false;
  if (value.startsWith('[') || value.startsWith('<')) return false;
  const normalizedValue = normalizeFilePath(value);
  if (
    normalizedValue.startsWith('docs/') ||
    normalizedValue.startsWith('apps/') ||
    normalizedValue.startsWith('packages/') ||
    normalizedValue.startsWith('tooling/') ||
    normalizedValue.startsWith('scripts/') ||
    normalizedValue.startsWith('deploy/') ||
    normalizedValue.startsWith('../') ||
    normalizedValue.startsWith('./')
  ) {
    return true;
  }
  if (!normalizedValue.includes('/')) {
    return false;
  }
  const basename = path.posix.basename(normalizedValue);
  return basename.includes('.');
};

const collectBacktickPaths = (text) => {
  const results = [];
  for (const match of text.matchAll(REPO_DOC_PATH_PATTERN)) {
    const candidate = match[1]?.trim();
    if (candidate && isRepoPathCandidate(candidate)) {
      results.push(candidate);
    }
  }
  return results;
};

const resolveDocReferencePath = (rootDir, sourceFile, reference) => {
  if (
    reference.startsWith('docs/') ||
    reference.startsWith('apps/') ||
    reference.startsWith('packages/') ||
    reference.startsWith('tooling/') ||
    reference.startsWith('scripts/') ||
    reference.startsWith('deploy/')
  ) {
    return path.join(rootDir, reference);
  }
  return path.resolve(path.dirname(path.join(rootDir, sourceFile)), reference);
};

const countFilesRecursively = async (dirPath) => {
  let count = 0;
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      count += await countFilesRecursively(entryPath);
    } else {
      count += 1;
    }
  }
  return count;
};

export const checkDocContracts = async (input = {}) => {
  const rootDir = input.rootDir ?? process.cwd();
  const compareBaseRef = input.compareBaseRef ?? 'origin/main';
  const explicitFiles = input.files;
  const missingCompareBase =
    !explicitFiles && compareBaseRef && !canResolveComparisonBase(rootDir, compareBaseRef);
  const files = (explicitFiles ?? (await listFilesForValidation(rootDir, compareBaseRef))).map(
    (item) => normalizeFilePath(item)
  );
  const exists = input.existsOverride ?? defaultExists;
  const errors = [];
  const warnings = [];

  if (missingCompareBase) {
    errors.push(`无法解析 compare base：${compareBaseRef}`);
    return { errors, warnings, checkedFiles: files };
  }

  for (const filePath of files) {
    if (isGeneratedArtifactPath(filePath) && !isAllowedGeneratedOutput(filePath)) {
      errors.push(`禁止手改 generated 产物：${filePath}`);
      continue;
    }

    if (isPlanDocPath(filePath)) {
      const absolutePath = path.join(rootDir, filePath);
      if (!(await exists(absolutePath))) {
        continue;
      }
      const text = await import('node:fs/promises').then((fs) => fs.readFile(absolutePath, 'utf8'));
      if (!isPlanWritebackSatisfied(text)) {
        errors.push(`执行期计划文档必须引用稳定事实源或明确回写目标：${filePath}`);
      }
      continue;
    }

    const isClaudeFile = isClaudeOrAgentsFilePath(filePath);

    if (isClaudeFile) {
      const absolutePath = path.join(rootDir, filePath);
      if (!(await exists(absolutePath))) {
        continue;
      }
      const text = await import('node:fs/promises').then((fs) => fs.readFile(absolutePath, 'utf8'));
      const references = collectBacktickPaths(text);
      for (const reference of references) {
        const resolvedPath = resolveDocReferencePath(rootDir, filePath, reference);
        if (!(await exists(resolvedPath))) {
          errors.push(`CLAUDE/AGENTS 引用了不存在的入口：${filePath} -> ${reference}`);
        }
      }

      if (filePath !== 'CLAUDE.md' && filePath !== 'AGENTS.md') {
        const dirPath = path.dirname(absolutePath);
        const fileCount = await countFilesRecursively(dirPath);
        if (fileCount <= 10) {
          errors.push(`目录文件数 <= 10 时不得新增局部 CLAUDE/AGENTS：${filePath}`);
        }
      }
    }
  }

  return { errors, warnings, checkedFiles: files };
};

const runCli = async () => {
  const result = await checkDocContracts();
  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(`[check-doc-contracts] ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      console.warn(`[check-doc-contracts] ${warning}`);
    }
  }
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await runCli();
}
