/**
 * SSG Build Script
 * Generates static HTML templates from React components
 */

import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import { SinglePage } from './layouts/SinglePage';
import { MultiPage } from './layouts/MultiPage';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');

// Read CSS files
function loadStyles(): string {
  const appCss = readFileSync(resolve(__dirname, 'styles/app.css'), 'utf-8');
  const proseCss = readFileSync(resolve(__dirname, 'styles/prose.css'), 'utf-8');

  // Remove @import tailwindcss (processed separately)
  const combinedCss = appCss.replace(/@import ['"]tailwindcss['"];?\n?/g, '') + '\n' + proseCss;

  return combinedCss;
}

// Minify CSS (simple minification)
function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/\s*([{}:;,])\s*/g, '$1') // Remove spaces around punctuation
    .replace(/;}/g, '}') // Remove trailing semicolons
    .trim();
}

// Generate HTML
function generateHtml(element: ReactElement): string {
  const html = renderToStaticMarkup(element);
  return '<!DOCTYPE html>\n' + html;
}

async function build() {
  console.log('Building site templates...\n');

  // Ensure dist directory exists
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  // Load and process styles
  const styles = loadStyles();
  const minifiedStyles = minifyCss(styles);

  // Generate SinglePage template
  console.log('Generating single.html...');
  const singleHtml = generateHtml(
    SinglePage({
      title: '{{title}}',
      description: '{{description}}',
      lang: '{{lang}}',
      showWatermark: true,
      styles: minifiedStyles,
    }),
  );
  writeFileSync(resolve(distDir, 'single.html'), singleHtml);
  console.log('  -> dist/single.html');

  // Generate MultiPage template
  console.log('Generating multi.html...');
  const multiHtml = generateHtml(
    MultiPage({
      title: '{{title}}',
      description: '{{description}}',
      lang: '{{lang}}',
      navigation: [],
      toc: [],
      currentPath: '{{currentPath}}',
      showWatermark: true,
      styles: minifiedStyles,
    }),
  );
  writeFileSync(resolve(distDir, 'multi.html'), multiHtml);
  console.log('  -> dist/multi.html');

  // Write raw CSS (for potential external use)
  writeFileSync(resolve(distDir, 'styles.css'), styles);
  console.log('  -> dist/styles.css');

  // Write minified CSS
  writeFileSync(resolve(distDir, 'styles.min.css'), minifiedStyles);
  console.log('  -> dist/styles.min.css');

  console.log('\nBuild complete!');
  console.log('\nTemplate placeholders:');
  console.log('  {{title}}       - Page title');
  console.log('  {{description}} - Page description (meta)');
  console.log('  {{lang}}        - Language code (e.g., "en", "zh-CN")');
  console.log('  {{content}}     - User content HTML');
  console.log('  {{styles}}      - Inline CSS (already embedded)');
  console.log('  {{currentPath}} - Current page path (multi-page only)');
}

build().catch(console.error);
