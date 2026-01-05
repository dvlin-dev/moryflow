import { View } from 'react-native'
import { useState, useEffect } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'
import type { SaveStatus } from '../const'
import { formatTimeAgo } from '../helper'

interface SaveStatusIndicatorProps {
  status: SaveStatus
  lastSavedAt: Date | null
}

/**
 * 保存状态指示器
 * 固定在页面右下角，显示保存状态
 */
export function SaveStatusIndicator({ status, lastSavedAt }: SaveStatusIndicatorProps) {
  const insets = useSafeAreaInsets()
  const [, forceUpdate] = useState(0)

  // 定时更新"多久前保存"的显示
  useEffect(() => {
    if (status === 'idle' && lastSavedAt) {
      const interval = setInterval(() => {
        forceUpdate((n) => n + 1)
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [status, lastSavedAt])

  const getStatusDisplay = () => {
    switch (status) {
      case 'saving':
        return { text: '正在保存...', className: 'text-muted-foreground' }
      case 'success':
        return { text: '已保存', className: 'text-green-600' }
      case 'error':
        return { text: '保存失败', className: 'text-destructive' }
      case 'idle':
      default:
        if (lastSavedAt) {
          return { text: formatTimeAgo(lastSavedAt), className: 'text-muted-foreground' }
        }
        return null
    }
  }

  const display = getStatusDisplay()
  if (!display) return null

  return (
    <View
      style={{ position: 'absolute', bottom: insets.bottom + 8, right: 16 }}
      pointerEvents="none"
    >
      <Text className={cn('text-[10px]', display.className)}>{display.text}</Text>
    </View>
  )
}
