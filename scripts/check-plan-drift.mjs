import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_PLANS_DIR = 'docs/plans';
const STABLE_DOC_PREFIXES = ['docs/design/', 'docs/reference/'];
const STABLE_FACT_HEADING_SOURCE =
  '^#{2,6}\\s*(当前状态|当前结论|当前实现|当前验证基线|最终原则|核心边界)\\s*$';

function normalizeSlash(inputPath) {
  return inputPath.split(path.sep).join('/');
}

function isMarkdownFile(filePath) {
  return filePath.endsWith('.md') || filePath.endsWith('.mdx');
}

async function listMarkdownFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(absolutePath)));
      continue;
    }
    if (entry.isFile() && isMarkdownFile(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

export function extractDocPaths(content) {
  const paths = new Set();

  for (const match of content.matchAll(/\[[^\]]+\]\((docs\/[^)\s]+\.mdx?)\)/g)) {
    paths.add(match[1]);
  }

  for (const match of content.matchAll(/`(docs\/[^`\s]+\.mdx?)`/g)) {
    paths.add(match[1]);
  }

  return [...paths];
}

function extractCurrentStateSections(content) {
  const sections = [];
  const headingRegex = /^#{2,6}\s*(当前状态|当前结论|当前实现|当前验证基线)\s*$/gim;
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const sectionStart = match.index + match[0].length;
    const rest = content.slice(sectionStart);
    const nextHeadingMatch = rest.match(/\n#{1,6}\s+/);
    const sectionEnd = nextHeadingMatch ? sectionStart + nextHeadingMatch.index : content.length;
    sections.push(content.slice(sectionStart, sectionEnd).trim());
  }

  return sections.filter(Boolean);
}

function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

async function pathExists(absolutePath) {
  try {
    await readFile(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function findConflictingStableDocs(rootDir, content, stableDocPaths) {
  const planSections = extractCurrentStateSections(content).map(normalizeText);
  if (planSections.length === 0) {
    return [];
  }

  const conflicts = [];

  for (const stableDocPath of stableDocPaths) {
    const absolutePath = path.join(rootDir, stableDocPath);
    if (!(await pathExists(absolutePath))) {
      continue;
    }
    const stableContent = await readFile(absolutePath, 'utf8');
    const stableSections = extractCurrentStateSections(stableContent).map(normalizeText);

    if (stableSections.length === 0) {
      continue;
    }

    const hasConflict = planSections.some((planSection) =>
      stableSections.every(
        (stableSection) =>
          planSection !== stableSection &&
          !planSection.includes(stableSection) &&
          !stableSection.includes(planSection)
      )
    );

    if (hasConflict) {
      conflicts.push(stableDocPath);
    }
  }

  return conflicts;
}

function hasStableFactMarkers(content) {
  return new RegExp(STABLE_FACT_HEADING_SOURCE, 'im').test(content);
}

export function classifyPlanDrift(input) {
  const { planPath, content, missingReferences, stableDocPaths, conflictingStableDocs } = input;

  if (missingReferences.length > 0) {
    return {
      planPath,
      classification: 'delete',
      reasons: ['计划文档引用了不存在的稳定文档或路径'],
      missingReferences,
      stableDocPaths,
      conflictingStableDocs,
    };
  }

  const reasons = [];

  if (conflictingStableDocs.length > 0) {
    reasons.push('计划文档中的当前状态与长期文档当前状态存在冲突');
  }

  if (stableDocPaths.length > 0 && hasStableFactMarkers(content)) {
    reasons.push('计划文档仍保留应回写到长期文档的稳定事实');
  }

  if (reasons.length > 0) {
    return {
      planPath,
      classification: 'rewrite-to-design',
      reasons,
      missingReferences,
      stableDocPaths,
      conflictingStableDocs,
    };
  }

  return {
    planPath,
    classification: 'keep',
    reasons: ['计划文档仍以执行步骤为主，未发现稳定事实漂移'],
    missingReferences,
    stableDocPaths,
    conflictingStableDocs,
  };
}

export async function analyzePlanDrift({
  rootDir = process.cwd(),
  plansDir = DEFAULT_PLANS_DIR,
} = {}) {
  const absolutePlansDir = path.join(rootDir, plansDir);
  const planFiles = await listMarkdownFiles(absolutePlansDir);
  const results = [];

  for (const absolutePlanPath of planFiles) {
    const relativePlanPath = normalizeSlash(path.relative(rootDir, absolutePlanPath));
    const content = await readFile(absolutePlanPath, 'utf8');
    const referencedDocPaths = extractDocPaths(content);
    const stableDocPaths = referencedDocPaths.filter((docPath) =>
      STABLE_DOC_PREFIXES.some((prefix) => docPath.startsWith(prefix))
    );
    const missingReferences = [];

    for (const docPath of stableDocPaths) {
      const exists = await pathExists(path.join(rootDir, docPath));
      if (!exists) {
        missingReferences.push(docPath);
      }
    }

    const conflictingStableDocs = await findConflictingStableDocs(rootDir, content, stableDocPaths);

    results.push(
      classifyPlanDrift({
        planPath: relativePlanPath,
        content,
        missingReferences,
        stableDocPaths,
        conflictingStableDocs,
      })
    );
  }

  return { results };
}

function formatResult(result) {
  const reasons = result.reasons.join('；');
  const missing =
    result.missingReferences.length > 0 ? ` missing=${result.missingReferences.join(',')}` : '';
  const conflicts =
    result.conflictingStableDocs.length > 0
      ? ` conflicts=${result.conflictingStableDocs.join(',')}`
      : '';
  return `${result.classification}\t${result.planPath}\t${reasons}${missing}${conflicts}`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { results } = await analyzePlanDrift();
  for (const result of results) {
    console.log(formatResult(result));
  }
}
