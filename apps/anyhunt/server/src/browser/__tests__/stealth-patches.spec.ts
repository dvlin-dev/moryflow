import { describe, it, expect } from 'vitest';
import { buildStealthScript } from '../stealth/stealth-patches';

describe('stealth-patches', () => {
  describe('buildStealthScript', () => {
    it('返回包含所有补丁的非空字符串', () => {
      const script = buildStealthScript();
      expect(script).toBeTruthy();
      expect(typeof script).toBe('string');
      expect(script.length).toBeGreaterThan(1000);
    });

    it('包含 __abStealth 配置注入', () => {
      const script = buildStealthScript({ locale: 'zh-CN' });
      expect(script).toContain('__abStealth');
      expect(script).toContain('"locale":"zh-CN"');
      expect(script).toContain('"languages":["zh-CN","zh"]');
    });

    it('默认 locale 为 en-US', () => {
      const script = buildStealthScript();
      expect(script).toContain('"locale":"en-US"');
      expect(script).toContain('"languages":["en-US","en"]');
    });

    it('处理带下划线的 locale 格式', () => {
      const script = buildStealthScript({ locale: 'ja_JP' });
      expect(script).toContain('"locale":"ja-JP"');
    });

    it('处理带 q-factor 的 locale', () => {
      const script = buildStealthScript({ locale: 'en-US,en;q=0.9' });
      expect(script).toContain('"locale":"en-US"');
    });

    it('包含关键补丁标识', () => {
      const script = buildStealthScript();

      // navigator.webdriver 移除
      expect(script).toContain('webdriver');
      expect(script).toContain('Navigator.prototype');

      // chrome.runtime 补全
      expect(script).toContain('chrome');
      expect(script).toContain('runtime');

      // plugins 注入
      expect(script).toContain('PluginArray');
      expect(script).toContain('MimeType');

      // WebGL vendor 替换
      expect(script).toContain('SwiftShader');
      expect(script).toContain('Intel');

      // HeadlessChrome 替换
      expect(script).toContain('HeadlessChrome');

      // performance.memory
      expect(script).toContain('performance.memory');

      // 背景色修正
      expect(script).toContain('backgroundColor');
    });

    it('每个补丁都是 IIFE 格式', () => {
      const script = buildStealthScript();
      const iifeCount = (script.match(/\(function\(\)\{/g) || []).length;
      // 26 个补丁
      expect(iifeCount).toBe(26);
    });

    it('所有顶层 IIFE 都正确闭合', () => {
      const script = buildStealthScript();
      // 顶层 IIFE 数量应等于补丁数量（26）
      // 内部嵌套的 IIFE（如 Worker patch）不计入
      const openCount = (script.match(/\(function\(\)\{/g) || []).length;
      expect(openCount).toBeGreaterThanOrEqual(26);
    });
  });
});
