import { describe, expect, test } from 'vitest';
import { getDownloadCtaDefaults, getFooterGroups } from '../../lib/marketing-copy';

describe('localized copy helpers', () => {
  test('returns localized footer labels for zh locale', () => {
    const groups = getFooterGroups('zh');

    const productGroup = groups.find((group) => group.titleKey === 'footer.product');
    const legalGroup = groups.find((group) => group.titleKey === 'footer.legal');
    const resourcesGroup = groups.find((group) => group.titleKey === 'footer.resources');

    expect(productGroup?.links.map((link) => link.label)).toEqual(['下载', '定价']);
    expect(legalGroup?.links.map((link) => link.label)).toEqual(['隐私', '条款']);
    expect(resourcesGroup?.links.map((link) => link.label)).toContain('文档');
    expect(resourcesGroup?.links.map((link) => link.label)).toContain('GitHub');
  });

  test('returns compare links ordered by traffic priority', () => {
    const groups = getFooterGroups('en');
    const compareGroup = groups.find((group) => group.titleKey === 'footer.compare');

    expect(compareGroup?.links.map((link) => link.label)).toEqual([
      'vs OpenClaw',
      'vs Manus',
      'vs Cowork',
      'vs Obsidian',
      'vs Notion',
    ]);
  });

  test('returns localized download CTA defaults for zh locale', () => {
    expect(getDownloadCtaDefaults('zh')).toEqual({
      buttonLabel: '下载 Moryflow',
      subtitle: '免费开始 · 开源项目',
    });
  });
});
