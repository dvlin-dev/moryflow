/**
 * Tool Content 组件
 *
 * 显示工具输入参数和输出结果
 */

import * as React from 'react'
import { View, ScrollView } from 'react-native'
import { Text } from '@/components/ui/text'
import { ToolOutput } from '../tool-output'

interface ToolContentProps {
  input?: Record<string, unknown>
  output?: unknown
  errorText?: string
}

export function ToolContent({ input, output, errorText }: ToolContentProps) {
  const hasOutput = output !== undefined || errorText !== undefined

  return (
    <View className="border-t border-border">
      {/* 输入参数 */}
      {input && <ToolInput input={input} />}

      {/* 输出结果 */}
      {hasOutput && (
        <View className={input ? 'border-t border-border' : ''}>
          <ToolOutput output={output} errorText={errorText} />
        </View>
      )}
    </View>
  )
}

interface ToolInputProps {
  input: Record<string, unknown>
}

function ToolInput({ input }: ToolInputProps) {
  const formatted = React.useMemo(() => {
    try {
      return JSON.stringify(input, null, 2)
    } catch {
      return String(input)
    }
  }, [input])

  return (
    <View className="p-3">
      <Text className="text-xs text-muted-foreground uppercase mb-2 font-medium">参数</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="bg-muted/50 rounded-lg"
      >
        <View className="p-3">
          <Text className="font-mono text-xs">{formatted}</Text>
        </View>
      </ScrollView>
    </View>
  )
}
