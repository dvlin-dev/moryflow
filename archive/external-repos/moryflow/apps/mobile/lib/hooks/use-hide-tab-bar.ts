/**
 * 便捷 Hook：在页面 mount 时自动隐藏底部导航栏，unmount 时恢复
 *
 * 使用方式：
 * ```tsx
 * export default function EditorPage() {
 *   useHideTabBar(); // 自动隐藏/恢复
 *   // ...
 * }
 * ```
 */

import { useEffect } from 'react'
import { useTabBar } from '@/lib/contexts/tab-bar.context'

export function useHideTabBar() {
  const { hideTabBar, showTabBar } = useTabBar()

  useEffect(() => {
    hideTabBar()
    return () => showTabBar()
  }, [hideTabBar, showTabBar])
}
