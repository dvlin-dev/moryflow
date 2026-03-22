import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.resolve(
  process.cwd(),
  'prisma/vector/migrations/0003_knowledge_source_latest_revision_alignment/migration.sql',
);

describe('0003 knowledge source latest revision alignment migration', () => {
  it('maps legacy source statuses before casting into the new enum', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(
      /USING\s*\(\s*CASE\s+WHEN\s+"status"::text IN \('ACTIVE', 'DELETED'\)/s,
    );
    expect(sql).toMatch(/ELSE\s+'DELETED'::"KnowledgeSourceStatus_new"/s);
  });
});
