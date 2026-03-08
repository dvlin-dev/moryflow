import { describe, expect, test } from 'vitest';
import { getDownloadCtaDefaults, getFooterGroups } from '../../lib/marketing-copy';

describe('localized copy helpers', () => {
  test('returns localized footer labels for zh locale', () => {
    const groups = getFooterGroups('zh');

    const productGroup = groups.find((group) => group.titleKey === 'footer.product');
    const companyGroup = groups.find((group) => group.titleKey === 'footer.company');
    const resourcesGroup = groups.find((group) => group.titleKey === 'footer.resources');

    expect(productGroup?.links.map((link) => link.label)).toEqual([
      '功能',
      '使用场景',
      '下载',
      '定价',
    ]);
    expect(companyGroup?.links.map((link) => link.label)).toEqual(['关于', '隐私', '条款', '联系']);
    expect(resourcesGroup?.links.map((link) => link.label)).toContain('笔记发布网站');
    expect(resourcesGroup?.links.map((link) => link.label)).toContain('Telegram AI 智能体');
  });

  test('returns localized download CTA defaults for zh locale', () => {
    expect(getDownloadCtaDefaults('zh')).toEqual({
      buttonLabel: '下载 Moryflow',
      subtitle: 'Beta 期间免费 · macOS 和 Windows',
    });
  });
});
