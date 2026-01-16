/**
 * [PROPS]: onSyncPress - 手动触发同步回调
 * [EMITS]: 无
 * [POS]: 首页左上角工作区选择器，显示 vault 名称和同步状态
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { View, Platform, Pressable } from 'react-native'
import { useState, useCallback, useMemo } from 'react'
import { WorkspaceSheet } from './workspace-sheet'
import { Text } from '@/components/ui/text'
import { useThemeColors } from '@/lib/theme'
import { useTheme } from '@/lib/hooks/use-theme'
import { useTranslation } from '@anyhunt/i18n'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { BlurView } from 'expo-blur'

// 尺寸常量
const BUTTON_HEIGHT = 40
const BUTTON_PADDING_H = 16
const BUTTON_BORDER_RADIUS = BUTTON_HEIGHT / 2

interface WorkspaceSelectorProps {
  vaultName?: string
  onSyncPress?: () => void
}

export function WorkspaceSelector({ vaultName, onSyncPress }: WorkspaceSelectorProps) {
  const [sheetVisible, setSheetVisible] = useState(false)
  const colors = useThemeColors()
  const { colorScheme } = useTheme()
  const isDark = colorScheme === 'dark'
  const { t } = useTranslation('workspace')

  // 检测液态玻璃是否可用
  const glassAvailable = useMemo(() => {
    try {
      return Platform.OS === 'ios' && isLiquidGlassAvailable()
    } catch {
      return false
    }
  }, [])

  const handleOpenSheet = useCallback(() => {
    setSheetVisible(true)
  }, [])

  const handleCloseSheet = useCallback(() => {
    setSheetVisible(false)
  }, [])

  // 按钮内容
  const buttonContent = (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: BUTTON_PADDING_H,
      }}
    >
      <Text
        style={{
          fontSize: 15,
          fontWeight: '600',
          color: colors.textPrimary,
        }}
        numberOfLines={1}
      >
        {vaultName || t('workspace')}
      </Text>
    </View>
  )

  // 玻璃按钮容器
  const glassButton = glassAvailable ? (
    <GlassView
      style={{
        height: BUTTON_HEIGHT,
        borderRadius: BUTTON_BORDER_RADIUS,
        overflow: 'hidden',
      }}
      glassEffectStyle="regular"
      isInteractive={true}
    >
      {buttonContent}
    </GlassView>
  ) : (
    <BlurView
      intensity={isDark ? 40 : 60}
      tint={isDark ? 'dark' : 'light'}
      style={{
        height: BUTTON_HEIGHT,
        borderRadius: BUTTON_BORDER_RADIUS,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: BUTTON_BORDER_RADIUS,
          backgroundColor: isDark ? 'rgba(60, 60, 67, 0.6)' : 'rgba(255, 255, 255, 0.7)',
        }}
      >
        {buttonContent}
      </View>
    </BlurView>
  )

  return (
    <>
      <Pressable onPress={handleOpenSheet}>{glassButton}</Pressable>
      <WorkspaceSheet
        visible={sheetVisible}
        onClose={handleCloseSheet}
        vaultName={vaultName}
        onSyncPress={onSyncPress}
      />
    </>
  )
}
