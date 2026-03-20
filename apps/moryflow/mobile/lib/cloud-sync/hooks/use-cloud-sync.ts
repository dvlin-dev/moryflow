/**
 * [PROVIDES]: useCloudSync - Cloud Sync React Hook
 * [DEPENDS]: sync-engine
 * [POS]: 供 React 组件使用的 Cloud Sync Hook
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useSyncEngineStore, cloudSyncEngine } from '../sync-engine';
import {
  MOBILE_CLOUD_SYNC_SUPPORTED,
  createDefaultSettings,
  type SyncStatusSnapshot,
  type CloudSyncSettings,
} from '../const';

const unsupportedSettings = createDefaultSettings();

/**
 * Cloud Sync Hook
 * 提供同步状态和控制方法
 */
export function useCloudSync() {
  const status = useSyncEngineStore((state) => state.status);
  const vaultId = useSyncEngineStore((state) => state.vaultId);
  const vaultName = useSyncEngineStore((state) => state.vaultName);
  const lastSyncAt = useSyncEngineStore((state) => state.lastSyncAt);
  const error = useSyncEngineStore((state) => state.error);
  const pendingCount = useSyncEngineStore((state) => state.pendingCount);
  const notice = useSyncEngineStore((state) => state.notice);
  const settings = useSyncEngineStore((state) => state.settings);

  const snapshot: SyncStatusSnapshot = {
    status,
    vaultId,
    vaultName,
    lastSyncAt,
    error,
    pendingCount,
    notice,
  };

  const triggerSync = useCallback(() => {
    cloudSyncEngine.triggerSync();
  }, []);

  const updateSettings = useCallback(async (updates: Partial<CloudSyncSettings>) => {
    await cloudSyncEngine.updateSettings(updates);
  }, []);

  const handleFileChange = useCallback(() => {
    cloudSyncEngine.handleFileChange();
  }, []);

  return {
    // 状态
    ...(MOBILE_CLOUD_SYNC_SUPPORTED
      ? snapshot
      : {
          status: 'disabled' as const,
          vaultId: null,
          vaultName: null,
          lastSyncAt: null,
          error: null,
          pendingCount: 0,
          notice: null,
        }),
    settings: MOBILE_CLOUD_SYNC_SUPPORTED ? settings : unsupportedSettings,
    isSupported: MOBILE_CLOUD_SYNC_SUPPORTED,

    // 派生状态
    isSyncing: MOBILE_CLOUD_SYNC_SUPPORTED && status === 'syncing',
    isEnabled: MOBILE_CLOUD_SYNC_SUPPORTED && status !== 'disabled',
    isOnline: !MOBILE_CLOUD_SYNC_SUPPORTED || status !== 'offline',
    hasError: MOBILE_CLOUD_SYNC_SUPPORTED && !!error,

    // 方法
    triggerSync: MOBILE_CLOUD_SYNC_SUPPORTED ? triggerSync : () => undefined,
    updateSettings: MOBILE_CLOUD_SYNC_SUPPORTED ? updateSettings : async () => undefined,
    handleFileChange: MOBILE_CLOUD_SYNC_SUPPORTED ? handleFileChange : () => undefined,
  };
}

/**
 * 初始化 Cloud Sync
 * 在 App 启动或 Vault 打开时调用
 * 自动监听 App 前台/后台切换
 */
export function useCloudSyncInit(vaultPath: string | null) {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!MOBILE_CLOUD_SYNC_SUPPORTED) {
      return;
    }
    if (vaultPath) {
      cloudSyncEngine.init(vaultPath);
    }

    return () => {
      cloudSyncEngine.stop();
    };
  }, [vaultPath]);

  // App 前台切换时触发同步
  useEffect(() => {
    if (!MOBILE_CLOUD_SYNC_SUPPORTED) {
      return;
    }
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // 从后台切到前台时触发同步
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        cloudSyncEngine.triggerSync();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
