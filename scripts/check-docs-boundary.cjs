#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'docs');

const ALLOWED_ROOT_MARKDOWN = new Set([
  'docs/index.md',
  'docs/CLAUDE.md',
  'docs/AGENTS.md',
  'docs/design-reorganization-plan.md',
]);

const ALLOWED_PRODUCTS = new Set(['anyhunt', 'moryflow']);
const ALLOWED_CATEGORIES = new Set(['core', 'features', 'runbooks']);

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function walk(dirPath, callback) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, callback);
      continue;
    }
    callback(fullPath);
  }
}

function collectMarkdownFiles() {
  if (!fs.existsSync(DOCS_DIR)) {
    return [];
  }

  const files = [];
  walk(DOCS_DIR, (fullPath) => {
    if (path.extname(fullPath) !== '.md') {
      return;
    }
    files.push(toPosix(path.relative(ROOT, fullPath)));
  });
  return files.sort();
}

function failWithReport(title, issues) {
  console.error(`\n[docs-boundary] ${title}`);
  for (const issue of issues) {
    console.error(`  - ${issue}`);
  }
  process.exit(1);
}

const markdownFiles = collectMarkdownFiles();

const filesOutsideDesign = markdownFiles.filter((file) => {
  if (file.startsWith('docs/design/')) {
    return false;
  }
  return !ALLOWED_ROOT_MARKDOWN.has(file);
});

if (filesOutsideDesign.length > 0) {
  failWithReport('发现不在 docs/design 下的正文文档', filesOutsideDesign);
}

const designDir = path.join(DOCS_DIR, 'design');
if (!fs.existsSync(designDir) || !fs.statSync(designDir).isDirectory()) {
  failWithReport('docs/design 目录缺失', ['docs/design']);
}

const designEntries = fs.readdirSync(designDir, { withFileTypes: true });
const invalidFirstLevelDirs = designEntries
  .filter((entry) => entry.isDirectory() && !ALLOWED_PRODUCTS.has(entry.name))
  .map((entry) => `docs/design/${entry.name}`)
  .sort();

if (invalidFirstLevelDirs.length > 0) {
  failWithReport('docs/design 第一层目录仅允许 anyhunt/moryflow', invalidFirstLevelDirs);
}

const categoryIssues = [];
for (const product of ALLOWED_PRODUCTS) {
  const productDir = path.join(designDir, product);
  if (!fs.existsSync(productDir) || !fs.statSync(productDir).isDirectory()) {
    categoryIssues.push(`docs/design/${product} 缺失`);
    continue;
  }

  const productEntries = fs.readdirSync(productDir, { withFileTypes: true });

  for (const entry of productEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (!ALLOWED_CATEGORIES.has(entry.name)) {
      categoryIssues.push(`docs/design/${product}/${entry.name} 非法分类目录`);
      continue;
    }

    const categoryDir = path.join(productDir, entry.name);
    const nestedDirs = fs
      .readdirSync(categoryDir, { withFileTypes: true })
      .filter((child) => child.isDirectory())
      .map((child) => `docs/design/${product}/${entry.name}/${child.name}`);

    for (const nestedDir of nestedDirs) {
      categoryIssues.push(`${nestedDir} 非法子目录（分类目录下禁止再建子目录）`);
    }
  }
}

if (categoryIssues.length > 0) {
  failWithReport('docs/design/<product>/<category> 层级不符合规范', categoryIssues.sort());
}

console.log('[docs-boundary] OK');
