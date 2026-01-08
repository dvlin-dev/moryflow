/**
 * [PROPS]: visible, onClose, vaultName, onSyncPress
 * [EMITS]: onClose - 关闭抽屉时触发
 * [POS]: 工作区管理底部抽屉，展示 Vault 列表、同步状态、操作入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import React, { useCallback } from 'react';
import { View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { RefreshCwIcon, SettingsIcon, PlusIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';

import {
  SHEET_SNAP_POINTS,
  SHEET_STYLES,
  CARD_BACKGROUND,
  type WorkspaceSheetProps,
} from './const';
import { useWorkspaceSheet } from './hooks/use-workspace-sheet';
import { VaultItem } from './components/vault-item';
import { ActionButton } from './components/action-button';
import { Separator } from './components/separator';
import { SyncStatus } from './components/sync-status';
import { WorkspaceSheetErrorBoundary } from './components/error-boundary';

// ── 内部组件 ─────────────────────────────────────────────────────

function WorkspaceSheetContent(props: WorkspaceSheetProps) {
  const {
    bottomSheetRef,
    colors,
    isDark,
    t,
    sortedVaults,
    currentVault,
    isOperating,
    isSyncing,
    statusInfo,
    lastSyncText,
    handleDismiss,
    handleSync,
    handleOpenSettings,
    handleSwitchVault,
    handleRenameVault,
    handleDeleteVault,
    handleCreateVault,
  } = useWorkspaceSheet(props);

  // 背景色
  const sheetBackground = isDark ? 'rgb(28, 28, 30)' : colors.background;

  // 自定义背景遮罩
  const renderBackdrop = useCallback(
    (backdropProps: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...backdropProps}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={isDark ? 0.6 : 0.4}
        pressBehavior="close"
      />
    ),
    [isDark]
  );

  // 自定义背景组件
  const renderBackground = useCallback(
    () => (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderTopLeftRadius: SHEET_STYLES.borderRadius,
          borderTopRightRadius: SHEET_STYLES.borderRadius,
          backgroundColor: sheetBackground,
        }}
      />
    ),
    [sheetBackground]
  );

  // 卡片背景
  const cardBackground = isDark ? CARD_BACKGROUND.dark : CARD_BACKGROUND.light;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={SHEET_SNAP_POINTS}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundComponent={renderBackground}
      handleIndicatorStyle={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
        width: SHEET_STYLES.handleIndicatorWidth,
      }}
      enablePanDownToClose
      enableDynamicSizing={false}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 20,
      }}>
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: SHEET_STYLES.contentPaddingHorizontal,
          paddingBottom: SHEET_STYLES.contentPaddingBottom,
        }}>
        {/* 标题 */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: '700',
            color: colors.textPrimary,
            marginBottom: 16,
            marginTop: 8,
          }}>
          {t('workspaceTitle')}
        </Text>

        {/* Vault 列表 */}
        <View
          style={{
            backgroundColor: cardBackground,
            borderRadius: SHEET_STYLES.cardBorderRadius,
            overflow: 'hidden',
            marginBottom: 16,
          }}>
          {sortedVaults.map((vault, index) => {
            const isCurrent = vault.id === currentVault?.id;
            return (
              <React.Fragment key={vault.id}>
                {index > 0 && <Separator isDark={isDark} />}
                <View>
                  <VaultItem
                    vault={vault}
                    isCurrent={isCurrent}
                    isOperating={isOperating}
                    onSwitch={() => handleSwitchVault(vault.id)}
                    onRename={() => handleRenameVault(vault)}
                    onDelete={() => handleDeleteVault(vault)}
                    colors={colors}
                    isDark={isDark}
                  />
                  {/* 当前 Vault 显示同步状态 */}
                  {isCurrent && (
                    <SyncStatus
                      isSyncing={isSyncing}
                      statusInfo={statusInfo}
                      lastSyncText={lastSyncText}
                      colors={colors}
                    />
                  )}
                </View>
              </React.Fragment>
            );
          })}
        </View>

        {/* 操作列表 */}
        <View
          style={{
            backgroundColor: cardBackground,
            borderRadius: SHEET_STYLES.cardBorderRadius,
            overflow: 'hidden',
          }}>
          {/* 立即同步 */}
          <ActionButton
            icon={RefreshCwIcon}
            iconColor={colors.primary}
            label={isSyncing ? t('syncing') : t('syncNow')}
            onPress={handleSync}
            disabled={isSyncing}
            colors={colors}
            isDark={isDark}
          />

          <Separator isDark={isDark} indent={48} />

          {/* 同步设置 */}
          <ActionButton
            icon={SettingsIcon}
            iconColor={colors.textSecondary}
            label={t('syncSettings')}
            onPress={handleOpenSettings}
            colors={colors}
            isDark={isDark}
          />

          <Separator isDark={isDark} indent={48} />

          {/* 新建工作区 */}
          <ActionButton
            icon={PlusIcon}
            iconColor={colors.textSecondary}
            label={t('newWorkspace')}
            onPress={handleCreateVault}
            disabled={isOperating}
            colors={colors}
            isDark={isDark}
          />
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

// ── 导出组件（带错误边界） ───────────────────────────────────────

export function WorkspaceSheet(props: WorkspaceSheetProps) {
  return (
    <WorkspaceSheetErrorBoundary>
      <WorkspaceSheetContent {...props} />
    </WorkspaceSheetErrorBoundary>
  );
}

// 类型导出
export type { WorkspaceSheetProps } from './const';
