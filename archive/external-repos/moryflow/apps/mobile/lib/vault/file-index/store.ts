/**
 * FileIndex - IO 层
 * 单一职责：AsyncStorage 读写操作
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { FileIndexStore } from '@moryflow/shared-api'

const getStorageKey = (vaultPath: string) => `moryflow:file-index:${vaultPath}`

/** 从 AsyncStorage 加载 */
export const loadStore = async (vaultPath: string): Promise<FileIndexStore> => {
  try {
    const data = await AsyncStorage.getItem(getStorageKey(vaultPath))
    if (!data) return { files: [] }
    return JSON.parse(data)
  } catch {
    return { files: [] }
  }
}

/** 保存到 AsyncStorage */
export const saveStore = async (
  vaultPath: string,
  store: FileIndexStore
): Promise<void> => {
  await AsyncStorage.setItem(getStorageKey(vaultPath), JSON.stringify(store))
}
