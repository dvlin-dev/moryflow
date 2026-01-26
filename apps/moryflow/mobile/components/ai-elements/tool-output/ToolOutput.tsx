/**
 * [PROPS]: ToolOutputProps
 * [POS]: Mobile 端工具输出统一入口（按输出类型分发）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import * as React from 'react'
import { View, ScrollView } from 'react-native'
import { Text } from '@/components/ui/text'
import { CommandOutput } from './CommandOutput'
import { DiffOutput } from './DiffOutput'
import { TodoOutput } from './TodoOutput'
import { TruncatedOutput } from './TruncatedOutput'
import {
  type ToolOutputProps,
  isCommandResult,
  isDiffResult,
  isTodoResult,
  isTruncatedOutput,
} from './const'
import { useTranslation } from '@/lib/i18n'

export function ToolOutput({ output, errorText }: ToolOutputProps) {
  const { t } = useTranslation('chat')

  // 错误输出
  if (errorText) {
    return <ErrorOutput errorText={errorText} label={t('errorLabel')} />
  }

  // 无输出
  if (output === undefined || output === null) {
    return null
  }

  // 截断输出
  if (isTruncatedOutput(output)) {
    return (
      <OutputWrapper label={t('resultLabel')}>
        <TruncatedOutput result={output} />
      </OutputWrapper>
    )
  }

  // 命令执行结果
  if (isCommandResult(output)) {
    return (
      <OutputWrapper label={t('resultLabel')}>
        <CommandOutput result={output} />
      </OutputWrapper>
    )
  }

  // Diff 结果
  if (isDiffResult(output)) {
    return (
      <OutputWrapper label={t('resultLabel')}>
        <DiffOutput result={output} />
      </OutputWrapper>
    )
  }

  // Todo 结果
  if (isTodoResult(output)) {
    return (
      <OutputWrapper label={t('resultLabel')}>
        <TodoOutput result={output} />
      </OutputWrapper>
    )
  }

  // 默认 JSON 输出
  return (
    <OutputWrapper label={t('resultLabel')}>
      <DefaultOutput output={output} />
    </OutputWrapper>
  )
}

interface OutputWrapperProps {
  children: React.ReactNode
  label: string
}

function OutputWrapper({ children, label }: OutputWrapperProps) {
  return (
    <View className="p-3">
      <Text className="text-xs text-muted-foreground uppercase mb-2 font-medium">{label}</Text>
      {children}
    </View>
  )
}

interface ErrorOutputProps {
  errorText: string
  label: string
}

function ErrorOutput({ errorText, label }: ErrorOutputProps) {
  return (
    <View className="p-3">
      <Text className="text-xs text-muted-foreground uppercase mb-2 font-medium">{label}</Text>
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
