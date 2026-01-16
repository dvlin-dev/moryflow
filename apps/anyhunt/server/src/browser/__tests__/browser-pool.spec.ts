/**
 * BrowserPool 单元测试
 *
 * 测试浏览器池的核心功能：
 * - BrowserUnavailableError 错误类型
 *
 * 注意：BrowserPool 类依赖 Playwright，完整测试需要在 e2e 环境中进行
 */

import { describe, it, expect } from 'vitest';
import { BrowserUnavailableError } from '../browser-pool';

describe('BrowserUnavailableError', () => {
  it('should create error with correct message format', () => {
    const error = new BrowserUnavailableError('test reason');

    expect(error.message).toBe('Browser unavailable: test reason');
    expect(error.name).toBe('BrowserUnavailableError');
  });

  it('should extend Error', () => {
    const error = new BrowserUnavailableError('test');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(BrowserUnavailableError);
  });

  it('should include reason in message', () => {
    const error = new BrowserUnavailableError('pool is shutting down');

    expect(error.message).toContain('pool is shutting down');
  });

  it('should have stack trace', () => {
    const error = new BrowserUnavailableError('test');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('BrowserUnavailableError');
  });
});

describe('BrowserPool exports', () => {
  it('should export BrowserPool class', async () => {
    const { BrowserPool } = await import('../browser-pool');
    expect(BrowserPool).toBeDefined();
  });
});
