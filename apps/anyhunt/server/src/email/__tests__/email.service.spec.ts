/**
 * EmailService 单元测试
 *
 * 测试邮件服务的核心功能：
 * - 配置检查
 * - 发送邮件（通过 mock 验证）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';

// Mock Resend - 使用 hoisted mock，确保在 ESM/transform 环境中稳定生效
const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));
vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = {
      send: mockSend,
    };
  },
}));

describe('EmailService', () => {
  let EmailServiceCtor: typeof import('../email.service').EmailService;
  let mockConfig: Record<string, string>;

  beforeEach(async () => {
    mockSend.mockReset();
    vi.resetModules();
    ({ EmailService: EmailServiceCtor } = await import('../email.service'));

    mockConfig = {
      RESEND_API_KEY: 'test-api-key',
      EMAIL_FROM: 'Test <test@example.com>',
    };
  });

  function createService(
    configOverrides: Record<string, string | undefined> = {},
  ) {
    const config = { ...mockConfig, ...configOverrides };
    const mockConfigService = {
      get: vi.fn((key: string) => config[key]),
    };
    return new EmailServiceCtor(mockConfigService as unknown as ConfigService);
  }

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const service = createService();
      mockSend.mockResolvedValue({ id: 'email-1' });

      await service.sendEmail(
        'recipient@example.com',
        'Test Subject',
        '<p>Test Body</p>',
      );

      expect(mockSend).toHaveBeenCalledWith({
        from: 'Test <test@example.com>',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test Body</p>',
      });
    });

    it('should throw error when send fails', async () => {
      const service = createService();
      mockSend.mockRejectedValue(new Error('Send failed'));

      await expect(
        service.sendEmail('recipient@example.com', 'Subject', 'Body'),
      ).rejects.toThrow('Send failed');
    });

    it('should skip sending when not configured', async () => {
      const service = createService({ RESEND_API_KEY: undefined });

      // 不应该抛出错误，静默跳过
      await service.sendEmail('recipient@example.com', 'Subject', 'Body');

      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('sendOTP', () => {
    it('should send OTP email with correct format', async () => {
      const service = createService();
      mockSend.mockResolvedValue({ id: 'email-1' });

      await service.sendOTP('user@example.com', '123456');

      expect(mockSend).toHaveBeenCalledWith({
        from: 'Test <test@example.com>',
        to: 'user@example.com',
        subject: 'Your Verification Code',
        html: expect.stringContaining('123456'),
      });
    });

    it('should include OTP in email body', async () => {
      const service = createService();
      mockSend.mockResolvedValue({ id: 'email-1' });

      await service.sendOTP('user@example.com', '654321');

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('654321');
      expect(call.html).toContain('Verification Code');
    });

    it('should throw error when OTP send fails', async () => {
      const service = createService();
      mockSend.mockRejectedValue(new Error('OTP send failed'));

      await expect(
        service.sendOTP('user@example.com', '123456'),
      ).rejects.toThrow('OTP send failed');
    });

    it('should skip OTP when not configured', async () => {
      const service = createService({ RESEND_API_KEY: undefined });

      await service.sendOTP('user@example.com', '123456');

      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should use default from address when not configured', async () => {
      const service = createService({ EMAIL_FROM: undefined });
      mockSend.mockResolvedValue({ id: 'email-1' });

      await service.sendEmail('recipient@example.com', 'Subject', 'Body');

      // 通过行为验证：检查发送时使用的 from 地址
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Anyhunt <noreply@anyhunt.app>',
        }),
      );
    });

    it('should use configured from address', async () => {
      const service = createService();
      mockSend.mockResolvedValue({ id: 'email-1' });

      await service.sendEmail('recipient@example.com', 'Subject', 'Body');

      // 通过行为验证：检查发送时使用的 from 地址
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Test <test@example.com>',
        }),
      );
    });
  });
});
