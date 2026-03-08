import { describe, expect, it } from 'vitest';
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const browserEntry = path.resolve(currentDir, '../src/index.browser.ts');
const agentsRuntimeTaskStateEntry = path.resolve(
  currentDir,
  '../../agents-runtime/src/task-state.ts'
);

describe('index.browser', () => {
  it('bundles for browser without pulling in node builtins', async () => {
    await expect(
      build({
        entryPoints: [browserEntry],
        alias: {
          '@moryflow/agents-runtime/task-state': agentsRuntimeTaskStateEntry,
        },
        bundle: true,
        platform: 'browser',
        format: 'esm',
        write: false,
        logLevel: 'silent',
      })
    ).resolves.toBeDefined();
  });
});
