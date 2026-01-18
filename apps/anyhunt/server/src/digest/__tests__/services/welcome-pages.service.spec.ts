/**
 * Digest Welcome Pages Service Tests
 *
 * [PROVIDES]: DigestWelcomePagesService 单元测试
 * [POS]: 测试默认页创建与 locale fallback
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DigestWelcomePagesService } from '../../services/welcome-pages.service';
import { createMockPrisma } from '../mocks';

describe('DigestWelcomePagesService', () => {
  let service: DigestWelcomePagesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new DigestWelcomePagesService(mockPrisma as any);
  });

  it('should create default page when missing', async () => {
    mockPrisma.digestWelcomePage.count.mockResolvedValue(0);
    mockPrisma.digestWelcomePage.create.mockResolvedValue({
      id: '1',
      slug: 'welcome',
      enabled: true,
      sortOrder: 0,
      titleByLocale: { en: 'Welcome to Anyhunt' },
      contentMarkdownByLocale: { en: '# Welcome to Anyhunt' },
      updatedAt: new Date(),
    });
    mockPrisma.digestWelcomePage.findMany.mockResolvedValue([
      {
        id: '1',
        slug: 'welcome',
        enabled: true,
        sortOrder: 0,
        titleByLocale: { en: 'Welcome to Anyhunt' },
        contentMarkdownByLocale: { en: '# Welcome to Anyhunt' },
        updatedAt: new Date(),
      },
    ]);

    const pages = await service.listPublicPages({ locale: 'en' });

    expect(mockPrisma.digestWelcomePage.create).toHaveBeenCalled();
    expect(pages[0]?.slug).toBe('welcome');
  });

  it('should resolve locale with fallback (zh-CN -> zh)', async () => {
    mockPrisma.digestWelcomePage.count.mockResolvedValue(1);
    mockPrisma.digestWelcomePage.findUnique.mockResolvedValue({
      id: '1',
      slug: 'welcome',
      enabled: true,
      sortOrder: 0,
      titleByLocale: { en: 'Hello', zh: '你好' },
      contentMarkdownByLocale: { en: 'EN', zh: 'ZH' },
      updatedAt: new Date(),
    });

    const page = await service.getPublicPage({
      slug: 'welcome',
      locale: 'zh-CN',
    });

    expect(page.title).toBe('你好');
    expect(page.contentMarkdown).toBe('ZH');
  });
});
