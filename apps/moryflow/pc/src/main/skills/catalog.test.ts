import { CURATED_SKILLS } from './catalog';

describe('skills catalog', () => {
  it('contains 16 unique curated skills', () => {
    const names = CURATED_SKILLS.map((item) => item.name);
    expect(names).toHaveLength(16);
    expect(new Set(names).size).toBe(16);
  });

  it('preinstalls 14 skills and includes agent-browser + macos-automation', () => {
    const preinstall = CURATED_SKILLS.filter((item) => item.preinstall).map((item) => item.name);
    expect(preinstall).toHaveLength(14);
    expect(preinstall).toContain('agent-browser');
    expect(preinstall).toContain('macos-automation');
  });

  it('keeps remotion and baoyu as recommended non-preinstall skills', () => {
    const optional = CURATED_SKILLS.filter((item) => !item.preinstall)
      .map((item) => item.name)
      .sort();
    expect(optional).toEqual(['baoyu-article-illustrator', 'remotion']);
  });
});
