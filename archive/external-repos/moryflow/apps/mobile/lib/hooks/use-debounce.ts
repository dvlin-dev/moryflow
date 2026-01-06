import { useState, useEffect } from 'react'

/**
 * 防抖值 Hook
 *
 * 延迟更新值，直到指定的延迟时间过去且值没有再次变化。
 * 常用于搜索输入、窗口大小调整等需要减少更新频率的场景。
 *
 * @template T 值的类型
 * @param {T} value 需要防抖的值
 * @param {number} delay 延迟时间（毫秒）
 * @returns {T} 防抖后的值
 *
 * @example
 * ```tsx
 * const [searchText, setSearchText] = useState('')
 * const debouncedSearchText = useDebounce(searchText, 300)
 *
 * useEffect(() => {
 *   // 只有在用户停止输入 300ms 后才会执行搜索
 *   performSearch(debouncedSearchText)
 * }, [debouncedSearchText])
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // 设置定时器，在 delay 毫秒后更新防抖值
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // 清理函数：如果 value 在 delay 时间内再次改变，则清除之前的定时器
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
