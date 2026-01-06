/**
 * EditorToolbar 组件
 * 编辑器格式化工具栏
 */

import { Fragment, useCallback } from 'react'
import { View, Pressable, ScrollView, type ViewStyle } from 'react-native'
import { useThemeColors } from '@/lib/theme'
import { cn } from '@/lib/utils'
import type { EditorState, EditorCommand, EditorToolbarProps } from '@/lib/editor'
import { TOOLBAR_GROUPS, IMAGE_REQUEST_MARKER, type ToolbarButton } from './toolbar-config'

/** 工具栏按钮组件 */
function ToolbarButtonItem({
  button,
  state,
  onPress,
}: {
  button: ToolbarButton
  state: EditorState
  onPress: () => void
}) {
  const theme = useThemeColors()
  const isActive = button.isActive?.(state) ?? false
  const isDisabled = button.isDisabled?.(state) ?? false
  const Icon = button.icon

  return (
    <Pressable
      className={cn(
        'w-9 h-9 rounded-lg items-center justify-center',
        isActive && 'bg-accent',
        isDisabled && 'opacity-40'
      )}
      onPress={onPress}
      disabled={isDisabled}
    >
      <Icon
        size={20}
        color={
          isActive
            ? theme.accentForeground
            : isDisabled
              ? theme.mutedForeground
              : theme.foreground
        }
        strokeWidth={2}
      />
    </Pressable>
  )
}

export function EditorToolbar({
  state,
  onCommand,
  visible = true,
  style,
}: EditorToolbarProps) {
  const handlePress = useCallback(
    (command: EditorCommand) => {
      // 特殊处理图片插入
      if (command.type === 'insertImage') {
        onCommand({ type: 'insertImage', src: IMAGE_REQUEST_MARKER })
        return
      }
      onCommand(command)
    },
    [onCommand]
  )

  if (!visible) return null

  return (
    // 外层处理动态 style prop，内层处理静态 className
    <View style={style as ViewStyle}>
      <View className="border-t border-border bg-card py-2">
        <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-row items-center px-2"
        keyboardShouldPersistTaps="always"
      >
          {TOOLBAR_GROUPS.map((group, groupIndex) => (
            <Fragment key={group.id}>
              {groupIndex > 0 && <View className="w-px h-6 mx-2 bg-border" />}
              <View className="flex-row items-center gap-1">
                {group.buttons.map((button) => (
                  <ToolbarButtonItem
                    key={button.id}
                    button={button}
                    state={state}
                    onPress={() => handlePress(button.command)}
                  />
                ))}
              </View>
            </Fragment>
          ))}
        </ScrollView>
      </View>
    </View>
  )
}
