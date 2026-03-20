import { membershipBridge } from '../../../membership-bridge.js';
import { fetchCurrentUserId } from '../../../cloud-sync/user-info.js';
import { ensureWorkspaceIdentity } from '../../../workspace-meta/identity.js';
import { workspaceProfileService } from '../../../workspace-profile/service.js';
import { workspaceProfileApi } from '../../../workspace-profile/api/client.js';
import { resolveActiveWorkspaceProfileContext } from '../../../workspace-profile/context.js';
import { getActiveVaultInfo } from '../../../vault.js';
import type { MemoryIpcDeps } from './shared.js';

type CreateMemoryIpcDepsOptions = Pick<
  MemoryIpcDeps,
  'engine' | 'usage' | 'documentRegistry' | 'api'
>;

export const createMemoryIpcDeps = (options: CreateMemoryIpcDepsOptions): MemoryIpcDeps => ({
  profiles: {
    resolveActiveProfile: () =>
      resolveActiveWorkspaceProfileContext(
        {},
        {
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
        }
      ),
  },
  engine: options.engine,
  usage: options.usage,
  documentRegistry: options.documentRegistry,
  api: options.api,
});
