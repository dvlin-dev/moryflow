import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

type ExportEntry = string | { import?: string; require?: string; types?: string };

// 本测试确保 package.json 的 exports 对 aiModels 子模块具备可消费导出
describe('model-bank package.json exports should cover all aiModels files', () => {
  const packageRoot = path.resolve(__dirname, '..');
  const aiModelsDir = path.resolve(packageRoot, 'src/aiModels');
  const packageJsonPath = path.resolve(packageRoot, 'package.json');

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
    exports?: Record<string, ExportEntry>;
  };

  const allModelFiles = readdirSync(aiModelsDir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => f.replace(/\.ts$/, ''))
    // 排除非 provider 文件，如 index、类型声明等
    .filter((name) => !['index'].includes(name));

  const matchesLegacyEntry = (entry: ExportEntry, modelName: string): boolean => {
    if (typeof entry === 'string') {
      return entry === `./src/aiModels/${modelName}.ts`;
    }

    return (
      entry.import === `./src/aiModels/${modelName}.ts` ||
      entry.require === `./src/aiModels/${modelName}.ts` ||
      entry.types === `./src/aiModels/${modelName}.ts`
    );
  };

  const matchesDistEntry = (entry: ExportEntry, modelName: string): boolean => {
    if (typeof entry === 'string') {
      return (
        entry === `./dist/aiModels/${modelName}.mjs` ||
        entry === `./dist/aiModels/${modelName}.cjs` ||
        entry === `./dist/aiModels/${modelName}.d.ts`
      );
    }

    return (
      entry.import === `./dist/aiModels/${modelName}.mjs` &&
      entry.require === `./dist/aiModels/${modelName}.cjs` &&
      entry.types === `./dist/aiModels/${modelName}.d.ts`
    );
  };

  it('every aiModels file should be exported in package.json.exports', () => {
    const exportsMap = packageJson.exports ?? {};
    const wildcardEntry = exportsMap['./aiModels/*'];

    const hasWildcardExport =
      typeof wildcardEntry === 'object' &&
      wildcardEntry.import === './dist/aiModels/*.mjs' &&
      wildcardEntry.require === './dist/aiModels/*.cjs' &&
      wildcardEntry.types === './dist/aiModels/*.d.ts';

    if (hasWildcardExport) {
      expect(allModelFiles.length).toBeGreaterThan(0);
      return;
    }

    const missing = allModelFiles.filter((name) => {
      const key = `./${name}`;
      if (!(key in exportsMap)) {
        return true;
      }
      const entry = exportsMap[key];
      return !matchesLegacyEntry(entry, name) && !matchesDistEntry(entry, name);
    });

    if (missing.length > 0) {
      console.error('Missing exports for aiModels files:', missing);
    }

    expect(missing).toEqual([]);
  });
});
