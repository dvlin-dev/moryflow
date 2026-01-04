/**
 * Tool Output 主组件
 *
 * 根据输出类型自动选择合适的渲染组件
 */

import * as React from 'react'
import { View, ScrollView } from 'react-native'
import { Text } from '@/components/ui/text'
import { CommandOutput } from './CommandOutput'
import { DiffOutput } from './DiffOutput'
import { TodoOutput } from './TodoOutput'
import {
  type ToolOutputProps,
  isCommandResult,
  isDiffResult,
  isTodoResult,
} from './const'

export function ToolOutput({ output, errorText }: ToolOutputProps) {
  // 错误输出
  if (errorText) {
    return <ErrorOutput errorText={errorText} />
  }

  // 无输出
  if (output === undefined || output === null) {
    return null
  }

  // 命令执行结果
  if (isCommandResult(output)) {
    return (
      <OutputWrapper>
        <CommandOutput result={output} />
      </OutputWrapper>
    )
  }

  // Diff 结果
  if (isDiffResult(output)) {
    return (
      <OutputWrapper>
        <DiffOutput result={output} />
      </OutputWrapper>
    )
  }

  // Todo 结果
  if (isTodoResult(output)) {
    return (
      <OutputWrapper>
        <TodoOutput result={output} />
      </OutputWrapper>
    )
  }

  // 默认 JSON 输出
  return (
    <OutputWrapper>
      <DefaultOutput output={output} />
    </OutputWrapper>
  )
}

interface OutputWrapperProps {
  children: React.ReactNode
}

function OutputWrapper({ children }: OutputWrapperProps) {
  return (
    <View className="p-3">
      <Text className="text-xs text-muted-foreground uppercase mb-2 font-medium">结果</Text>
      {children}
    </View>
  )
}

interface ErrorOutputProps {
  errorText: string
}

function ErrorOutput({ errorText }: ErrorOutputProps) {
  return (
    <View className="p-3">
      <Text className="text-xs text-muted-foreground uppercase mb-2 font-medium">错误</Text>
      <View className="bg-destructive/10 rounded-lg p-3">
        <Text className="text-destructive text-xs">{errorText}</Text>
      </View>
    </View>
  )
}

interface DefaultOutputProps {
  output: unknown
}

function DefaultOutput({ output }: DefaultOutputProps) {
  const formatted = React.useMemo(() => {
    if (typeof output === 'string') {
      return output
    }
    try {
      return JSON.stringify(output, null, 2)
    } catch {
      return String(output)
    }
  }, [output])

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="bg-muted/50 rounded-lg"
    >
      <View className="p-3">
        <Text className="font-mono text-xs">{formatted}</Text>
      </View>
    </ScrollView>
  )
}
