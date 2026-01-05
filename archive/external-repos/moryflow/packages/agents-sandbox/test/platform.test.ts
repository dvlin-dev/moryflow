/**
 * 跨平台兼容性测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { detectPlatform, getPlatformName } from '../src/platform'

describe('Platform Detection', () => {
  const originalPlatform = process.platform

  afterEach(() => {
    // 恢复原始平台
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    })
  })

  describe('detectPlatform', () => {
    it('当前平台应该返回有效的适配器', () => {
      const adapter = detectPlatform()
      expect(adapter).toBeDefined()
      expect(adapter.type).toBeDefined()
      expect(typeof adapter.wrapCommand).toBe('function')
    })

    it('适配器应该有正确的接口', () => {
      const adapter = detectPlatform()

      // 必须有 type 属性
      expect(adapter.type).toBeDefined()

      // 必须有 wrapCommand 方法
      expect(typeof adapter.wrapCommand).toBe('function')

      // initialize 是可选的
      if (adapter.initialize) {
        expect(typeof adapter.initialize).toBe('function')
      }
    })
  })

  describe('getPlatformName', () => {
    it('应该返回可读的平台名称', () => {
      const name = getPlatformName()
      expect(typeof name).toBe('string')
      expect(name.length).toBeGreaterThan(0)
    })

    it('macOS 应该返回 "macOS"', () => {
      if (process.platform === 'darwin') {
        expect(getPlatformName()).toBe('macOS')
      }
    })

    it('Windows 应该返回 "Windows"', () => {
      if (process.platform === 'win32') {
        expect(getPlatformName()).toBe('Windows')
      }
    })

    it('Linux 应该返回 "Linux"', () => {
      if (process.platform === 'linux') {
        expect(getPlatformName()).toBe('Linux')
      }
    })
  })

  describe('平台适配器行为', () => {
    it('wrapCommand 应该返回可执行的命令字符串', async () => {
      const adapter = detectPlatform()
      const config = {
        vaultRoot: '/test/vault',
        mode: 'normal' as const,
        storage: {
          get: () => undefined,
          set: () => {},
        },
      }

      const wrapped = await adapter.wrapCommand('echo hello', config)

      expect(typeof wrapped).toBe('string')
      expect(wrapped.length).toBeGreaterThan(0)
    })

    it('macOS 上应该使用 sandbox-exec', async () => {
      if (process.platform !== 'darwin') {
        return // 跳过非 macOS
      }

      const adapter = detectPlatform()
      const config = {
        vaultRoot: '/test/vault',
        mode: 'normal' as const,
        storage: {
          get: () => undefined,
          set: () => {},
        },
      }

      const wrapped = await adapter.wrapCommand('ls', config)

      // macOS 应该使用 sandbox-exec
      expect(wrapped).toContain('sandbox-exec')
    })

    it('非 macOS 应该使用 soft isolation', async () => {
      if (process.platform === 'darwin') {
        return // 跳过 macOS
      }

      const adapter = detectPlatform()
      expect(adapter.type).toBe('soft-isolation')
    })
  })
})

describe('SoftIsolation', () => {
  // 导入 SoftIsolation 进行直接测试
  it('应该返回原始命令（软隔离）', async () => {
    const { SoftIsolation } = await import('../src/platform/soft-isolation')
    const isolation = new SoftIsolation()

    const config = {
      vaultRoot: '/test/vault',
      mode: 'normal' as const,
      storage: {
        get: () => undefined,
        set: () => {},
      },
    }

    const wrapped = await isolation.wrapCommand('echo hello', config)

    // 软隔离不包装命令
    expect(wrapped).toBe('echo hello')
  })

  it('type 应该是 soft-isolation', async () => {
    const { SoftIsolation } = await import('../src/platform/soft-isolation')
    const isolation = new SoftIsolation()

    expect(isolation.type).toBe('soft-isolation')
  })
})
