/**
 * 路径工具测试
 */

import { describe, it, expect } from 'vitest';
import { isPathEqualOrWithin, normalizeAuthorizedPath } from '../src/path-utils';

describe('path-utils', () => {
  describe('normalizeAuthorizedPath', () => {
    it('应去除首尾空白并折叠相对段', () => {
      const normalized = normalizeAuthorizedPath('  /tmp/../tmp/docs/  ');
      expect(normalized).toBe('/tmp/docs');
    });

    it('应去掉非根路径尾部斜杠', () => {
      const normalized = normalizeAuthorizedPath('/tmp/docs/');
      expect(normalized).toBe('/tmp/docs');
    });

    it('根路径应保持为根', () => {
      const normalized = normalizeAuthorizedPath('/');
      expect(normalized).toBe('/');
    });
  });

  describe('isPathEqualOrWithin', () => {
    it('精确路径应返回 true', () => {
      expect(isPathEqualOrWithin('/tmp/docs', '/tmp/docs')).toBe(true);
    });

    it('子路径应返回 true', () => {
      expect(isPathEqualOrWithin('/tmp/docs/a.md', '/tmp/docs')).toBe(true);
    });

    it('前缀相似但非子路径应返回 false', () => {
      expect(isPathEqualOrWithin('/tmp/docs2/a.md', '/tmp/docs')).toBe(false);
    });
  });
});
