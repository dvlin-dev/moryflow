/**
 * [PROVIDES]: useWorkspaceSheet - 工作区 Sheet 业务逻辑
 * [DEPENDS]: useCloudSync, useVaultManager, useTheme, useThemeColors, useTranslation
 * [POS]: 封装 WorkspaceSheet 所有状态管理和事件处理
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useCallback, useMemo, useRef, useEffect } from 'react'
import { Alert } from 'react-native'
import type { BottomSheetModal } from '@gorhom/bottom-sheet'
import { useRouter } from 'expo-router'
import { useTheme } from '@/lib/hooks/use-theme'
import { useThemeColors } from '@/lib/theme'
import { useCloudSync, formatLastSyncTime } from '@/lib/cloud-sync'
import { useVaultManager, type ManagedVault } from '@/lib/vault'
import { useTranslation } from '@aiget/i18n'
import {
  RefreshCwIcon,
  CloudOffIcon,
  AlertCircleIcon,
  CheckCircleIcon,
} from 'lucide-react-native'
import type { StatusInfo, WorkspaceSheetProps } from '../const'

export function useWorkspaceSheet({ visible, onClose, onSyncPress }: WorkspaceSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const router = useRouter()
  const { colorScheme } = useTheme()
  const colors = useThemeColors()
  const isDark = colorScheme === 'dark'
  const { t } = useTranslation('workspace')
  const { t: tc } = useTranslation('common')

  // Cloud Sync 状态
  const {
    status,
    isSyncing,
    isEnabled,
    hasError,
    error,
    lastSyncAt,
    triggerSync,
  } = useCloudSync()

  // Vault Manager 状态
  const {
    vaults,
    currentVault,
    isOperating,
    create,
    switch_,
    rename,
    delete_,
  } = useVaultManager()

  // 控制 Sheet 显示/隐藏
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present()
    } else {
      bottomSheetRef.current?.dismiss()
    }
  }, [visible])

  // 格式化最后同步时间
  const lastSyncText = useMemo(() => formatLastSyncTime(lastSyncAt), [lastSyncAt])

  // 同步状态信息
  const statusInfo: StatusInfo = useMemo(() => {
    if (isSyncing) {
      return { text: t('syncingChanges'), icon: RefreshCwIcon, color: colors.primary }
    }
    if (hasError) {
      return { text: error || t('syncFailed'), icon: AlertCircleIcon, color: colors.error }
    }
    if (!isEnabled || status === 'disabled') {
      return { text: t('notEnabled'), icon: CloudOffIcon, color: colors.textTertiary }
    }
    if (status === 'offline') {
      return { text: t('offline'), icon: CloudOffIcon, color: colors.warning }
    }
    return { text: t('synced'), icon: CheckCircleIcon, color: colors.success }
  }, [isSyncing, hasError, isEnabled, status, error, colors, t])

  // 排序后的 Vault 列表（当前在前）
  const sortedVaults = useMemo(() => {
    const current = vaults.find(v => v.id === currentVault?.id)
    const others = vaults.filter(v => v.id !== currentVault?.id)
    return current ? [current, ...others] : others
  }, [vaults, currentVault?.id])

  // ── 事件处理 ───────────────────────────────────────────────────

  const handleDismiss = useCallback(() => {
    onClose()
  }, [onClose])

  const handleSync = useCallback(() => {
    if (onSyncPress) {
      onSyncPress()
    } else {
      triggerSync()
    }
  }, [onSyncPress, triggerSync])

  const handleOpenSettings = useCallback(() => {
    onClose()
    router.push('/(settings)/cloud-sync')
  }, [onClose, router])

  const handleSwitchVault = useCallback(
    async (vaultId: string) => {
      if (currentVault?.id === vaultId) return
      try {
        await switch_(vaultId)
        onClose()
      } catch (err) {
        Alert.alert(tc('error'), err instanceof Error ? err.message : t('switchFailed'))
      }
    },
    [currentVault?.id, switch_, onClose, tc, t]
  )

  const handleRenameVault = useCallback(
    (vault: ManagedVault) => {
      Alert.prompt(
        t('renameWorkspace'),
        t('enterNewWorkspaceName'),
        async (newName) => {
          if (!newName?.trim() || newName.trim() === vault.name) return
          try {
            await rename(vault.id, newName.trim())
          } catch (err) {
            Alert.alert(tc('error'), err instanceof Error ? err.message : t('renameFailed'))
          }
        },
        'plain-text',
        vault.name,
        'default'
      )
    },
    [rename, t, tc]
  )

  const handleDeleteVault = useCallback(
    (vault: ManagedVault) => {
      Alert.alert(
        t('deleteWorkspace'),
        t('confirmDeleteWorkspace', { name: vault.name }),
        [
          { text: tc('cancel'), style: 'cancel' },
          {
            text: tc('delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await delete_(vault.id)
              } catch (err) {
                Alert.alert(tc('error'), err instanceof Error ? err.message : t('deleteFailed'))
              }
            },
          },
        ]
      )
    },
    [delete_, t, tc]
  )

  const handleCreateVault = useCallback(() => {
    Alert.prompt(
      t('newWorkspace'),
      t('enterWorkspaceName'),
      async (name) => {
        if (!name?.trim()) return
        try {
          await create(name.trim())
          onClose()
        } catch (err) {
          Alert.alert(tc('error'), err instanceof Error ? err.message : t('createFailed'))
        }
      },
      'plain-text',
      '',
      'default'
    )
  }, [create, onClose, t, tc])

  return {
    // Refs
    bottomSheetRef,
    // Theme
    colors,
    isDark,
    // i18n
    t,
    // State
    sortedVaults,
    currentVault,
    isOperating,
    isSyncing,
    statusInfo,
    lastSyncText,
    // Handlers
    handleDismiss,
    handleSync,
    handleOpenSettings,
    handleSwitchVault,
    handleRenameVault,
    handleDeleteVault,
    handleCreateVault,
  }
}
