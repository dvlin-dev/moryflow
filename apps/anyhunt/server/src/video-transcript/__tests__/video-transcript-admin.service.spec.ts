/**
 * [INPUT]: Admin runtime toggle 更新请求与依赖 mock
 * [OUTPUT]: 运行时开关更新/审计回滚行为断言
 * [POS]: Video Transcript Admin Service 回归测试
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoTranscriptAdminService } from '../video-transcript-admin.service';

describe('VideoTranscriptAdminService', () => {
  let service: VideoTranscriptAdminService;

  let mockPrisma: any;
  let mockBudgetService: any;
  let mockHeartbeatService: any;
  let mockRuntimeConfigService: any;
  let mockTranscriptService: any;
  let mockLocalQueue: any;
  let mockCloudQueue: any;

  beforeEach(() => {
    mockPrisma = {
      adminAuditLog: {
        create: vi.fn().mockResolvedValue({
          id: 'audit_1',
          createdAt: new Date('2026-03-06T08:00:00.000Z'),
        }),
      },
    };

    mockBudgetService = {};
    mockHeartbeatService = {};
    mockRuntimeConfigService = {
      getSnapshot: vi.fn().mockResolvedValue({
        localEnabled: true,
        source: 'env',
        overrideRaw: null,
      }),
      setLocalEnabledOverride: vi.fn().mockResolvedValue(undefined),
      restoreSnapshot: vi.fn().mockResolvedValue(undefined),
    };
    mockTranscriptService = {
      toPrismaJson: vi.fn((value: unknown) => value),
    };
    mockLocalQueue = {};
    mockCloudQueue = {};

    service = new VideoTranscriptAdminService(
      mockPrisma,
      mockBudgetService,
      mockHeartbeatService,
      mockRuntimeConfigService,
      mockTranscriptService,
      mockLocalQueue,
      mockCloudQueue,
    );
  });

  it('should write audit after updating localEnabled override', async () => {
    const result = await service.updateLocalEnabled({
      actorUserId: 'admin_1',
      enabled: false,
      reason: 'maintenance window',
    });

    expect(
      mockRuntimeConfigService.setLocalEnabledOverride,
    ).toHaveBeenCalledWith(false);
    expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'admin_1',
        targetUserId: null,
        action: 'VIDEO_TRANSCRIPT_LOCAL_ENABLED_UPDATED',
        reason: 'maintenance window',
        metadata: {
          previous: {
            localEnabled: true,
            source: 'env',
            overrideRaw: null,
          },
          current: {
            localEnabled: false,
            source: 'override',
            overrideRaw: 'false',
          },
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    });
    expect(mockRuntimeConfigService.restoreSnapshot).not.toHaveBeenCalled();
    expect(result).toEqual({
      localEnabled: false,
      source: 'override',
      overrideRaw: 'false',
      auditLogId: 'audit_1',
      updatedAt: new Date('2026-03-06T08:00:00.000Z'),
    });
  });

  it('should restore previous runtime snapshot when audit write fails', async () => {
    const previous = {
      localEnabled: true,
      source: 'env' as const,
      overrideRaw: null,
    };
    mockRuntimeConfigService.getSnapshot.mockResolvedValue(previous);
    mockPrisma.adminAuditLog.create.mockRejectedValue(
      new Error('db unavailable'),
    );

    await expect(
      service.updateLocalEnabled({
        actorUserId: 'admin_1',
        enabled: false,
      }),
    ).rejects.toThrow('db unavailable');

    expect(
      mockRuntimeConfigService.setLocalEnabledOverride,
    ).toHaveBeenCalledWith(false);
    expect(mockRuntimeConfigService.restoreSnapshot).toHaveBeenCalledWith(
      previous,
    );
  });
});
