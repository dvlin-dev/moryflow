/**
 * Digest Welcome Service Tests
 *
 * [PROVIDES]: DigestWelcomeService 单元测试
 * [POS]: 测试 locale fallback 与默认配置创建逻辑
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DigestWelcomeService } from '../../services/welcome.service';
import { createMockPrisma } from '../mocks';

describe('DigestWelcomeService', () => {
  let service: DigestWelcomeService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new DigestWelcomeService(mockPrisma as any);
  });

  it('should create default config when missing', async () => {
    mockPrisma.digestWelcomeConfig.findUnique.mockResolvedValue(null);
    mockPrisma.digestWelcomeConfig.create.mockResolvedValue({
      id: 'welcome',
      enabled: true,
      titleByLocale: { en: 'Welcome to Anyhunt' },
      contentMarkdownByLocale: { en: '# Welcome to Anyhunt' },
      primaryAction: {
        labelByLocale: { en: 'Explore topics' },
        action: 'openExplore',
      },
      secondaryAction: null,
      updatedAt: new Date(),
    });

    const result = await service.getPublicWelcome({ locale: 'en' });

    expect(mockPrisma.digestWelcomeConfig.create).toHaveBeenCalled();
    expect(result.title).toBe('Welcome to Anyhunt');
  });

  it('should resolve locale with fallback (zh-CN -> zh)', async () => {
    mockPrisma.digestWelcomeConfig.findUnique.mockResolvedValue({
      id: 'welcome',
      enabled: true,
      titleByLocale: { en: 'Hello', zh: '你好' },
      contentMarkdownByLocale: { en: 'EN', zh: 'ZH' },
      primaryAction: {
        labelByLocale: { en: 'Explore', zh: '浏览' },
        action: 'openExplore',
      },
      secondaryAction: null,
      updatedAt: new Date(),
    });

    const result = await service.getPublicWelcome({ locale: 'zh-CN' });

    expect(result.title).toBe('你好');
    expect(result.contentMarkdown).toBe('ZH');
    expect(result.primaryAction?.label).toBe('浏览');
  });

  it('should use Accept-Language when locale query is missing', async () => {
    mockPrisma.digestWelcomeConfig.findUnique.mockResolvedValue({
      id: 'welcome',
      enabled: true,
      titleByLocale: { en: 'Hello', zh: '你好' },
      contentMarkdownByLocale: { en: 'EN', zh: 'ZH' },
      primaryAction: null,
      secondaryAction: null,
      updatedAt: new Date(),
    });

    const result = await service.getPublicWelcome({
      acceptLanguage: 'zh-CN,zh;q=0.9,en;q=0.8',
    });
    expect(result.title).toBe('你好');
  });
});
