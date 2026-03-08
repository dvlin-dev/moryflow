/**
 * [INPUT]: src/styles/*.css + src/templates/*.html
 * [OUTPUT]: dist/styles.css + dist/styles.min.css
 * [POS]: site-template 构建入口；负责样式产物与模板契约校验
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStyles, minifyCss, validateTemplateContracts } from './build-utils';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');
const templatesDir = resolve(__dirname, 'templates');
const stylesEntryPath = resolve(__dirname, 'styles/app.css');
const proseStylesPath = resolve(__dirname, 'styles/prose.css');

function build(): void {
  console.log('Building site-template assets...\n');

  validateTemplateContracts(templatesDir);
  console.log('✓ Template contracts validated');

  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  const styles = loadStyles(stylesEntryPath, proseStylesPath);
  const minifiedStyles = minifyCss(styles);

  writeFileSync(resolve(distDir, 'styles.css'), styles);
  console.log('  -> dist/styles.css');

  writeFileSync(resolve(distDir, 'styles.min.css'), minifiedStyles);
  console.log('  -> dist/styles.min.css');

  console.log('\nBuild complete!');
}

build();
