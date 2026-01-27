import { describe, expect, it } from 'vitest';
import { buildRecentFilesList } from '../workspace-settings.utils';

describe('buildRecentFilesList', () => {
  it('keeps most recent file at the front and removes duplicates', () => {
    const next = buildRecentFilesList(['/a.md', '/b.md', '/c.md'], '/b.md');
    expect(next).toEqual(['/b.md', '/a.md', '/c.md']);
  });

  it('caps the list to three items', () => {
    const next = buildRecentFilesList(['/a.md', '/b.md', '/c.md'], '/d.md');
    expect(next).toEqual(['/d.md', '/a.md', '/b.md']);
  });
});
