/**
 * Tool Header 组件
 *
 * 显示脚本类型、命令行摘要与悬浮状态
 *
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import * as React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { type ToolState } from './const';

interface ToolHeaderProps {
  type: string;
  state: ToolState;
  scriptType?: string;
  command?: string;
  statusLabel?: string;
}

export function ToolHeader({ type, state, scriptType, command, statusLabel }: ToolHeaderProps) {
  const fallbackType = type.startsWith('tool-') ? type.slice(5) : type;
  const resolvedScriptType = scriptType ?? fallbackType;
  const resolvedCommand = command ?? `$ run ${fallbackType}`;
  const resolvedStatus = statusLabel ?? (state === 'output-available' ? 'Success' : 'Running');

  return (
    <View className="relative flex-row items-start px-3 pt-3 pb-8">
      <View className="mr-2 flex-1">
        <Text className="text-muted-foreground text-xs font-medium" numberOfLines={1}>
          {resolvedScriptType}
        </Text>
        <Text className="mt-1 min-w-0 flex-shrink font-mono text-[13px]" numberOfLines={1}>
          {resolvedCommand}
        </Text>
      </View>

      <View className="border-border/70 bg-background/80 absolute right-3 bottom-3 rounded-full border px-2 py-0.5">
        <Text className="text-muted-foreground text-[11px]">{resolvedStatus}</Text>
      </View>
    </View>
  );
}
