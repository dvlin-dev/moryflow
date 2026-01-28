/**
 * DigestPublicTopicController 单元测试
 *
 * 覆盖举报话题时的用户与 IP 记录逻辑
 */

import { describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { DigestPublicTopicController } from '../../controllers/digest-public-topic.controller';
import type { DigestTopicService } from '../../services/topic.service';
import type { DigestReportService } from '../../services/report.service';
import type { CurrentUserDto } from '../../../types';

type RequestOverrides = Partial<Request> & {
  user?: CurrentUserDto;
};

const createController = (overrides?: {
  topicService?: Partial<DigestTopicService>;
  reportService?: Partial<DigestReportService>;
}) => {
  const topicService = {
    findBySlug: vi.fn(),
    ...(overrides?.topicService ?? {}),
  } as unknown as DigestTopicService;

  const reportService = {
    create: vi.fn(),
    ...(overrides?.reportService ?? {}),
  } as unknown as DigestReportService;

  return new DigestPublicTopicController(topicService, reportService);
};

const createReq = (overrides?: RequestOverrides): Request =>
  ({
    headers: {},
    ip: '127.0.0.1',
    ...overrides,
  }) as Request;

describe('DigestPublicTopicController', () => {
  it('should pass reporter user id when session exists', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'report-1' });
    const controller = createController({
      topicService: {
        findBySlug: vi.fn().mockResolvedValue({ id: 'topic-1' }),
      },
      reportService: { create },
    });

    const mockUser: CurrentUserDto = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Reporter',
      subscriptionTier: 'FREE',
      isAdmin: false,
    };

    const req = createReq({
      headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
      user: mockUser,
    });

    const result = await controller.reportTopic(
      'topic-slug',
      { topicId: 'ignored', reason: 'SPAM', description: 'bad content' },
      req,
    );

    expect(create).toHaveBeenCalledWith(
      { topicId: 'topic-1', reason: 'SPAM', description: 'bad content' },
      'user-1',
      '203.0.113.1',
    );
    expect(result.reportId).toBe('report-1');
  });

  it('should allow anonymous report without session', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'report-2' });
    const controller = createController({
      topicService: {
        findBySlug: vi.fn().mockResolvedValue({ id: 'topic-2' }),
      },
      reportService: { create },
    });

    const req = createReq({ ip: '198.51.100.5' });

    await controller.reportTopic(
      'topic-slug',
      { topicId: 'ignored', reason: 'COPYRIGHT' },
      req,
    );

    expect(create).toHaveBeenCalledWith(
      { topicId: 'topic-2', reason: 'COPYRIGHT' },
      undefined,
      '198.51.100.5',
    );
  });
});
