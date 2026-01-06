/**
 * Expo Fetch 适配器
 *
 * 将 expo/fetch 包装为标准 Fetch API 类型
 * expo/fetch 支持流式响应，但类型签名略有差异
 */

import { fetch as expoFetch } from 'expo/fetch'

/**
 * 标准化的 Fetch 函数
 *
 * expo/fetch 与标准 fetch 的主要差异：
 * - 支持 React Native 环境的流式响应
 * - 类型定义略有不同（body: null vs undefined）
 *
 * 此适配器确保类型安全的同时保留 expo/fetch 的功能
 */
export const mobileFetch: typeof globalThis.fetch = async (input, init) => {
  // 处理 body: null -> undefined（expo/fetch 不接受 null）
  const adaptedInit = init
    ? { ...init, body: init.body === null ? undefined : init.body }
    : undefined
  const response = await expoFetch(
    input as Parameters<typeof expoFetch>[0],
    adaptedInit as Parameters<typeof expoFetch>[1]
  )
  return response as Response
}
