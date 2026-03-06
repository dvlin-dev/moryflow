/**
 * [PROVIDES]: useBrowserSessionOperationActions - BrowserSession 全量操作 handlers（按域组合）
 * [DEPENDS]: open-actions / tab-window-actions / observability-actions / data-actions
 * [POS]: BrowserSession 操作编排聚合层
 */

import type { UseBrowserSessionOperationActionsArgs } from './browser-session-operation-actions.types';
import { useBrowserSessionDataActions } from './use-browser-session-data-actions';
import { useBrowserSessionObservabilityActions } from './use-browser-session-observability-actions';
import { useBrowserSessionOpenActions } from './use-browser-session-open-actions';
import { useBrowserSessionTabWindowActions } from './use-browser-session-tab-window-actions';

export function useBrowserSessionOperationActions(args: UseBrowserSessionOperationActionsArgs) {
  const openActions = useBrowserSessionOpenActions(args);
  const tabWindowActions = useBrowserSessionTabWindowActions(args);
  const observabilityActions = useBrowserSessionObservabilityActions(args);
  const dataActions = useBrowserSessionDataActions(args);

  return {
    ...openActions,
    ...tabWindowActions,
    ...observabilityActions,
    ...dataActions,
  };
}
