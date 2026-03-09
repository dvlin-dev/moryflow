#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

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
