#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {
  assertAgentsExtensionsPatch,
} = require('./assert-agents-extensions-patch.cjs');

// ── React singleton fix ────────────────────────────────────────────────
// pnpm node-linker=hoisted creates a separate physical copy of React at
// root node_modules/. This causes "Invalid hook call" in vitest because
// CJS require() inside react-dom resolves a different React instance.
// Replace the root copies with symlinks to the .pnpm store so every
// consumer shares the same module identity.
const rootNm = path.resolve(__dirname, '..', 'node_modules');
const reactLinks = [
  { name: 'react', target: '.pnpm/react@19.2.3/node_modules/react' },
  { name: 'react-dom', target: '.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom' },
];
for (const { name, target } of reactLinks) {
  const linkPath = path.join(rootNm, name);
  const targetPath = path.join(rootNm, target);
  if (!fs.existsSync(targetPath)) continue;
  try {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink()) continue; // already a symlink
    fs.rmSync(linkPath, { recursive: true, force: true });
  } catch {}
  fs.symlinkSync(target, linkPath);
}

const shouldSkipForCi = Boolean(process.env.CI);
const shouldSkipForProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.npm_config_production === 'true' ||
  process.env.npm_config_omit?.split(',').includes('dev');
const shouldSkipForExplicitOptOut = process.env.SKIP_WORKSPACE_BUILD === '1';

if (shouldSkipForCi) {
  console.log('[postinstall] CI detected, skipping workspace package build');
  process.exit(0);
}

// Run after CI early-exit: isolated linker in CI doesn't hoist transitive
// deps to root node_modules, so the assertion would fail there. CI builds
// verify the patch via the smoke-check step instead.
assertAgentsExtensionsPatch(path.resolve(__dirname, '..'));

if (shouldSkipForProduction) {
  console.log('[postinstall] production install detected, skipping workspace package build');
  process.exit(0);
}

if (shouldSkipForExplicitOptOut) {
  console.log('[postinstall] SKIP_WORKSPACE_BUILD=1, skipping workspace package build');
  process.exit(0);
}

const result = spawnSync('pnpm', ['run', 'build:packages'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
