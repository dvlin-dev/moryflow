/**
 * Digest Welcome Config Service Tests
 *
 * [PROVIDES]: DigestWelcomeConfigService 单元测试
 * [POS]: 测试默认配置创建与 action locale 解析
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DigestWelcomeConfigService } from '../../services/welcome-config.service';
import { createMockPrisma } from '../mocks';

describe('DigestWelcomeConfigService', () => {
  let service: DigestWelcomeConfigService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new DigestWelcomeConfigService(mockPrisma as any);
  });

  it('should create default config when missing', async () => {
    mockPrisma.digestWelcomeConfig.findUnique.mockResolvedValue(null);
    mockPrisma.digestWelcomeConfig.create.mockResolvedValue({
      id: 'welcome',
      enabled: true,
      defaultSlug: 'welcome',
      primaryAction: {
        labelByLocale: { en: 'Explore topics' },
        action: 'openExplore',
      },
      secondaryAction: null,
      updatedAt: new Date(),
    });

    const result = await service.getPublicConfig({ locale: 'en' });

    expect(mockPrisma.digestWelcomeConfig.create).toHaveBeenCalled();
    expect(result.defaultSlug).toBe('welcome');
    expect(result.primaryAction?.label).toBe('Explore topics');
  });

  it('should resolve locale with fallback (zh-CN -> zh)', async () => {
    mockPrisma.digestWelcomeConfig.findUnique.mockResolvedValue({
      id: 'welcome',
      enabled: true,
      defaultSlug: 'welcome',
      primaryAction: {
        labelByLocale: { en: 'Explore', zh: '浏览' },
        action: 'openExplore',
      },
      secondaryAction: null,
      updatedAt: new Date(),
    });

    const result = await service.getPublicConfig({ locale: 'zh-CN' });

    expect(result.primaryAction?.label).toBe('浏览');
  });
});
