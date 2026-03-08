#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const shouldSkipForCi = Boolean(process.env.CI);
const shouldSkipForProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.npm_config_production === 'true' ||
  process.env.npm_config_omit?.split(',').includes('dev');
const huskyBinary = path.join(__dirname, '..', 'node_modules', '.bin', 'husky');

if (shouldSkipForCi) {
  console.log('[prepare] CI detected, skipping husky install');
  process.exit(0);
}

if (shouldSkipForProduction) {
  console.log('[prepare] production install detected, skipping husky install');
  process.exit(0);
}

if (!fs.existsSync(huskyBinary)) {
  console.log('[prepare] husky unavailable, skipping hook install');
  process.exit(0);
}

const result = spawnSync(huskyBinary, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
