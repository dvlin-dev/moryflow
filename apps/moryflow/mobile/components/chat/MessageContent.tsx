/**
 * Markdown 消息内容渲染组件
 *
 * 注意：react-native-markdown-display 需要 StyleSheet 对象，
 * 这是库的限制，无法使用 nativewind
 */

import React, { useMemo } from 'react'
import { StyleSheet } from 'react-native'
import Markdown from 'react-native-markdown-display'
import { useThemeColors } from '@/lib/theme'

interface MessageContentProps {
  content: string
}

export function MessageContent({ content }: MessageContentProps) {
  const colors = useThemeColors()

  // 使用 useMemo 缓存样式对象，避免每次渲染重新创建
  const markdownStyles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          color: colors.textPrimary,
          fontSize: 16,
          lineHeight: 24,
        },
        heading1: {
          color: colors.textPrimary,
          fontSize: 24,
          fontWeight: '700',
          marginVertical: 8,
        },
        heading2: {
          color: colors.textPrimary,
          fontSize: 20,
          fontWeight: '600',
          marginVertical: 6,
        },
        heading3: {
          color: colors.textPrimary,
          fontSize: 18,
          fontWeight: '600',
          marginVertical: 4,
        },
        code_inline: {
          backgroundColor: colors.codeBg,
          color: colors.codeText,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
          fontFamily: 'monospace',
        },
        fence: {
          backgroundColor: colors.codeBg,
          borderRadius: 8,
          padding: 12,
          marginVertical: 8,
        },
        code_block: {
          fontFamily: 'monospace',
          fontSize: 14,
          color: colors.textPrimary,
        },
        blockquote: {
          backgroundColor: colors.surfaceHover,
          borderLeftWidth: 4,
          borderLeftColor: colors.quoteBorder,
          paddingLeft: 12,
          paddingVertical: 4,
          marginVertical: 8,
        },
        link: {
          color: colors.link,
        },
        list_item: {
          marginVertical: 4,
        },
      }),
    [colors]
  )

  return <Markdown style={markdownStyles}>{content}</Markdown>
}
