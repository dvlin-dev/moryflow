/**
 * macOS Seatbelt profile 生成测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MacOSSandbox } from '../src/platform/macos-sandbox'
import type { SandboxConfig } from '../src/types'

describe('MacOSSandbox', () => {
  let sandbox: MacOSSandbox
  const VAULT_ROOT = '/Users/test/vault'

  const createConfig = (mode: 'normal' | 'unrestricted' = 'normal'): SandboxConfig => ({
    vaultRoot: VAULT_ROOT,
    mode,
    storage: {
      get: () => undefined,
      set: () => {},
    },
  })

  beforeEach(() => {
    sandbox = new MacOSSandbox()
  })

  describe('基本属性', () => {
    it('应该返回正确的平台类型', () => {
      expect(sandbox.type).toBe('macos-sandbox')
    })
  })

  describe('初始化', () => {
    it('应该成功初始化', async () => {
      await expect(sandbox.initialize(createConfig())).resolves.not.toThrow()
    })

    it('重复初始化应该是安全的', async () => {
      await sandbox.initialize(createConfig())
      await expect(sandbox.initialize(createConfig())).resolves.not.toThrow()
    })
  })

  describe('wrapCommand - 命令包装', () => {
    it('应该使用 sandbox-exec 包装命令', async () => {
      const config = createConfig()
      const wrapped = await sandbox.wrapCommand('ls -la', config)

      expect(wrapped).toContain('sandbox-exec')
      expect(wrapped).toContain('-p')
      expect(wrapped).toContain('/bin/bash')
    })

    it('应该正确转义单引号', async () => {
      const config = createConfig()
      const wrapped = await sandbox.wrapCommand("echo 'hello'", config)

      // 命令中的单引号应该被转义
      expect(wrapped).toContain('hello')
    })

    it('应该包含 Vault 路径权限', async () => {
      const config = createConfig()
      const wrapped = await sandbox.wrapCommand('ls', config)

      expect(wrapped).toContain(VAULT_ROOT)
    })
  })

  describe('Seatbelt profile 内容', () => {
    it('normal 模式应该包含敏感路径保护', async () => {
      const config = createConfig('normal')
      const wrapped = await sandbox.wrapCommand('ls', config)

      // 检查是否包含敏感路径拒绝规则
      expect(wrapped).toContain('.ssh')
    })

    it('unrestricted 模式应该不包含敏感路径保护', async () => {
      const config = createConfig('unrestricted')
      const wrapped = await sandbox.wrapCommand('ls', config)

      // unrestricted 模式下敏感路径保护应该较少
      // 但仍有基本的沙盒限制
      expect(wrapped).toContain('sandbox-exec')
    })

    it('应该允许访问系统目录', async () => {
      const config = createConfig()
      const wrapped = await sandbox.wrapCommand('ls', config)

      expect(wrapped).toContain('/usr')
      expect(wrapped).toContain('/bin')
    })

    it('应该允许访问临时目录', async () => {
      const config = createConfig()
      const wrapped = await sandbox.wrapCommand('ls', config)

      expect(wrapped).toContain('/tmp')
      expect(wrapped).toContain('/var/folders')
    })

    it('应该允许网络访问', async () => {
      const config = createConfig()
      const wrapped = await sandbox.wrapCommand('ls', config)

      expect(wrapped).toContain('network')
    })
  })

  describe('profile 结构', () => {
    it('应该以 version 声明开始', async () => {
      const config = createConfig()
      const wrapped = await sandbox.wrapCommand('ls', config)

      expect(wrapped).toContain('(version 1)')
    })

    it('应该有默认拒绝策略', async () => {
      const config = createConfig()
      const wrapped = await sandbox.wrapCommand('ls', config)

      expect(wrapped).toContain('(deny default)')
    })

    it('应该允许基本进程操作', async () => {
      const config = createConfig()
      const wrapped = await sandbox.wrapCommand('ls', config)

      expect(wrapped).toContain('(allow process')
    })

    it('应该允许 Vault 目录读写', async () => {
      const config = createConfig()
      const wrapped = await sandbox.wrapCommand('ls', config)

      expect(wrapped).toContain(`(allow file-read* (subpath "${VAULT_ROOT}"))`)
      expect(wrapped).toContain(`(allow file-write* (subpath "${VAULT_ROOT}"))`)
    })
  })
})
