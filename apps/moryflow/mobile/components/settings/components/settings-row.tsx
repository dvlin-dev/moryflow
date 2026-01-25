/**
 * [PROPS]: icon, title, subtitle, rightContent, onPress, disabled, variant, showArrow
 * [EMITS]: onPress
 * [POS]: iOS 风格设置项行，支持图标、副标题、右侧内容
 */

import { View, Pressable } from 'react-native';
import { ChevronRightIcon } from '@/components/ui/icons';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';
import { cn } from '@/lib/utils';
import type { SettingsRowProps } from '../const';

export function SettingsRow({
  icon: IconComponent,
  iconColor,
  title,
  subtitle,
  rightContent,
  onPress,
  disabled = false,
  variant = 'default',
  showArrow = true,
}: SettingsRowProps) {
  const colors = useThemeColors();

  // 根据 variant 决定颜色
  const isDestructive = variant === 'destructive';
  const finalIconColor = isDestructive ? colors.destructive : (iconColor ?? colors.primary);

  // 行内容
  const rowContent = (
    <View className="min-h-[44px] flex-row items-center px-4 py-3">
      {/* 左侧图标 */}
      {IconComponent && (
        <Icon as={IconComponent} size={22} color={finalIconColor} style={{ marginRight: 12 }} />
      )}

      {/* 中间文字区 */}
      <View className="flex-1">
        <Text className={cn('text-[17px]', isDestructive ? 'text-destructive' : 'text-foreground')}>
          {title}
        </Text>
        {subtitle && <Text className="text-muted-foreground mt-0.5 text-[13px]">{subtitle}</Text>}
      </View>

      {/* 右侧内容 */}
      {rightContent}

      {/* 右侧箭头（仅可点击时显示） */}
      {onPress && showArrow && !rightContent && (
        <Icon as={ChevronRightIcon} size={18} color={colors.iconMuted} />
      )}
    </View>
  );

  // 不可点击时直接返回内容
  if (!onPress) {
    return rowContent;
  }

  // 可点击时包裹 Pressable
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn('active:bg-surface-pressed', disabled && 'opacity-50')}>
      {rowContent}
    </Pressable>
  );
}
