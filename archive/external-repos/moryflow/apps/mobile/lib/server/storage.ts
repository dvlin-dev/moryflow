/**
 * Membership 存储层
 *
 * 使用 SecureStore 存储敏感数据（token）
 * 使用 AsyncStorage 存储非敏感缓存（用户信息）
 */

import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { UserInfo } from './types'

const TOKEN_KEY = 'membership_token'
const USER_CACHE_KEY = 'membership_user_cache'

// ── Token 操作（安全存储）────────────────────────────────

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY)
  } catch (error) {
    console.error('[MembershipStorage] Failed to get token:', error)
    return null
  }
}

export async function setStoredToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token)
  } catch (error) {
    console.error('[MembershipStorage] Failed to set token:', error)
  }
}

export async function clearStoredToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
  } catch (error) {
    console.error('[MembershipStorage] Failed to clear token:', error)
  }
}

// ── 用户信息缓存（普通存储）──────────────────────────────

export async function getStoredUserCache(): Promise<UserInfo | null> {
  try {
    const stored = await AsyncStorage.getItem(USER_CACHE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.error('[MembershipStorage] Failed to get user cache:', error)
    return null
  }
}

export async function setStoredUserCache(user: UserInfo | null): Promise<void> {
  try {
    if (user) {
      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
    } else {
      await AsyncStorage.removeItem(USER_CACHE_KEY)
    }
  } catch (error) {
    console.error('[MembershipStorage] Failed to set user cache:', error)
  }
}

export async function clearStoredUserCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_CACHE_KEY)
  } catch (error) {
    console.error('[MembershipStorage] Failed to clear user cache:', error)
  }
}
