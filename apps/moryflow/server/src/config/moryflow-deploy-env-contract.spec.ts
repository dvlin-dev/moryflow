import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(process.cwd(), '../../..');

const readRepoFile = (relativePath: string): string =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

const parseEnvKeys = (content: string): Set<string> =>
  new Set(
    content
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => line.split('=')[0]?.trim())
      .filter((key): key is string => Boolean(key)),
  );

describe('Moryflow deploy env contract', () => {
  it('wires SYNC_ACTION_SECRET into moryflow-server runtime env', () => {
    const composeContent = readRepoFile('deploy/moryflow/docker-compose.yml');

    expect(composeContent).toMatch(
      /SYNC_ACTION_SECRET:\s*\$\{SYNC_ACTION_SECRET(?:[:?][^}]*)?\}/u,
    );
  });

  it('declares SYNC_ACTION_SECRET in Moryflow env examples', () => {
    const envExamplePaths = [
      'deploy/moryflow/.env.example',
      'apps/moryflow/server/.env.example',
    ];

    for (const envExamplePath of envExamplePaths) {
      const envKeys = parseEnvKeys(readRepoFile(envExamplePath));
      expect(envKeys.has('SYNC_ACTION_SECRET')).toBe(true);
    }
  });
});
