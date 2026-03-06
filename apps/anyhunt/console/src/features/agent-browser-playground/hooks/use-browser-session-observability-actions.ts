/**
 * [PROVIDES]: BrowserSession 可观测操作聚合（网络治理 + 诊断）
 * [DEPENDS]: intercept-network-actions / diagnostics-actions
 * [POS]: BrowserSession 操作编排 - 可观测域聚合层
 */

import type { UseBrowserSessionOperationActionsArgs } from './browser-session-operation-actions.types';
import { useBrowserSessionDiagnosticsActions } from './use-browser-session-diagnostics-actions';
import { useBrowserSessionInterceptNetworkActions } from './use-browser-session-intercept-network-actions';

export function useBrowserSessionObservabilityActions(args: UseBrowserSessionOperationActionsArgs) {
  const interceptNetworkActions = useBrowserSessionInterceptNetworkActions(args);
  const diagnosticsActions = useBrowserSessionDiagnosticsActions(args);

  return {
    ...interceptNetworkActions,
    ...diagnosticsActions,
  };
}
