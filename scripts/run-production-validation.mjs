#!/usr/bin/env node

import process from 'node:process';
import { spawnSync } from 'node:child_process';

import {
  buildValidationCommands,
  collectEnvFiles,
  ensureEnvFilesExist,
  normalizeProductionValidationEnv,
  resolveValidationMode,
  validateProductionValidationEnv,
} from './production-validation.helpers.mjs';

function loadEnvFiles(files) {
  if (typeof process.loadEnvFile !== 'function') {
    throw new Error('process.loadEnvFile is unavailable in the current Node.js runtime');
  }

  for (const file of files) {
    process.loadEnvFile(file);
  }
}

function runShellCommand(command, env) {
  const result = spawnSync(command, {
    cwd: process.cwd(),
    env,
    shell: true,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`Validation command failed: ${command}`);
  }
}

function main() {
  const mode = resolveValidationMode(process.argv[2]);
  const envFiles = collectEnvFiles(process.env);
  ensureEnvFilesExist(envFiles);
  loadEnvFiles(envFiles);

  const validatedEnv = validateProductionValidationEnv(process.env, mode);
  const runtimeEnv = normalizeProductionValidationEnv(validatedEnv);
  const commands = buildValidationCommands(mode);

  console.log(`[production-validation] mode=${mode}`);
  if (envFiles.length > 0) {
    console.log(`[production-validation] loaded env files: ${envFiles.join(', ')}`);
  }

  for (const step of commands) {
    console.log(`[production-validation] running ${step.label}`);
    runShellCommand(step.command, {
      ...process.env,
      ...runtimeEnv,
    });
  }
}

main();
