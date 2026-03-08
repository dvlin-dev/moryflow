#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

if (process.env.CI) {
  console.log('[postinstall] CI detected, skipping workspace package build');
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
