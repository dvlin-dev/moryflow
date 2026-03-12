import type { CryptoUtils, PlatformCapabilities } from '@moryflow/agents-adapter';
import type { VaultUtils } from '@moryflow/agents-runtime';
import type { TaskStateService } from '../task/task-state';

export interface ToolsetContext {
  capabilities: PlatformCapabilities;
  crypto: CryptoUtils;
  vaultUtils: VaultUtils;
  taskStateService: TaskStateService;
  webSearchApiKey?: string;
}
