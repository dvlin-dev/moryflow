/**
 * [PROVIDES]: Browser Playground API 聚合导出（Session/Observability/Storage）
 * [DEPENDS]: browser-session-api / browser-observability-api / browser-storage-api
 * [POS]: Agent Browser Playground 浏览器域 API 统一入口
 */

export {
  closeBrowserSession,
  closeBrowserTab,
  closeBrowserWindow,
  connectBrowserCdp,
  createBrowserSession,
  createBrowserTab,
  createBrowserWindow,
  executeBrowserAction,
  executeBrowserActionBatch,
  getBrowserDeltaSnapshot,
  getBrowserScreenshot,
  getBrowserSessionStatus,
  getBrowserSnapshot,
  getDialogHistory,
  listBrowserTabs,
  listBrowserWindows,
  openBrowserUrl,
  switchBrowserTab,
  switchBrowserWindow,
} from './browser-session-api';

export {
  addInterceptRule,
  clearBrowserConsoleMessages,
  clearBrowserHeaders,
  clearBrowserPageErrors,
  clearInterceptRules,
  clearNetworkHistory,
  getBrowserConsoleMessages,
  getBrowserDetectionRisk,
  getBrowserPageErrors,
  getInterceptRules,
  getNetworkHistory,
  removeInterceptRule,
  setBrowserHeaders,
  setInterceptRules,
  startBrowserHar,
  startBrowserTrace,
  stopBrowserHar,
  stopBrowserTrace,
} from './browser-observability-api';

export {
  clearBrowserStorage,
  createBrowserStreamToken,
  exportBrowserStorage,
  importBrowserStorage,
  loadBrowserProfile,
  saveBrowserProfile,
} from './browser-storage-api';
