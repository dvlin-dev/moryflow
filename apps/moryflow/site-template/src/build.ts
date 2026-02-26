/**
 * [INPUT]: src/styles/*.css + src/templates/*.html
 * [OUTPUT]: dist/styles.css + dist/styles.min.css
 * [POS]: site-template 构建入口；负责样式产物与模板契约校验
 *
 * [PROTOCOL]: 本文件变更时，需同步更新本目录 CLAUDE.md
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');
const templatesDir = resolve(__dirname, 'templates');

const TEMPLATE_CONTRACTS: Record<string, string[]> = {
  'page.html': [
    '{{lang}}',
    '{{title}}',
    '{{pageTitle}}',
    '{{description}}',
    '{{favicon}}',
    '{{bodyClass}}',
    '{{layoutClass}}',
    '{{sidebar}}',
    '{{content}}',
    '{{STYLES}}',
    '{{THEME_INIT_SCRIPT}}',
    '{{THEME_TOGGLE_SCRIPT}}',
    '{{MENU_TOGGLE_SCRIPT}}',
    '{{THEME_TOGGLE_BUTTON}}',
    '{{BRAND_FOOTER_LINK}}',
  ],
  'sidebar.html': ['{{siteTitle}}', '{{navItems}}'],
  'index-page.html': [
    '{{lang}}',
    '{{siteTitle}}',
    '{{description}}',
    '{{navItems}}',
    '{{favicon}}',
    '{{STYLES}}',
    '{{INDEX_PAGE_STYLES}}',
    '{{THEME_INIT_SCRIPT}}',
    '{{THEME_TOGGLE_SCRIPT}}',
    '{{THEME_TOGGLE_BUTTON}}',
    '{{BRAND_FOOTER_LINK}}',
  ],
  '404.html': [
    '{{lang}}',
    '{{siteTitle}}',
    '{{description}}',
    '{{favicon}}',
    '{{STYLES}}',
    '{{ERROR_PAGE_STYLES}}',
    '{{THEME_INIT_SCRIPT}}',
  ],
};

function loadStyles(): string {
  const appCss = resolveStyleImports(resolve(__dirname, 'styles/app.css'));
  const proseCss = readFileSync(resolve(__dirname, 'styles/prose.css'), 'utf-8');
  return appCss + '\n' + proseCss;
}

function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function resolveStyleImports(filePath: string, visited = new Set<string>()): string {
  const normalizedPath = resolve(filePath);
  if (visited.has(normalizedPath)) {
    return '';
  }
  visited.add(normalizedPath);

  const content = readFileSync(normalizedPath, 'utf-8');
  const importPattern = /@import\s+['"]([^'"]+)['"]\s*;?/g;
  const resolvedContent = content.replace(importPattern, (_match, specifier: string) => {
    if (specifier === 'tailwindcss') {
      return '';
    }

    if (!specifier.startsWith('.')) {
      throw new Error(
        `Unsupported @import "${specifier}" in ${normalizedPath}. ` +
          'Only relative imports and "tailwindcss" are allowed.'
      );
    }

    const nestedPath = resolve(dirname(normalizedPath), specifier);
    return '\n' + resolveStyleImports(nestedPath, visited) + '\n';
  });

  if (/@import\s+/i.test(resolvedContent)) {
    throw new Error(
      `Unsupported @import syntax found in ${normalizedPath}. ` +
        'Use quoted relative imports only.'
    );
  }

  return resolvedContent;
}

function validateTemplateContracts(): void {
  const issues: string[] = [];

  for (const [fileName, placeholders] of Object.entries(TEMPLATE_CONTRACTS)) {
    const filePath = resolve(templatesDir, fileName);
    const content = readFileSync(filePath, 'utf-8');

    for (const placeholder of placeholders) {
      if (!content.includes(placeholder)) {
        issues.push(`${fileName}: missing ${placeholder}`);
      }
    }
  }

  if (issues.length > 0) {
    throw new Error(`Template contract validation failed:\n- ${issues.join('\n- ')}`);
  }
}

function build(): void {
  console.log('Building site-template assets...\n');

  validateTemplateContracts();
  console.log('✓ Template contracts validated');

  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  const styles = loadStyles();
  const minifiedStyles = minifyCss(styles);

  writeFileSync(resolve(distDir, 'styles.css'), styles);
  console.log('  -> dist/styles.css');

  writeFileSync(resolve(distDir, 'styles.min.css'), minifiedStyles);
  console.log('  -> dist/styles.min.css');

  console.log('\nBuild complete!');
}

build();
