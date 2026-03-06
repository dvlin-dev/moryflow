/**
 * [DEFINES]: UseBrowserSessionOperationActionsArgs
 * [USED_BY]: use-browser-session-operation-actions 及其按域拆分 hooks
 * [POS]: BrowserSessionPanel 操作编排参数类型边界
 */

import type { UseFormReturn } from 'react-hook-form';
import type {
  BrowserActionBatchResponse,
  BrowserActionResponse,
  BrowserConsoleMessage,
  BrowserDeltaSnapshotResponse,
  BrowserDetectionRiskSummary,
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
  BrowserStreamTokenResult,
  BrowserTabInfo,
  BrowserTraceStopResult,
  BrowserWindowInfo,
} from '../types';
import type {
  BrowserActionBatchValues,
  BrowserActionValues,
  BrowserHeadersValues,
  BrowserInterceptValues,
  BrowserOpenValues,
  BrowserProfileValues,
  BrowserSessionValues,
  BrowserStorageValues,
  BrowserWindowsValues,
} from '../schemas';

export interface UseBrowserSessionOperationActionsArgs {
  apiKey: string;
  requireSession: () => string | null;
  sessionForm: UseFormReturn<BrowserSessionValues>;
  openForm: UseFormReturn<BrowserOpenValues>;
  actionForm: UseFormReturn<BrowserActionValues>;
  actionBatchForm: UseFormReturn<BrowserActionBatchValues>;
  windowsForm: UseFormReturn<BrowserWindowsValues>;
  interceptForm: UseFormReturn<BrowserInterceptValues>;
  headersForm: UseFormReturn<BrowserHeadersValues>;
  storageForm: UseFormReturn<BrowserStorageValues>;
  profileForm: UseFormReturn<BrowserProfileValues>;
  setOpenResult: (value: BrowserOpenResponse | null) => void;
  setSnapshot: (value: BrowserSnapshotResponse | null) => void;
  setDeltaSnapshot: (value: BrowserDeltaSnapshotResponse | null) => void;
  setActionResult: (value: BrowserActionResponse | null) => void;
  setActionBatchResult: (value: BrowserActionBatchResponse | null) => void;
  setScreenshot: (value: BrowserScreenshotResponse | null) => void;
  setTabs: (value: BrowserTabInfo[] | null) => void;
  setWindows: (value: BrowserWindowInfo[] | null) => void;
  setDialogHistory: (value: unknown[]) => void;
  setInterceptRulesState: (value: unknown[] | null) => void;
  setHeadersResult: (value: BrowserHeadersResult | null) => void;
  setNetworkHistory: (value: BrowserNetworkRequestRecord[] | null) => void;
  setConsoleMessages: (value: BrowserConsoleMessage[] | null) => void;
  setPageErrors: (value: BrowserPageError[] | null) => void;
  setDetectionRisk: (value: BrowserDetectionRiskSummary | null) => void;
  setTraceResult: (value: BrowserTraceStopResult | null) => void;
  setHarResult: (value: BrowserHarStopResult | null) => void;
  setStorageExport: (value: BrowserStorageExportResult | null) => void;
  setProfileSaveResult: (value: BrowserProfileSaveResult | null) => void;
  setProfileLoadResult: (value: BrowserProfileLoadResult | null) => void;
  setStreamToken: (value: BrowserStreamTokenResult | null) => void;
  setStreamError: (value: string | null) => void;
  setCdpSession: (value: BrowserSessionInfo | null) => void;
  resetStream: () => void;
}
