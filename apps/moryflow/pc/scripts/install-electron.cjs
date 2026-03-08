#!/usr/bin/env node

const path = require('node:path');
const { createRequire } = require('node:module');

const requireFromPackage = createRequire(path.resolve(__dirname, '../package.json'));
const electronPackageJsonPath = requireFromPackage.resolve('electron/package.json');
const electronInstallScriptPath = path.join(path.dirname(electronPackageJsonPath), 'install.js');

require(electronInstallScriptPath);
