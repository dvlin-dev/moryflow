/**
 * [PROPS]: title, footer, children
 * [EMITS]: none
 * [POS]: iOS 风格设置分组，圆角卡片容器
 */

import { View } from 'react-native'
import React from 'react'
import { Text } from '@/components/ui/text'
import type { SettingsGroupProps } from '../const'

export function SettingsGroup({ title, footer, children }: SettingsGroupProps) {
  // 过滤空子元素
  const validChildren = React.Children.toArray(children).filter(Boolean)

  if (validChildren.length === 0) {
    return null
  }

  return (
    <View className="mx-4 mb-6">
      {/* 分区标题 */}
      {title && (
        <Text className="text-[13px] text-muted-foreground uppercase mb-2 ml-4">
          {title}
        </Text>
      )}

      {/* 卡片容器 */}
      <View className="bg-surface-primary rounded-[10px] overflow-hidden">
        {validChildren}
      </View>

      {/* 底部说明 */}
      {footer && (
        <Text className="text-[13px] text-muted-foreground mt-2 ml-4 leading-[18px]">
          {footer}
        </Text>
      )}
    </View>
  )
}
