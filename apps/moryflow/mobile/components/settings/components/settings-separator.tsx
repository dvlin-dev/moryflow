/**
 * [PROPS]: indent
 * [EMITS]: none
 * [POS]: iOS 风格分隔线，支持左侧缩进
 */

import { View } from 'react-native'
import type { SettingsSeparatorProps } from '../const'

/** 默认缩进 = icon(28) + padding(16) + gap(8) */
const DEFAULT_INDENT = 52

export function SettingsSeparator({
  indent = DEFAULT_INDENT,
}: SettingsSeparatorProps) {
  return (
    <View
      className="h-[0.5px] bg-border"
      style={{ marginLeft: indent }}
    />
  )
}
