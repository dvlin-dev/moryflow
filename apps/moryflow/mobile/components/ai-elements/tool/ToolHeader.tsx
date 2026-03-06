/**
 * Tool Header 组件
 *
 * 显示工具名称、状态和折叠控制
 */

import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Circle, Loader2, Clock, CheckCircle, XCircle, ChevronDown } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';
import {
  type ToolState,
  type ToolStatusConfig,
  TOOL_STATUS_CONFIG,
  getToolDisplayName,
} from './const';

interface ToolHeaderProps {
  type: string;
  state: ToolState;
  input?: Record<string, unknown>;
  isOpen: boolean;
  onToggle: () => void;
}

const ICON_MAP = {
  circle: Circle,
  loader: Loader2,
  clock: Clock,
  'check-circle': CheckCircle,
  'x-circle': XCircle,
} as const;

export function ToolHeader({ type, state, input, isOpen, onToggle }: ToolHeaderProps) {
  const colors = useThemeColors();
  const displayName = getToolDisplayName(type, input);
  const config = TOOL_STATUS_CONFIG[state];

  return (
    <Pressable className="flex-row items-center py-0.5 active:opacity-70" onPress={onToggle}>
      <View className="mr-2 flex-1 flex-row items-center gap-2">
        <StatusIcon config={config} colors={colors} />
        <Text className="min-w-0 flex-shrink text-sm font-medium" numberOfLines={1}>
          {displayName}
        </Text>
        <Icon
          as={ChevronDown}
          size={16}
          color={colors.textSecondary}
          style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
        />
      </View>
    </Pressable>
  );
}

interface StatusIconProps {
  config: ToolStatusConfig;
  colors: ReturnType<typeof useThemeColors>;
}

function StatusIcon({ config, colors }: StatusIconProps) {
  const iconSymbol = ICON_MAP[config.iconName];
  const color = getColorFromClass(config.colorClass, colors);

  return (
    <View className={config.animate ? 'animate-spin' : undefined}>
      <Icon as={iconSymbol} size={14} color={color} />
    </View>
  );
}

function getColorFromClass(colorClass: string, colors: ReturnType<typeof useThemeColors>): string {
  const mapping: Record<string, string> = {
    'text-muted-foreground': colors.textSecondary,
    'text-blue-500': '#3b82f6',
    'text-warning': colors.warning,
    'text-success': colors.success,
    'text-destructive': colors.error,
  };
  return mapping[colorClass] ?? colors.textSecondary;
}
