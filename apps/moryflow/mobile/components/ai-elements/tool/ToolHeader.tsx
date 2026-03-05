/**
 * Tool Header 组件
 *
 * 显示脚本类型、命令行摘要、悬浮状态与折叠控制
 *
 * [UPDATE]: 2026-03-05 - 移除前置状态 icon，改为两行 Header + 右下状态浮层
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { ChevronDown } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';
import { type ToolState } from './const';

interface ToolHeaderProps {
  type: string;
  state: ToolState;
  scriptType?: string;
  command?: string;
  statusLabel?: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function ToolHeader({
  type,
  state,
  scriptType,
  command,
  statusLabel,
  isOpen,
  onToggle,
}: ToolHeaderProps) {
  const colors = useThemeColors();
  const fallbackType = type.startsWith('tool-') ? type.slice(5) : type;
  const resolvedScriptType = scriptType ?? fallbackType;
  const resolvedCommand = command ?? `$ run ${fallbackType}`;
  const resolvedStatus = statusLabel ?? (state === 'output-available' ? 'Success' : 'Running');

  return (
    <Pressable
      className="relative flex-row items-start px-3 pt-3 pb-8 active:opacity-70"
      onPress={onToggle}>
      <View className="mr-2 flex-1">
        <Text className="text-muted-foreground text-xs font-medium" numberOfLines={1}>
          {resolvedScriptType}
        </Text>
        <Text className="mt-1 min-w-0 flex-shrink font-mono text-[13px]" numberOfLines={1}>
          {resolvedCommand}
        </Text>
      </View>
      <Icon
        as={ChevronDown}
        size={16}
        color={colors.textSecondary}
        style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
      />

      <View className="border-border/70 bg-background/80 absolute right-3 bottom-3 rounded-full border px-2 py-0.5">
        <Text className="text-muted-foreground text-[11px]">{resolvedStatus}</Text>
      </View>
    </Pressable>
  );
}
