import path from 'node:path';
import type { IpcMainLike } from './types.js';

export const registerCloudSyncIpcHandlers = (input: {
  ipcMain: IpcMainLike;
  deps: {
    membershipBridge: unknown;
    getActiveVaultInfo: () => Promise<any>;
    fetchCurrentUserId: () => Promise<string | null>;
    ensureWorkspaceIdentity: (vaultPath: string) => Promise<{ clientWorkspaceId: string }>;
    workspaceProfileService: {
      saveProfile: (userId: string, clientWorkspaceId: string, profile: any) => void;
    };
    workspaceProfileApi: unknown;
    readDeviceConfig: () => { deviceId: string; deviceName: string };
    writeDeviceConfig: (config: { deviceId: string; deviceName: string }) => void;
    resolveActiveWorkspaceProfileContext: (...args: any[]) => Promise<any>;
    resolveWorkspaceProfileContextForWorkspace: (...args: any[]) => Promise<any>;
    cloudSyncEngine: {
      reinit: () => Promise<void>;
      getStatus: () => unknown;
      getStatusDetail: () => unknown;
      triggerSync: () => void;
    };
    cloudSyncApi: {
      registerDevice: (...args: any[]) => Promise<unknown>;
      listVaults?: () => Promise<unknown>;
      getUsage?: () => Promise<unknown>;
    };
    ensureActiveVaultReady: (vaultPath: string) => Promise<void>;
    isSameResolvedPath: (left: string, right: string) => boolean;
    listCloudVaultsIpc: (api: any) => Promise<unknown>;
    getCloudSyncUsageIpc: (api: any) => Promise<unknown>;
  };
}) => {
  const { ipcMain, deps } = input;

  const workspaceProfileContextDeps = {
    membership: deps.membershipBridge,
    vault: {
      getActiveVaultInfo: deps.getActiveVaultInfo,
    },
    user: {
      fetchCurrentUserId: deps.fetchCurrentUserId,
    },
    workspaceMeta: {
      ensureWorkspaceIdentity: deps.ensureWorkspaceIdentity,
    },
    profileService: deps.workspaceProfileService,
    api: deps.workspaceProfileApi,
  } as const;

  const toCloudSyncSettings = async () => {
    const deviceConfig = deps.readDeviceConfig();
    const context = await deps.resolveActiveWorkspaceProfileContext(
      {},
      workspaceProfileContextDeps
    );
    return {
      syncEnabled: context.profile?.syncEnabled ?? false,
      deviceId: deviceConfig.deviceId,
      deviceName: deviceConfig.deviceName,
    };
  };

  const toBindingForWorkspace = async (localPath: string) => {
    const context = await deps.resolveWorkspaceProfileContextForWorkspace(
      {
        id: localPath,
        name: path.basename(localPath),
        path: localPath,
        addedAt: 0,
      },
      {},
      workspaceProfileContextDeps
    );
    if (!context.userId || !context.profile?.syncEnabled || !context.profile.syncVaultId) {
      return null;
    }
    return {
      localPath,
      vaultId: context.profile.syncVaultId,
      vaultName: path.basename(localPath),
      boundAt: Date.now(),
      userId: context.userId,
    };
  };

  ipcMain.handle('cloud-sync:getSettings', async () => toCloudSyncSettings());
  ipcMain.handle('cloud-sync:updateSettings', async (_event, payload) => {
    const deviceConfig = deps.readDeviceConfig();
    const nextDeviceConfig = {
      deviceId:
        typeof payload?.deviceId === 'string' && payload.deviceId.trim().length > 0
          ? payload.deviceId
          : deviceConfig.deviceId,
      deviceName:
        typeof payload?.deviceName === 'string' && payload.deviceName.trim().length > 0
          ? payload.deviceName
          : deviceConfig.deviceName,
    };
    if (
      nextDeviceConfig.deviceId !== deviceConfig.deviceId ||
      nextDeviceConfig.deviceName !== deviceConfig.deviceName
    ) {
      deps.writeDeviceConfig(nextDeviceConfig);
    }

    if (typeof payload?.syncEnabled === 'boolean') {
      const context = await deps.resolveActiveWorkspaceProfileContext(
        {
          syncRequested: payload.syncEnabled,
          forceRemote: payload.syncEnabled,
        },
        workspaceProfileContextDeps
      );
      if (!payload.syncEnabled && context.userId && context.identity && context.profile) {
        deps.workspaceProfileService.saveProfile(
          context.userId,
          context.identity.clientWorkspaceId,
          {
            ...context.profile,
            syncEnabled: false,
            lastResolvedAt: new Date().toISOString(),
          }
        );
      }
      await deps.cloudSyncEngine.reinit();
    }

    return toCloudSyncSettings();
  });
  ipcMain.handle('cloud-sync:getBinding', async (_event, payload) => {
    const localPath = typeof payload?.localPath === 'string' ? payload.localPath : '';
    if (!localPath) return null;
    return toBindingForWorkspace(localPath);
  });
  ipcMain.handle('cloud-sync:bindVault', async (_event, payload) => {
    const localPath = typeof payload?.localPath === 'string' ? payload.localPath : '';
    if (!localPath) {
      throw new Error('localPath is required');
    }

    const context = await deps.resolveWorkspaceProfileContextForWorkspace(
      {
        id: localPath,
        name:
          typeof payload?.vaultName === 'string' && payload.vaultName.trim().length > 0
            ? payload.vaultName
            : path.basename(localPath),
        path: localPath,
        addedAt: 0,
      },
      {
        syncRequested: true,
        forceRemote: true,
      },
      workspaceProfileContextDeps
    );
    if (!context.userId || !context.profile?.syncVaultId) {
      throw new Error('Cannot resolve sync workspace profile');
    }

    const deviceConfig = deps.readDeviceConfig();
    await deps.cloudSyncApi.registerDevice(
      context.profile.syncVaultId,
      deviceConfig.deviceId,
      deviceConfig.deviceName
    );

    const binding = {
      localPath,
      vaultId: context.profile.syncVaultId,
      vaultName: path.basename(localPath),
      boundAt: Date.now(),
      userId: context.userId,
    };

    const activeVault = await deps.getActiveVaultInfo();
    if (activeVault && deps.isSameResolvedPath(activeVault.path, localPath)) {
      await deps.ensureActiveVaultReady(localPath);
    } else {
      await deps.cloudSyncEngine.reinit();
    }

    return binding;
  });
  ipcMain.handle('cloud-sync:unbindVault', async (_event, payload) => {
    const localPath = typeof payload?.localPath === 'string' ? payload.localPath : '';
    if (!localPath) return;

    const context = await deps.resolveWorkspaceProfileContextForWorkspace(
      {
        id: localPath,
        name: path.basename(localPath),
        path: localPath,
        addedAt: 0,
      },
      {},
      workspaceProfileContextDeps
    );
    if (context.userId && context.identity && context.profile) {
      deps.workspaceProfileService.saveProfile(context.userId, context.identity.clientWorkspaceId, {
        ...context.profile,
        syncEnabled: false,
        lastResolvedAt: new Date().toISOString(),
      });
    }
    await deps.cloudSyncEngine.reinit();
  });
  ipcMain.handle('cloud-sync:listCloudVaults', async () =>
    deps.listCloudVaultsIpc(deps.cloudSyncApi)
  );
  ipcMain.handle('cloud-sync:getStatus', () => deps.cloudSyncEngine.getStatus());
  ipcMain.handle('cloud-sync:getStatusDetail', () => deps.cloudSyncEngine.getStatusDetail());
  ipcMain.handle('cloud-sync:triggerSync', () => {
    deps.cloudSyncEngine.triggerSync();
  });
  ipcMain.handle('cloud-sync:getUsage', async () => deps.getCloudSyncUsageIpc(deps.cloudSyncApi));
};
