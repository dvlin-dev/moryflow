/**
 * Tool 组件
 *
 * 可折叠的工具调用显示，包含状态、输入和输出
 */

import * as React from 'react'
import { View } from 'react-native'
import { ToolHeader } from './ToolHeader'
import { ToolContent } from './ToolContent'
import type { ToolProps } from './const'

export function Tool({
  type,
  state,
  input,
  output,
  errorText,
  defaultOpen = false,
}: ToolProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  const handleToggle = React.useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  return (
    <View className="w-full mb-3 rounded-xl border border-border bg-surface overflow-hidden">
      <ToolHeader
        type={type}
        state={state}
        input={input}
        isOpen={isOpen}
        onToggle={handleToggle}
      />
      {isOpen && (
        <ToolContent
          input={input}
          output={output}
          errorText={errorText}
        />
      )}
    </View>
  )
}
