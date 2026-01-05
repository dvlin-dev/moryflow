/**
 * [PROPS]: isDark, indent
 * [EMITS]: none
 * [POS]: 列表分隔线组件
 */

import { View } from 'react-native'
import type { SeparatorProps } from '../const'

export function Separator({ isDark, indent = 0 }: SeparatorProps) {
  return (
    <View
      style={{
        height: 0.5,
        backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
        marginLeft: indent,
      }}
    />
  )
}
