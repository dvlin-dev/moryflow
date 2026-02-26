/**
 * [PROVIDES]: useBrowserSessionPanelResults - BrowserSessionPanel 结果状态容器
 * [DEPENDS]: agent-browser-playground/types
 * [POS]: BrowserSessionPanel 结果数据管理与会话关闭重置
 */

import { useCallback, useState } from 'react';
import type {
  BrowserActionBatchResponse,
  BrowserActionResponse,
  BrowserConsoleMessage,
  BrowserDetectionRiskSummary,
  BrowserDeltaSnapshotResponse,
  BrowserHarStopResult,
  BrowserHeadersResult,
  BrowserNetworkRequestRecord,
  BrowserOpenResponse,
  BrowserPageError,
  BrowserProfileLoadResult,
  BrowserProfileSaveResult,
  BrowserScreenshotResponse,
  BrowserSessionInfo,
  BrowserSnapshotResponse,
  BrowserStorageExportResult,
  BrowserTabInfo,
  BrowserTraceStopResult,
  BrowserWindowInfo,
} from '../types';

export function useBrowserSessionPanelResults() {
  const [sessionInfo, setSessionInfo] = useState<BrowserSessionInfo | null>(null);
  const [openResult, setOpenResult] = useState<BrowserOpenResponse | null>(null);
  const [snapshot, setSnapshot] = useState<BrowserSnapshotResponse | null>(null);
  const [deltaSnapshot, setDeltaSnapshot] = useState<BrowserDeltaSnapshotResponse | null>(null);
  const [actionResult, setActionResult] = useState<BrowserActionResponse | null>(null);
  const [actionBatchResult, setActionBatchResult] = useState<BrowserActionBatchResponse | null>(null);
  const [screenshot, setScreenshot] = useState<BrowserScreenshotResponse | null>(null);
  const [tabs, setTabs] = useState<BrowserTabInfo[] | null>(null);
  const [windows, setWindows] = useState<BrowserWindowInfo[] | null>(null);
  const [dialogHistory, setDialogHistory] = useState<unknown[]>([]);
  const [interceptRules, setInterceptRulesState] = useState<unknown[] | null>(null);
  const [headersResult, setHeadersResult] = useState<BrowserHeadersResult | null>(null);
  const [networkHistory, setNetworkHistory] = useState<BrowserNetworkRequestRecord[] | null>(null);
  const [consoleMessages, setConsoleMessages] = useState<BrowserConsoleMessage[] | null>(null);
  const [pageErrors, setPageErrors] = useState<BrowserPageError[] | null>(null);
  const [detectionRisk, setDetectionRisk] = useState<BrowserDetectionRiskSummary | null>(null);
  const [traceResult, setTraceResult] = useState<BrowserTraceStopResult | null>(null);
  const [harResult, setHarResult] = useState<BrowserHarStopResult | null>(null);
  const [storageExport, setStorageExport] = useState<BrowserStorageExportResult | null>(null);
  const [profileSaveResult, setProfileSaveResult] = useState<BrowserProfileSaveResult | null>(null);
  const [profileLoadResult, setProfileLoadResult] = useState<BrowserProfileLoadResult | null>(null);
  const [cdpSession, setCdpSession] = useState<BrowserSessionInfo | null>(null);

  const resetSessionBoundResults = useCallback(() => {
    setSessionInfo(null);
    setOpenResult(null);
    setSnapshot(null);
    setDeltaSnapshot(null);
    setActionResult(null);
    setActionBatchResult(null);
    setScreenshot(null);
    setTabs(null);
    setWindows(null);
    setDialogHistory([]);
    setInterceptRulesState(null);
    setHeadersResult(null);
    setNetworkHistory(null);
    setConsoleMessages(null);
    setPageErrors(null);
    setDetectionRisk(null);
    setTraceResult(null);
    setHarResult(null);
    setStorageExport(null);
    setProfileSaveResult(null);
    setProfileLoadResult(null);
  }, []);

  return {
    sessionInfo,
    setSessionInfo,
    openResult,
    setOpenResult,
    snapshot,
    setSnapshot,
    deltaSnapshot,
    setDeltaSnapshot,
    actionResult,
    setActionResult,
    actionBatchResult,
    setActionBatchResult,
    screenshot,
    setScreenshot,
    tabs,
    setTabs,
    windows,
    setWindows,
    dialogHistory,
    setDialogHistory,
    interceptRules,
    setInterceptRulesState,
    headersResult,
    setHeadersResult,
    networkHistory,
    setNetworkHistory,
    consoleMessages,
    setConsoleMessages,
    pageErrors,
    setPageErrors,
    detectionRisk,
    setDetectionRisk,
    traceResult,
    setTraceResult,
    harResult,
    setHarResult,
    storageExport,
    setStorageExport,
    profileSaveResult,
    setProfileSaveResult,
    profileLoadResult,
    setProfileLoadResult,
    cdpSession,
    setCdpSession,
    resetSessionBoundResults,
  };
}
