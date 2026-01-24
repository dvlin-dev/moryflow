/**
 * 路径检测准确性测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PathDetector } from '../src/command/path-detector';

describe('PathDetector', () => {
  const VAULT_ROOT = '/Users/test/vault';
  let detector: PathDetector;

  beforeEach(() => {
    detector = new PathDetector(VAULT_ROOT);
  });

  describe('detect - 外部路径检测', () => {
    it('应该检测到绝对外部路径', () => {
      const paths = detector.detect('cat /etc/passwd');
      expect(paths).toContain('/etc/passwd');
    });

    it('应该检测到 ~ 开头的外部路径', () => {
      const paths = detector.detect('cat ~/.ssh/id_rsa');
      expect(paths.some((p) => p.endsWith('/.ssh/id_rsa'))).toBe(true);
    });

    it('应该检测到多个外部路径', () => {
      const paths = detector.detect('cp /etc/hosts /tmp/hosts');
      expect(paths).toContain('/etc/hosts');
      expect(paths).toContain('/tmp/hosts');
    });

    it('应该忽略 Vault 内的路径', () => {
      const paths = detector.detect(`cat ${VAULT_ROOT}/notes/test.md`);
      expect(paths).toHaveLength(0);
    });

    it('应该识别 Vault 前缀但不在 Vault 内的路径', () => {
      const paths = detector.detect(`cat ${VAULT_ROOT}2/notes/test.md`);
      expect(paths.length).toBeGreaterThan(0);
    });

    it('应该忽略 Vault 内的相对路径', () => {
      const paths = detector.detect('cat ./notes/test.md', VAULT_ROOT);
      expect(paths).toHaveLength(0);
    });

    it('应该检测到 ../ 越界路径', () => {
      const paths = detector.detect('cat ../../etc/passwd', VAULT_ROOT);
      expect(paths.length).toBeGreaterThan(0);
    });

    it('应该检测到引号内的外部路径', () => {
      const paths = detector.detect('cat "/etc/passwd"');
      expect(paths).toContain('/etc/passwd');
    });

    it('应该检测到单引号内的外部路径', () => {
      const paths = detector.detect("cat '/etc/passwd'");
      expect(paths).toContain('/etc/passwd');
    });

    it('应该忽略 URL 中的路径', () => {
      const paths = detector.detect('curl https://example.com/api/data');
      expect(paths).not.toContain('/api/data');
    });

    it('应该处理复杂命令中的多个路径', () => {
      const paths = detector.detect(`grep "error" /var/log/syslog | tee ${VAULT_ROOT}/output.txt`);
      expect(paths).toContain('/var/log/syslog');
      // Vault 内的路径应该被忽略
      expect(paths).not.toContain(`${VAULT_ROOT}/output.txt`);
    });
  });

  describe('边界情况', () => {
    it('应该处理空命令', () => {
      const paths = detector.detect('');
      expect(paths).toHaveLength(0);
    });

    it('应该处理无路径的命令', () => {
      const paths = detector.detect('echo hello');
      expect(paths).toHaveLength(0);
    });

    it('应该处理仅 Vault 路径的命令', () => {
      const paths = detector.detect(`ls ${VAULT_ROOT} && cat ${VAULT_ROOT}/file.txt`);
      expect(paths).toHaveLength(0);
    });

    it('应该正确处理 Vault 根目录本身', () => {
      const paths = detector.detect(`ls ${VAULT_ROOT}`);
      expect(paths).toHaveLength(0);
    });

    it('应该处理带有特殊字符的路径', () => {
      const paths = detector.detect('cat "/path/with spaces/file.txt"');
      expect(paths).toContain('/path/with spaces/file.txt');
    });

    it('应该去重重复的路径', () => {
      const paths = detector.detect('cat /etc/passwd /etc/passwd');
      const etcPasswdCount = paths.filter((p) => p === '/etc/passwd').length;
      expect(etcPasswdCount).toBe(1);
    });
  });

  describe('相对路径解析', () => {
    it('应该正确解析 ./path', () => {
      const paths = detector.detect('./external/../../../etc/passwd', VAULT_ROOT);
      expect(paths.length).toBeGreaterThan(0);
    });

    it('应该基于 cwd 解析相对路径', () => {
      const cwd = `${VAULT_ROOT}/subdir`;
      const paths = detector.detect('../file.txt', cwd);
      // ../file.txt from /Users/test/vault/subdir = /Users/test/vault/file.txt
      // 这仍在 vault 内，应该为空
      expect(paths).toHaveLength(0);
    });

    it('应该检测到越界的相对路径', () => {
      const cwd = VAULT_ROOT;
      // 从 vault 根目录往上跳两级
      const paths = detector.detect('cat ../../etc/passwd', cwd);
      expect(paths.length).toBeGreaterThan(0);
    });
  });
});
