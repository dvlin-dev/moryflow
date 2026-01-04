/**
 * Diff 输出组件
 */

import * as React from 'react'
import { View, ScrollView } from 'react-native'
import { Text } from '@/components/ui/text'
import type { DiffResult } from './const'

interface DiffOutputProps {
  result: DiffResult
}

export function DiffOutput({ result }: DiffOutputProps) {
  return (
    <View className="rounded-lg border border-border/60 bg-muted/30 p-3 gap-3">
      {/* 目标文件 */}
      {result.path && (
        <Text className="text-xs text-muted-foreground">
          目标文件：<Text className="font-mono">{result.path}</Text>
        </Text>
      )}

      {/* 修改说明 */}
      {result.rationale && (
        <Text className="text-sm">{result.rationale}</Text>
      )}

      {/* Patch 内容 */}
      {result.patch && (
        <DiffBlock content={result.patch} />
      )}

      {/* Preview 内容 */}
      {result.preview && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="rounded-lg border border-border/60 bg-background"
        >
          <View className="p-2">
            <Text className="font-mono text-xs">{result.preview}</Text>
          </View>
        </ScrollView>
      )}

      {/* 截断提示 */}
      {result.truncated && (
        <Text className="text-xs text-muted-foreground">
          内容太长，已截断，在本地文件查看完整版。
        </Text>
      )}
    </View>
  )
}

interface DiffBlockProps {
  content: string
}

function DiffBlock({ content }: DiffBlockProps) {
  const lines = content.split('\n')

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="rounded-lg border border-border/60 bg-background"
    >
      <View className="p-2">
        {lines.map((line, index) => (
          <DiffLine key={index} line={line} />
        ))}
      </View>
    </ScrollView>
  )
}

interface DiffLineProps {
  line: string
}

function DiffLine({ line }: DiffLineProps) {
  let className = 'font-mono text-xs'

  if (line.startsWith('+') && !line.startsWith('+++')) {
    className += ' text-success'
  } else if (line.startsWith('-') && !line.startsWith('---')) {
    className += ' text-destructive'
  } else if (line.startsWith('@@')) {
    className += ' text-blue-500'
  }

  return <Text className={className}>{line}</Text>
}
