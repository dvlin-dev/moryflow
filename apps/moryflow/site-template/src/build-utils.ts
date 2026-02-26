/**
 * [PROVIDES]: 样式加载/压缩 + 模板契约校验工具
 * [DEPENDS]: node:fs + node:path
 * [POS]: build.ts/sync.ts 共享的生成链路基础能力
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const TEMPLATE_CONTRACTS: Record<string, string[]> = {
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

export function resolveStyleImports(filePath: string, visited = new Set<string>()): string {
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

export function loadStyles(stylesEntryPath: string, prosePath: string): string {
  const appCss = resolveStyleImports(stylesEntryPath);
  const proseCss = readFileSync(prosePath, 'utf-8');
  return appCss + '\n' + proseCss;
}

export function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

export function validateTemplateContracts(
  templatesDir: string,
  contracts: Record<string, string[]> = TEMPLATE_CONTRACTS
): void {
  const issues: string[] = [];

  for (const [fileName, placeholders] of Object.entries(contracts)) {
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
