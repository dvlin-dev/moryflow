import path from 'node:path';
import { membershipBridge } from '../../membership/bridge.js';
import { cloudSyncEngine, cloudSyncApi } from '../../cloud-sync/index.js';
import { fetchCurrentUserId } from '../../cloud-sync/user-info.js';
import { ensureWorkspaceIdentity } from '../../workspace-meta/identity.js';
import { readDeviceConfig, writeDeviceConfig } from '../../device-config/store.js';
import { workspaceProfileService } from '../../workspace-profile/service.js';
import { workspaceProfileApi } from '../../workspace-profile/api/client.js';
import {
  resolveActiveWorkspaceProfileContext,
  resolveWorkspaceProfileContextForWorkspace,
} from '../../workspace-profile/context.js';
import { getActiveVaultInfo } from '../../vault/index.js';
import { getCloudSyncUsageIpc, listCloudVaultsIpc } from './cloud-sync.js';
import { type IpcMainLike, asObjectRecord } from './shared.js';

const isSameResolvedPath = (left: string, right: string): boolean =>
  path.resolve(left) === path.resolve(right);

type RegisterCloudSyncIpcDeps = {
  ensureActiveVaultReady: (vaultPath: string) => Promise<void>;
};

export const registerCloudSyncIpcHandlers = (
  ipcMain: IpcMainLike,
  deps: RegisterCloudSyncIpcDeps
): void => {
  const workspaceProfileContextDeps = {
    membership: membershipBridge,
    vault: {
      getActiveVaultInfo,
    },
    user: {
      fetchCurrentUserId,
    },
    workspaceMeta: {
      ensureWorkspaceIdentity,
    },
    profileService: workspaceProfileService,
    api: workspaceProfileApi,
  } as const;

  const toCloudSyncSettings = async () => {
    const deviceConfig = readDeviceConfig();
    const context = await resolveActiveWorkspaceProfileContext({}, workspaceProfileContextDeps);
    return {
      syncEnabled: context.profile?.syncEnabled ?? false,
      deviceId: deviceConfig.deviceId,
      deviceName: deviceConfig.deviceName,
    };
  };

  const toBindingForWorkspace = async (localPath: string) => {
    const context = await resolveWorkspaceProfileContextForWorkspace(
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
    const input = asObjectRecord(payload);
    const deviceConfig = readDeviceConfig();
    const nextDeviceConfig = {
      deviceId:
        typeof input.deviceId === 'string' && input.deviceId.trim().length > 0
          ? input.deviceId
          : deviceConfig.deviceId,
      deviceName:
        typeof input.deviceName === 'string' && input.deviceName.trim().length > 0
          ? input.deviceName
          : deviceConfig.deviceName,
    };
    if (
      nextDeviceConfig.deviceId !== deviceConfig.deviceId ||
      nextDeviceConfig.deviceName !== deviceConfig.deviceName
    ) {
      writeDeviceConfig(nextDeviceConfig);
    }

    if (typeof input.syncEnabled === 'boolean') {
      const context = await resolveActiveWorkspaceProfileContext(
        {
          syncRequested: input.syncEnabled,
          forceRemote: input.syncEnabled,
        },
        workspaceProfileContextDeps
      );
      if (!input.syncEnabled && context.userId && context.identity && context.profile) {
        workspaceProfileService.saveProfile(context.userId, context.identity.clientWorkspaceId, {
          ...context.profile,
          syncEnabled: false,
          lastResolvedAt: new Date().toISOString(),
        });
      }
      await cloudSyncEngine.reinit();
    }

    return toCloudSyncSettings();
  });
  ipcMain.handle('cloud-sync:getBinding', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const localPath = typeof input.localPath === 'string' ? input.localPath : '';
    if (!localPath) return null;
    return toBindingForWorkspace(localPath);
  });
  ipcMain.handle('cloud-sync:bindVault', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const localPath = typeof input.localPath === 'string' ? input.localPath : '';
    if (!localPath) {
      throw new Error('localPath is required');
    }

    const context = await resolveWorkspaceProfileContextForWorkspace(
      {
        id: localPath,
        name:
          typeof input.vaultName === 'string' && input.vaultName.trim().length > 0
            ? input.vaultName
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

    const deviceConfig = readDeviceConfig();
    await cloudSyncApi.registerDevice(
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

    const activeVault = await getActiveVaultInfo();
    if (activeVault && isSameResolvedPath(activeVault.path, localPath)) {
      await deps.ensureActiveVaultReady(localPath);
    } else {
      await cloudSyncEngine.reinit();
    }

    return binding;
  });
  ipcMain.handle('cloud-sync:unbindVault', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const localPath = typeof input.localPath === 'string' ? input.localPath : '';
    if (!localPath) return;

    const context = await resolveWorkspaceProfileContextForWorkspace(
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
      workspaceProfileService.saveProfile(context.userId, context.identity.clientWorkspaceId, {
        ...context.profile,
        syncEnabled: false,
        lastResolvedAt: new Date().toISOString(),
      });
    }
    await cloudSyncEngine.reinit();
  });
  ipcMain.handle('cloud-sync:listCloudVaults', async () => listCloudVaultsIpc(cloudSyncApi));
  ipcMain.handle('cloud-sync:getStatus', () => cloudSyncEngine.getStatus());
  ipcMain.handle('cloud-sync:getStatusDetail', () => cloudSyncEngine.getStatusDetail());
  ipcMain.handle('cloud-sync:triggerSync', () => {
    cloudSyncEngine.triggerSync();
  });
  ipcMain.handle('cloud-sync:getUsage', async () => getCloudSyncUsageIpc(cloudSyncApi));
};
