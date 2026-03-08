import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const packageRoot = process.cwd();

const readPackageFile = (relativePath: string): string =>
  readFileSync(resolve(packageRoot, relativePath), 'utf8');

describe('Better Auth Prisma compatibility', () => {
  it('keeps Account.idToken in prisma schema for oauth providers', () => {
    const schema = readPackageFile('prisma/schema.prisma');

    expect(schema).toMatch(/model Account\s*\{[\s\S]*\bidToken\s+String\?/u);
  });
});
