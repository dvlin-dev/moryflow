/**
 * 最近打开的文档记录服务
 *
 * 使用 AsyncStorage 持久化存储最近打开的文档路径
 * 最多保存 20 条记录
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useState, useEffect, useCallback } from 'react'
import { fileExists, getVault } from '@/lib/vault'
import { fileIndexManager } from './file-index'

const STORAGE_KEY = 'moryflow:recently-opened'
const MAX_ITEMS = 20

export interface RecentlyOpenedItem {
  /** 文件路径 */
  path: string
  /** 文件 ID */
  fileId: string
  /** 文件名（不含扩展名） */
  title: string
  /** 最后打开时间 */
  openedAt: number
  /** 自定义图标（可选） */
  icon?: string
}

/**
 * 获取最近打开的文档列表
 * 自动过滤掉已删除的文件，并更新路径（处理重命名场景）
 */
export async function getRecentlyOpened(): Promise<RecentlyOpenedItem[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY)
    if (!data) return []

    const items: RecentlyOpenedItem[] = JSON.parse(data)
    const vault = await getVault()
    if (!vault) return items

    // 过滤并更新路径
    const validItems: RecentlyOpenedItem[] = []
    let hasChanges = false

    for (const item of items) {
      // 通过 fileId 获取当前路径
      const currentPath = fileIndexManager.getByFileId(vault.path, item.fileId)
      if (!currentPath) {
        // fileId 找不到，说明文件已删除
        hasChanges = true
        continue
      }

      // 检查文件是否存在
      const exists = await fileExists(currentPath)
      if (!exists) {
        hasChanges = true
        continue
      }

      // 更新路径（处理重命名）
      if (currentPath !== item.path) {
        const newTitle = currentPath.split('/').pop()?.replace(/\.[^/.]+$/, '') || item.title
        validItems.push({ ...item, path: currentPath, title: newTitle })
        hasChanges = true
      } else {
        validItems.push(item)
      }
    }

    // 如果有变更，更新存储
    if (hasChanges) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validItems))
    }

    return validItems
  } catch (error) {
    console.error('[RecentlyOpened] Failed to get:', error)
    return []
  }
}

/**
 * 添加或更新最近打开的文档
 */
export async function addRecentlyOpened(
  path: string,
  fileId: string,
  title?: string
): Promise<void> {
  try {
    const items = await getRecentlyOpened()

    // 用 fileId 去重
    const filtered = items.filter((item) => item.fileId !== fileId)

    // 提取文件名（不含扩展名）
    const fileName =
      title || path.split('/').pop()?.replace(/\.[^/.]+$/, '') || '未命名'

    // 添加到开头
    const newItem: RecentlyOpenedItem = {
      path,
      fileId,
      title: fileName,
      openedAt: Date.now(),
    }

    const updated = [newItem, ...filtered].slice(0, MAX_ITEMS)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('[RecentlyOpened] Failed to add:', error)
  }
}

/**
 * 从最近打开列表中移除文档
 */
export async function removeRecentlyOpened(path: string): Promise<void> {
  try {
    const items = await getRecentlyOpened()
    const filtered = items.filter(item => item.path !== path)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('[RecentlyOpened] Failed to remove:', error)
  }
}

/**
 * 清空最近打开列表
 */
export async function clearRecentlyOpened(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('[RecentlyOpened] Failed to clear:', error)
  }
}

/**
 * Hook: 获取最近打开的文档列表
 */
export function useRecentlyOpened() {
  const [items, setItems] = useState<RecentlyOpenedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 加载数据
  const load = useCallback(async () => {
    setIsLoading(true)
    const data = await getRecentlyOpened()
    setItems(data)
    setIsLoading(false)
  }, [])

  // 初始加载
  useEffect(() => {
    load()
  }, [load])

  // 添加并刷新
  const add = useCallback(
    async (path: string, fileId: string, title?: string) => {
      await addRecentlyOpened(path, fileId, title)
      await load()
    },
    [load]
  )

  // 移除并刷新
  const remove = useCallback(async (path: string) => {
    await removeRecentlyOpened(path)
    await load()
  }, [load])

  return {
    items,
    isLoading,
    refresh: load,
    add,
    remove,
  }
}
