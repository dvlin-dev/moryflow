import { describe, it, expect } from 'vitest';
import {
  resolveSuccessUrl,
  resolveCheckoutProductType,
  resolvePostMessageOrigin,
  serializeQueryForScript,
} from './payment.utils';

describe('payment.utils', () => {
  describe('resolveSuccessUrl', () => {
    it('无 successUrl 时返回默认支付成功页', () => {
      const result = resolveSuccessUrl(
        undefined,
        'https://server.moryflow.com',
        ['https://server.moryflow.com'],
      );

      expect(result).toBe('https://server.moryflow.com/api/v1/payment/success');
    });

    it('允许同源相对路径', () => {
      const result = resolveSuccessUrl(
        '/api/v1/payment/success?from=checkout',
        'https://server.moryflow.com',
        ['https://server.moryflow.com'],
      );

      expect(result).toBe(
        'https://server.moryflow.com/api/v1/payment/success?from=checkout',
      );
    });

    it('允许白名单域名', () => {
      const result = resolveSuccessUrl(
        'https://server.moryflow.com/api/v1/payment/success',
        'https://server.moryflow.com',
        ['https://server.moryflow.com'],
      );

      expect(result).toBe('https://server.moryflow.com/api/v1/payment/success');
    });

    it('拒绝不受信域名', () => {
      expect(() =>
        resolveSuccessUrl(
          'https://evil.com/api/v1/payment/success',
          'https://server.moryflow.com',
          ['https://server.moryflow.com'],
        ),
      ).toThrow('Untrusted successUrl origin');
    });

    it('拒绝非 http/https 协议', () => {
      expect(() =>
        resolveSuccessUrl(
          'javascript:alert(1)',
          'https://server.moryflow.com',
          ['https://server.moryflow.com'],
        ),
      ).toThrow('Invalid successUrl protocol');
    });
  });

  describe('resolveCheckoutProductType', () => {
    it('匹配 credits 配置', () => {
      const result = resolveCheckoutProductType('credits_500', {
        credits_500: 500,
      });

      expect(result).toBe('credits');
    });

    it('缺失或未知产品应抛错', () => {
      expect(() =>
        resolveCheckoutProductType('', { credits_500: 500 }),
      ).toThrow('Missing productId');

      expect(() =>
        resolveCheckoutProductType('unknown', { credits_500: 500 }),
      ).toThrow('Unknown productId');
    });
  });

  describe('serializeQueryForScript', () => {
    it('转义脚本注入字符', () => {
      const result = serializeQueryForScript({
        status: 'ok',
        payload: '</script><img src=x onerror=alert(1)>',
      });

      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });
  });

  describe('resolvePostMessageOrigin', () => {
    it('使用可信 referrer origin', () => {
      const result = resolvePostMessageOrigin(
        ['https://server.moryflow.com'],
        'https://server.moryflow.com/path',
        'https://server.moryflow.com',
      );

      expect(result).toBe('https://server.moryflow.com');
    });

    it('不可信 referrer 回退到唯一允许域名', () => {
      const result = resolvePostMessageOrigin(
        ['https://server.moryflow.com'],
        'https://evil.com/path',
        'https://server.moryflow.com',
      );

      expect(result).toBe('https://server.moryflow.com');
    });

    it('无 referrer 时使用 fallback', () => {
      const result = resolvePostMessageOrigin(
        [],
        undefined,
        'https://server.moryflow.com',
      );

      expect(result).toBe('https://server.moryflow.com');
    });
  });
});
