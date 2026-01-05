/**
 * [PROPS]: icon, iconColor, label, onPress, disabled, colors, isDark
 * [EMITS]: onPress
 * [POS]: 操作按钮组件，用于同步、设置、新建等操作
 */

import { Pressable } from 'react-native'
import { Text } from '@/components/ui/text'
import { Icon } from '@/components/ui/icon'
import { PRESSED_BACKGROUND, SHEET_STYLES, type ActionButtonProps } from '../const'

export function ActionButton({
  icon: IconComponent,
  iconColor,
  label,
  onPress,
  disabled,
  colors,
  isDark,
}: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        padding: SHEET_STYLES.itemPadding,
        backgroundColor: pressed
          ? isDark
            ? PRESSED_BACKGROUND.dark
            : PRESSED_BACKGROUND.light
          : 'transparent',
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <Icon as={IconComponent} size={20} color={iconColor} />
      <Text style={{ fontSize: 16, color: colors.textPrimary, marginLeft: 12, flex: 1 }}>
        {label}
      </Text>
    </Pressable>
  )
}
