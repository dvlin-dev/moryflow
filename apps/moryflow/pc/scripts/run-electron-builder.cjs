#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const cliPath = require.resolve('electron-builder/out/cli/cli.js');
const args = process.argv.slice(2);

const result = spawnSync(process.execPath, [cliPath, ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    npm_config_node_linker: 'isolated',
  },
});

if (result.error) {
  throw result.error;
}

process.exit(typeof result.status === 'number' ? result.status : 1);
