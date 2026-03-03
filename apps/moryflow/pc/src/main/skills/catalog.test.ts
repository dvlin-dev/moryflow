import { CURATED_SKILLS } from './catalog';

describe('skills catalog', () => {
  it('contains 15 unique curated skills', () => {
    const names = CURATED_SKILLS.map((item) => item.name);
    expect(names).toHaveLength(15);
    expect(new Set(names).size).toBe(15);
  });

  it('preinstalls 13 skills and includes agent-browser', () => {
    const preinstall = CURATED_SKILLS.filter((item) => item.preinstall).map((item) => item.name);
    expect(preinstall).toHaveLength(13);
    expect(preinstall).toContain('agent-browser');
  });

  it('keeps remotion and baoyu as recommended non-preinstall skills', () => {
    const optional = CURATED_SKILLS.filter((item) => !item.preinstall)
      .map((item) => item.name)
      .sort();
    expect(optional).toEqual(['baoyu-article-illustrator', 'remotion']);
  });
});
