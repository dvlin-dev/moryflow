/**
 * [PROPS]: vault, isCurrent, isOperating, onSwitch, onRename, onDelete, colors, isDark
 * [EMITS]: onSwitch, onRename, onDelete
 * [POS]: Vault 列表项组件，支持原生上下文菜单
 */

import { View, Pressable } from 'react-native'
import * as ContextMenu from 'zeego/context-menu'
import { useTranslation } from '@moryflow/shared-i18n'
import { Text } from '@/components/ui/text'
import { Icon } from '@/components/ui/icon'
import { CheckIcon } from 'lucide-react-native'
import { PRESSED_BACKGROUND, SHEET_STYLES, type VaultItemProps } from '../const'

export function VaultItem({
  vault,
  isCurrent,
  isOperating,
  onSwitch,
  onRename,
  onDelete,
  colors,
  isDark,
}: VaultItemProps) {
  const { t } = useTranslation('workspace')
  const { t: tc } = useTranslation('common')

  const itemContent = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: SHEET_STYLES.itemPadding,
        backgroundColor: 'transparent',
      }}
    >
      <Text
        style={{
          fontSize: 17,
          fontWeight: isCurrent ? '500' : '400',
          color: colors.textPrimary,
          flex: 1,
        }}
      >
        {vault.name}
      </Text>
      {isCurrent && <Icon as={CheckIcon} size={20} color={colors.primary} />}
    </View>
  )

  // 当前 vault 不显示 context menu
  if (isCurrent) {
    return itemContent
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <Pressable
          onPress={onSwitch}
          disabled={isOperating}
          style={({ pressed }) => ({
            backgroundColor: pressed
              ? isDark
                ? PRESSED_BACKGROUND.dark
                : PRESSED_BACKGROUND.light
              : 'transparent',
            opacity: isOperating ? 0.5 : 1,
          })}
        >
          {itemContent}
        </Pressable>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item key="switch" onSelect={onSwitch}>
          <ContextMenu.ItemTitle>{t('switchToWorkspace')}</ContextMenu.ItemTitle>
          <ContextMenu.ItemIcon ios={{ name: 'arrow.right.circle' }} />
        </ContextMenu.Item>
        <ContextMenu.Item key="rename" onSelect={onRename}>
          <ContextMenu.ItemTitle>{tc('rename')}</ContextMenu.ItemTitle>
          <ContextMenu.ItemIcon ios={{ name: 'pencil' }} />
        </ContextMenu.Item>
        <ContextMenu.Item key="delete" onSelect={onDelete} destructive>
          <ContextMenu.ItemTitle>{tc('delete')}</ContextMenu.ItemTitle>
          <ContextMenu.ItemIcon ios={{ name: 'trash' }} />
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  )
}
