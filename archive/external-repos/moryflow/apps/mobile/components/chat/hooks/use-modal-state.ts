/**
 * Modal State Hook
 *
 * 管理多个 Modal 的显示状态
 */

import { useState, useCallback } from 'react'
import type { UnifiedModel } from '@/lib/models'

interface UseModalStateResult {
  /** 模型选择器是否显示 */
  showModelPicker: boolean
  /** 会话切换器是否显示 */
  showSessionSwitcher: boolean
  /** 升级提示是否显示 */
  showUpgradeSheet: boolean
  /** 被锁定的模型（需要升级才能使用） */
  lockedModel: UnifiedModel | null
  /** 打开模型选择器 */
  openModelPicker: () => void
  /** 关闭模型选择器 */
  closeModelPicker: () => void
  /** 打开会话切换器 */
  openSessionSwitcher: () => void
  /** 关闭会话切换器 */
  closeSessionSwitcher: () => void
  /** 处理锁定模型点击 */
  handleLockedModelPress: (model: UnifiedModel) => void
  /** 关闭升级提示 */
  closeUpgradeSheet: () => void
}

/**
 * 管理 Modal 显示状态
 */
export function useModalState(): UseModalStateResult {
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSessionSwitcher, setShowSessionSwitcher] = useState(false)
  const [showUpgradeSheet, setShowUpgradeSheet] = useState(false)
  const [lockedModel, setLockedModel] = useState<UnifiedModel | null>(null)

  const openModelPicker = useCallback(() => setShowModelPicker(true), [])
  const closeModelPicker = useCallback(() => setShowModelPicker(false), [])

  const openSessionSwitcher = useCallback(() => setShowSessionSwitcher(true), [])
  const closeSessionSwitcher = useCallback(() => setShowSessionSwitcher(false), [])

  const handleLockedModelPress = useCallback((model: UnifiedModel) => {
    setLockedModel(model)
    setShowModelPicker(false)
    setShowUpgradeSheet(true)
  }, [])

  const closeUpgradeSheet = useCallback(() => {
    setShowUpgradeSheet(false)
    setLockedModel(null)
  }, [])

  return {
    showModelPicker,
    showSessionSwitcher,
    showUpgradeSheet,
    lockedModel,
    openModelPicker,
    closeModelPicker,
    openSessionSwitcher,
    closeSessionSwitcher,
    handleLockedModelPress,
    closeUpgradeSheet,
  }
}
