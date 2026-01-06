/**
 * 授权流程测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PathAuthorization } from '../src/authorization/path-authorization'
import type { Storage } from '../src/types'

describe('PathAuthorization', () => {
  let storage: Storage
  let auth: PathAuthorization

  beforeEach(() => {
    // Mock storage
    const store = new Map<string, unknown>()
    storage = {
      get: vi.fn(<T>(key: string) => store.get(key) as T | undefined),
      set: vi.fn((key: string, value: unknown) => {
        store.set(key, value)
      }),
    }
    auth = new PathAuthorization(storage)
  })

  describe('isAuthorized - 授权检查', () => {
    it('未授权的路径应返回 false', () => {
      expect(auth.isAuthorized('/etc/passwd')).toBe(false)
    })

    it('永久授权后应返回 true', () => {
      auth.handleChoice('/etc/passwd', 'allow_always')
      expect(auth.isAuthorized('/etc/passwd')).toBe(true)
    })

    it('临时授权后应返回 true', () => {
      auth.handleChoice('/etc/passwd', 'allow_once')
      expect(auth.isAuthorized('/etc/passwd')).toBe(true)
    })

    it('父目录永久授权后，子目录应返回 true', () => {
      auth.handleChoice('/etc', 'allow_always')
      expect(auth.isAuthorized('/etc/passwd')).toBe(true)
      expect(auth.isAuthorized('/etc/hosts')).toBe(true)
      expect(auth.isAuthorized('/etc/ssh/config')).toBe(true)
    })

    it('子目录授权不应影响父目录', () => {
      auth.handleChoice('/etc/passwd', 'allow_always')
      expect(auth.isAuthorized('/etc')).toBe(false)
    })
  })

  describe('handleChoice - 授权选择处理', () => {
    it('deny 应返回 false', () => {
      const result = auth.handleChoice('/etc/passwd', 'deny')
      expect(result).toBe(false)
      expect(auth.isAuthorized('/etc/passwd')).toBe(false)
    })

    it('allow_once 应返回 true 并添加临时授权', () => {
      const result = auth.handleChoice('/etc/passwd', 'allow_once')
      expect(result).toBe(true)
      expect(auth.isAuthorized('/etc/passwd')).toBe(true)
    })

    it('allow_always 应返回 true 并添加永久授权', () => {
      const result = auth.handleChoice('/etc/passwd', 'allow_always')
      expect(result).toBe(true)
      expect(auth.isAuthorized('/etc/passwd')).toBe(true)
      // 验证已保存到存储
      expect(storage.set).toHaveBeenCalled()
    })
  })

  describe('clearTemp - 临时授权清除', () => {
    it('清除后临时授权应失效', () => {
      auth.handleChoice('/etc/passwd', 'allow_once')
      expect(auth.isAuthorized('/etc/passwd')).toBe(true)

      auth.clearTemp()
      expect(auth.isAuthorized('/etc/passwd')).toBe(false)
    })

    it('清除临时授权不应影响永久授权', () => {
      auth.handleChoice('/etc/passwd', 'allow_always')
      auth.handleChoice('/etc/hosts', 'allow_once')

      auth.clearTemp()

      expect(auth.isAuthorized('/etc/passwd')).toBe(true)
      expect(auth.isAuthorized('/etc/hosts')).toBe(false)
    })
  })

  describe('永久授权管理', () => {
    it('getPersistentPaths 应返回所有永久授权路径', () => {
      auth.handleChoice('/etc/passwd', 'allow_always')
      auth.handleChoice('/var/log', 'allow_always')
      auth.handleChoice('/tmp/test', 'allow_once') // 临时授权

      const paths = auth.getPersistentPaths()
      expect(paths).toContain('/etc/passwd')
      expect(paths).toContain('/var/log')
      expect(paths).not.toContain('/tmp/test')
    })

    it('removePersistent 应移除指定路径的永久授权', () => {
      auth.handleChoice('/etc/passwd', 'allow_always')
      auth.handleChoice('/var/log', 'allow_always')

      auth.removePersistent('/etc/passwd')

      expect(auth.isAuthorized('/etc/passwd')).toBe(false)
      expect(auth.isAuthorized('/var/log')).toBe(true)
    })

    it('clearAllPersistent 应清除所有永久授权', () => {
      auth.handleChoice('/etc/passwd', 'allow_always')
      auth.handleChoice('/var/log', 'allow_always')

      auth.clearAllPersistent()

      expect(auth.isAuthorized('/etc/passwd')).toBe(false)
      expect(auth.isAuthorized('/var/log')).toBe(false)
      expect(auth.getPersistentPaths()).toHaveLength(0)
    })
  })

  describe('持久化存储', () => {
    it('永久授权应保存到存储', () => {
      auth.handleChoice('/etc/passwd', 'allow_always')

      expect(storage.set).toHaveBeenCalledWith(
        'sandbox:authorizedPaths',
        expect.arrayContaining(['/etc/passwd'])
      )
    })

    it('移除授权应更新存储', () => {
      auth.handleChoice('/etc/passwd', 'allow_always')
      auth.removePersistent('/etc/passwd')

      // 最后一次调用应该是空数组
      const calls = (storage.set as ReturnType<typeof vi.fn>).mock.calls
      const lastCall = calls[calls.length - 1]
      expect(lastCall[0]).toBe('sandbox:authorizedPaths')
      expect(lastCall[1]).toEqual([])
    })

    it('初始化时应从存储加载已授权路径', () => {
      // 预设存储数据
      const presetStore = new Map<string, unknown>([
        ['sandbox:authorizedPaths', ['/etc/passwd', '/var/log']],
      ])
      const presetStorage: Storage = {
        get: <T>(key: string) => presetStore.get(key) as T | undefined,
        set: vi.fn(),
      }

      const newAuth = new PathAuthorization(presetStorage)

      expect(newAuth.isAuthorized('/etc/passwd')).toBe(true)
      expect(newAuth.isAuthorized('/var/log')).toBe(true)
    })
  })
})
