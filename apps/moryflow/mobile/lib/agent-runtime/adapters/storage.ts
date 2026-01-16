/**
 * 存储适配器
 * 提供通用存储和安全存储的实现
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import type { Storage, SecureStorage } from '@anyhunt/agents-adapter'

const STORAGE_PREFIX = 'agent-runtime:'
const SECURE_STORAGE_PREFIX = 'agent-secure:'

/**
 * 基于 AsyncStorage 的通用存储实现
 */
export class MobileStorage implements Storage {
  private readonly prefix: string

  constructor(prefix: string = STORAGE_PREFIX) {
    this.prefix = prefix
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await AsyncStorage.getItem(this.prefix + key)
    if (value === null) return null

    try {
      return JSON.parse(value) as T
    } catch (error) {
      console.warn('[MobileStorage] JSON parse failed for key:', key, error)
      return null
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(this.prefix + key, JSON.stringify(value))
  }

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(this.prefix + key)
  }
}

/**
 * 基于 expo-secure-store 的安全存储实现
 */
export class MobileSecureStorage implements SecureStorage {
  private readonly prefix: string

  constructor(prefix: string = SECURE_STORAGE_PREFIX) {
    this.prefix = prefix
  }

  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(this.prefix + key)
    } catch (error) {
      console.error('[MobileSecureStorage] get failed:', key, error)
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.prefix + key, value)
    } catch (error) {
      console.error('[MobileSecureStorage] set failed:', key, error)
      throw error
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.prefix + key)
    } catch (error) {
      console.error('[MobileSecureStorage] remove failed:', key, error)
      // 删除失败不抛出错误，保持幂等性
    }
  }
}

/**
 * 创建通用存储实例
 */
export function createStorage(prefix?: string): Storage {
  return new MobileStorage(prefix)
}

/**
 * 创建安全存储实例
 */
export function createSecureStorage(prefix?: string): SecureStorage {
  return new MobileSecureStorage(prefix)
}
