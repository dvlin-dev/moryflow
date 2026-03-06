import { describe, it, expect } from 'vitest';
import { RiskDetectionService } from '../runtime/risk-detection.service';

describe('RiskDetectionService', () => {
  const service = new RiskDetectionService();

  describe('detect', () => {
    it('检测 Cloudflare challenge URL', () => {
      const signals = service.detect(
        'https://example.com/cdn-cgi/challenge-platform/page',
        'Example',
      );
      expect(signals).toHaveLength(1);
      expect(signals[0].code).toBe('bot_challenge');
      expect(signals[0].source).toBe('url');
      expect(signals[0].confidence).toBeGreaterThan(0.9);
    });

    it('检测 "Just a moment" 标题', () => {
      const signals = service.detect('https://example.com', 'Just a moment...');
      expect(signals).toHaveLength(1);
      expect(signals[0].code).toBe('verification_interstitial');
      expect(signals[0].source).toBe('title');
    });

    it('检测 reCAPTCHA URL', () => {
      const signals = service.detect(
        'https://www.google.com/recaptcha/api2/anchor',
        'reCAPTCHA',
      );
      expect(signals.length).toBeGreaterThanOrEqual(1);
      expect(signals.some((s) => s.code === 'captcha_interstitial')).toBe(true);
    });

    it('检测中文验证页', () => {
      const signals = service.detect(
        'https://example.cn/verify',
        '人机验证 - 请完成验证',
      );
      expect(signals.some((s) => s.code === 'captcha_interstitial')).toBe(true);
    });

    it('正常页面返回空数组', () => {
      const signals = service.detect(
        'https://www.google.com/search?q=hello',
        'hello - Google Search',
      );
      expect(signals).toHaveLength(0);
    });

    it('URL 和 Title 同时匹配时去重', () => {
      const signals = service.detect(
        'https://example.com/captcha/verify',
        'Please verify you are not a robot',
      );
      // URL 匹配 captcha + Title 匹配 captcha，去重后每个 source 保留一个
      const captchaSignals = signals.filter(
        (s) => s.code === 'captcha_interstitial',
      );
      expect(captchaSignals.length).toBeLessThanOrEqual(2);
    });

    it('按置信度降序排列', () => {
      const signals = service.detect(
        'https://example.com/access-denied/captcha/',
        'Access Denied',
      );
      for (let i = 1; i < signals.length; i++) {
        expect(signals[i - 1].confidence).toBeGreaterThanOrEqual(
          signals[i].confidence,
        );
      }
    });

    it('空输入返回空数组', () => {
      expect(service.detect('', '')).toHaveLength(0);
    });
  });
});
