/**
 * [PROPS]: BrowserSessionPanelProps（sections 覆盖 actionBatch/headers/diagnostics/profile/stream）
 * [EMITS]: onSessionChange
 * [POS]: Browser Playground 操作面板（分区组件 + streaming hook）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@anyhunt/ui';
import {
  browserSessionSchema,
  browserOpenSchema,
  browserSnapshotSchema,
  browserDeltaSnapshotSchema,
  browserActionSchema,
  browserActionBatchSchema,
  browserScreenshotSchema,
  browserTabsSchema,
  browserWindowsSchema,
  browserInterceptSchema,
  browserHeadersSchema,
  browserNetworkHistorySchema,
  browserDiagnosticsLogSchema,
  browserDiagnosticsTraceSchema,
  browserDiagnosticsHarSchema,
  browserStorageSchema,
  browserProfileSchema,
  browserStreamSchema,
  browserCdpSchema,
  type BrowserSessionValues,
  type BrowserOpenValues,
  type BrowserSnapshotValues,
  type BrowserDeltaSnapshotValues,
  type BrowserActionValues,
  type BrowserActionBatchValues,
  type BrowserScreenshotValues,
  type BrowserTabsValues,
  type BrowserWindowsValues,
  type BrowserInterceptValues,
  type BrowserHeadersValues,
  type BrowserNetworkHistoryValues,
  type BrowserDiagnosticsLogValues,
  type BrowserDiagnosticsTraceValues,
  type BrowserDiagnosticsHarValues,
  type BrowserStorageValues,
  type BrowserProfileValues,
  type BrowserStreamValues,
  type BrowserCdpValues,
} from '../schemas';
import { useBrowserStream } from '../hooks/use-browser-stream';
import {
  addInterceptRule,
  clearInterceptRules,
  clearNetworkHistory,
  clearBrowserConsoleMessages,
  clearBrowserHeaders,
  clearBrowserPageErrors,
  clearBrowserStorage,
  closeBrowserSession,
  closeBrowserTab,
  closeBrowserWindow,
  connectBrowserCdp,
  createBrowserStreamToken,
  createBrowserSession,
  createBrowserTab,
  createBrowserWindow,
  executeBrowserAction,
  executeBrowserActionBatch,
  exportBrowserStorage,
  getBrowserConsoleMessages,
  getBrowserDetectionRisk,
  getBrowserDeltaSnapshot,
  getBrowserPageErrors,
  getBrowserScreenshot,
  getBrowserSessionStatus,
  getBrowserSnapshot,
  getDialogHistory,
  getInterceptRules,
  getNetworkHistory,
  importBrowserStorage,
  loadBrowserProfile,
  listBrowserTabs,
  listBrowserWindows,
  openBrowserUrl,
  removeInterceptRule,
  saveBrowserProfile,
  setBrowserHeaders,
  setInterceptRules,
  startBrowserHar,
  startBrowserTrace,
  stopBrowserHar,
  stopBrowserTrace,
  switchBrowserTab,
  switchBrowserWindow,
} from '../api';
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
import {
  ActionBatchSection,
  ActionSection,
  CdpSection,
  DeltaSnapshotSection,
  DiagnosticsSection,
  HeadersSection,
  InterceptSection,
  NetworkHistorySection,
  OpenUrlSection,
  ProfileSection,
  ScreenshotSection,
  SessionSection,
  SnapshotSection,
  StorageSection,
  StreamingSection,
  TabsSection,
  WindowsSection,
} from './browser-session-sections';

const parseJson = <T,>(value?: string): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const parseJsonArray = <T,>(value?: string): T[] | null => {
  const parsed = parseJson<unknown>(value);
  return Array.isArray(parsed) ? (parsed as T[]) : null;
};

const parseJsonObject = <T extends Record<string, unknown>>(value?: string): T | null => {
  const parsed = parseJson<unknown>(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  return parsed as T;
};

export type BrowserSessionSection =
  | 'session'
  | 'open'
  | 'snapshot'
  | 'delta'
  | 'action'
  | 'actionBatch'
  | 'screenshot'
  | 'tabs'
  | 'windows'
  | 'intercept'
  | 'headers'
  | 'network'
  | 'diagnostics'
  | 'storage'
  | 'profile'
  | 'stream'
  | 'cdp';

const defaultSections: BrowserSessionSection[] = [
  'session',
  'open',
  'snapshot',
  'delta',
  'action',
  'actionBatch',
  'screenshot',
  'tabs',
  'windows',
  'intercept',
  'headers',
  'network',
  'diagnostics',
  'storage',
  'profile',
  'stream',
  'cdp',
];

export interface BrowserSessionPanelProps {
  apiKey: string;
  sessionId?: string;
  onSessionChange?: (sessionId: string) => void;
  sections?: BrowserSessionSection[];
  title?: string;
  description?: string;
}

export function BrowserSessionPanel({
  apiKey,
  sessionId,
  onSessionChange,
  sections = defaultSections,
  title = 'Browser Session',
  description = 'Manage sessions and execute browser operations.',
}: BrowserSessionPanelProps) {
  const [sessionInfo, setSessionInfo] = useState<BrowserSessionInfo | null>(null);
  const [openResult, setOpenResult] = useState<BrowserOpenResponse | null>(null);
  const [snapshot, setSnapshot] = useState<BrowserSnapshotResponse | null>(null);
  const [deltaSnapshot, setDeltaSnapshot] = useState<BrowserDeltaSnapshotResponse | null>(null);
  const [actionResult, setActionResult] = useState<BrowserActionResponse | null>(null);
  const [actionBatchResult, setActionBatchResult] = useState<BrowserActionBatchResponse | null>(
    null
  );
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
  const {
    streamToken,
    setStreamToken,
    streamStatus,
    streamFrame,
    streamError,
    setStreamError,
    streamImageRef,
    resetStream,
    handlers: streamHandlers,
  } = useBrowserStream();
  const [cdpSession, setCdpSession] = useState<BrowserSessionInfo | null>(null);

  const [sessionOpen, setSessionOpen] = useState(true);
  const [openUrlOpen, setOpenUrlOpen] = useState(true);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [deltaSnapshotOpen, setDeltaSnapshotOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionBatchOpen, setActionBatchOpen] = useState(false);
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const [tabsOpen, setTabsOpen] = useState(false);
  const [windowsOpen, setWindowsOpen] = useState(false);
  const [interceptOpen, setInterceptOpen] = useState(false);
  const [headersOpen, setHeadersOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [streamOpen, setStreamOpen] = useState(false);
  const [cdpOpen, setCdpOpen] = useState(false);

  const sessionForm = useForm<BrowserSessionValues>({
    resolver: zodResolver(browserSessionSchema),
    defaultValues: {
      sessionId: '',
      device: '',
      userAgent: '',
      locale: '',
      timezoneId: '',
      permissionsJson: '',
      headersJson: '',
      httpUsername: '',
      httpPassword: '',
      javaScriptEnabled: true,
      ignoreHTTPSErrors: true,
      offline: false,
      acceptDownloads: true,
      recordVideoEnabled: false,
    },
  });

  useEffect(() => {
    if (sessionId === undefined) return;
    const current = sessionForm.getValues('sessionId');
    if (sessionId !== current) {
      sessionForm.setValue('sessionId', sessionId);
    }
  }, [sessionId, sessionForm]);

  const openForm = useForm<BrowserOpenValues>({
    resolver: zodResolver(browserOpenSchema),
    defaultValues: { url: '', waitUntil: 'domcontentloaded', headersJson: '' },
  });

  const snapshotForm = useForm<BrowserSnapshotValues>({
    resolver: zodResolver(browserSnapshotSchema),
    defaultValues: { interactive: true, compact: false },
  });

  const deltaSnapshotForm = useForm<BrowserDeltaSnapshotValues>({
    resolver: zodResolver(browserDeltaSnapshotSchema),
    defaultValues: { interactive: true, compact: false, delta: true },
  });

  const actionForm = useForm<BrowserActionValues>({
    resolver: zodResolver(browserActionSchema),
    defaultValues: { actionJson: '' },
  });

  const actionBatchForm = useForm<BrowserActionBatchValues>({
    resolver: zodResolver(browserActionBatchSchema),
    defaultValues: { actionsJson: '', stopOnError: true },
  });

  const screenshotForm = useForm<BrowserScreenshotValues>({
    resolver: zodResolver(browserScreenshotSchema),
    defaultValues: { format: 'png', fullPage: false },
  });

  const tabsForm = useForm<BrowserTabsValues>({
    resolver: zodResolver(browserTabsSchema),
    defaultValues: { tabIndex: undefined },
  });

  const windowsForm = useForm<BrowserWindowsValues>({
    resolver: zodResolver(browserWindowsSchema),
    defaultValues: {
      windowIndex: undefined,
      device: '',
      userAgent: '',
      locale: '',
      timezoneId: '',
      permissionsJson: '',
      headersJson: '',
      httpUsername: '',
      httpPassword: '',
      offline: false,
      acceptDownloads: true,
      recordVideoEnabled: false,
    },
  });

  const interceptForm = useForm<BrowserInterceptValues>({
    resolver: zodResolver(browserInterceptSchema),
    defaultValues: { rulesJson: '', ruleJson: '', ruleId: '' },
  });

  const headersForm = useForm<BrowserHeadersValues>({
    resolver: zodResolver(browserHeadersSchema),
    defaultValues: { origin: '', headersJson: '', clearGlobal: false },
  });

  const networkForm = useForm<BrowserNetworkHistoryValues>({
    resolver: zodResolver(browserNetworkHistorySchema),
    defaultValues: { limit: undefined, urlFilter: '' },
  });

  const diagnosticsLogForm = useForm<BrowserDiagnosticsLogValues>({
    resolver: zodResolver(browserDiagnosticsLogSchema),
    defaultValues: { limit: undefined },
  });

  const diagnosticsTraceForm = useForm<BrowserDiagnosticsTraceValues>({
    resolver: zodResolver(browserDiagnosticsTraceSchema),
    defaultValues: { screenshots: true, snapshots: true, store: true },
  });

  const diagnosticsHarForm = useForm<BrowserDiagnosticsHarValues>({
    resolver: zodResolver(browserDiagnosticsHarSchema),
    defaultValues: { clear: false, includeRequests: true },
  });

  const storageForm = useForm<BrowserStorageValues>({
    resolver: zodResolver(browserStorageSchema),
    defaultValues: { exportOptionsJson: '', importDataJson: '' },
  });

  const profileForm = useForm<BrowserProfileValues>({
    resolver: zodResolver(browserProfileSchema),
    defaultValues: { profileId: '', includeSessionStorage: false, loadProfileId: '' },
  });

  const streamForm = useForm<BrowserStreamValues>({
    resolver: zodResolver(browserStreamSchema),
    defaultValues: { expiresIn: 300 },
  });

  const cdpForm = useForm<BrowserCdpValues>({
    resolver: zodResolver(browserCdpSchema),
    defaultValues: { provider: undefined, wsEndpoint: '', port: undefined, timeout: 30000 },
  });

  const watchedSessionId = useWatch({ control: sessionForm.control, name: 'sessionId' });

  useEffect(() => {
    onSessionChange?.(watchedSessionId || '');
  }, [watchedSessionId, onSessionChange]);

  const requireSession = () => {
    const sessionId = sessionForm.getValues('sessionId')?.trim();
    if (!sessionId) {
      toast.error('Session ID is required');
      return null;
    }
    return sessionId;
  };

  const handleCreateSession = async (values: BrowserSessionValues) => {
    if (!apiKey) {
      toast.error('Select an API key first');
      return;
    }

    const permissions = parseJsonArray<string>(values.permissionsJson ?? '');
    if (values.permissionsJson && !permissions) {
      sessionForm.setError('permissionsJson', { message: 'Invalid JSON array' });
      return;
    }

    const headers = parseJsonObject<Record<string, string>>(values.headersJson ?? '');
    if (values.headersJson && !headers) {
      sessionForm.setError('headersJson', { message: 'Invalid JSON object' });
      return;
    }

    const hasGeoLat = values.geolocationLat !== undefined;
    const hasGeoLng = values.geolocationLng !== undefined;
    if ((hasGeoLat || hasGeoLng) && (!hasGeoLat || !hasGeoLng)) {
      sessionForm.setError('geolocationLat', {
        message: 'Latitude and longitude are required',
      });
      sessionForm.setError('geolocationLng', {
        message: 'Latitude and longitude are required',
      });
      return;
    }

    const hasHttpUser = Boolean(values.httpUsername);
    const hasHttpPass = Boolean(values.httpPassword);
    if (hasHttpUser !== hasHttpPass) {
      sessionForm.setError('httpUsername', { message: 'Username and password are required' });
      sessionForm.setError('httpPassword', { message: 'Username and password are required' });
      return;
    }

    const options: Record<string, unknown> = {
      timeout: values.timeout,
      device: values.device?.trim() || undefined,
      userAgent: values.userAgent?.trim() || undefined,
      javaScriptEnabled: values.javaScriptEnabled,
      ignoreHTTPSErrors: values.ignoreHTTPSErrors,
      locale: values.locale?.trim() || undefined,
      timezoneId: values.timezoneId?.trim() || undefined,
      colorScheme: values.colorScheme,
      reducedMotion: values.reducedMotion,
      offline: values.offline,
      acceptDownloads: values.acceptDownloads,
    };

    if (values.viewportWidth && values.viewportHeight) {
      options.viewport = {
        width: values.viewportWidth,
        height: values.viewportHeight,
      };
    }

    if (hasGeoLat && hasGeoLng) {
      options.geolocation = {
        latitude: values.geolocationLat as number,
        longitude: values.geolocationLng as number,
        accuracy: values.geolocationAccuracy,
      };
    }

    if (permissions) {
      options.permissions = permissions;
    }

    if (headers) {
      options.headers = headers;
    }

    if (hasHttpUser && hasHttpPass) {
      options.httpCredentials = {
        username: values.httpUsername ?? '',
        password: values.httpPassword ?? '',
      };
    }

    if (values.recordVideoEnabled) {
      options.recordVideo = {
        enabled: true,
        width: values.recordVideoWidth,
        height: values.recordVideoHeight,
      };
    }

    try {
      const session = await createBrowserSession(apiKey, options);
      sessionForm.setValue('sessionId', session.id);
      setSessionInfo(session);
      toast.success('Session created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create session');
    }
  };

  const handleStatus = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      const status = await getBrowserSessionStatus(apiKey, sessionId);
      setSessionInfo(status);
      toast.success('Session status loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch status');
    }
  };

  const handleClose = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      await closeBrowserSession(apiKey, sessionId);
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
      resetStream();
      sessionForm.setValue('sessionId', '');
      toast.success('Session closed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to close session');
    }
  };

  const handleOpenUrl = async (values: BrowserOpenValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    const headers = parseJsonObject<Record<string, string>>(values.headersJson ?? '');
    if (values.headersJson && !headers) {
      openForm.setError('headersJson', { message: 'Invalid JSON object' });
      return;
    }
    try {
      const result = await openBrowserUrl(apiKey, sessionId, {
        url: values.url,
        waitUntil: values.waitUntil,
        timeout: values.timeout,
        headers: headers ?? undefined,
      });
      setOpenResult(result);
      toast.success('URL opened');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open URL');
    }
  };

  const handleSnapshot = async (values: BrowserSnapshotValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      const result = await getBrowserSnapshot(apiKey, sessionId, values);
      setSnapshot(result);
      toast.success('Snapshot captured');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Snapshot failed');
    }
  };

  const handleDeltaSnapshot = async (values: BrowserDeltaSnapshotValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      const result = await getBrowserDeltaSnapshot(apiKey, sessionId, values);
      setDeltaSnapshot(result);
      toast.success('Delta snapshot captured');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delta snapshot failed');
    }
  };

  const handleAction = async (values: BrowserActionValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    const parsed = parseJson<Record<string, unknown>>(values.actionJson);
    if (!parsed) {
      actionForm.setError('actionJson', { message: 'Invalid JSON' });
      return;
    }
    try {
      const result = await executeBrowserAction(apiKey, sessionId, parsed);
      setActionResult(result);
      toast.success('Action executed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed');
    }
  };

  const handleActionBatch = async (values: BrowserActionBatchValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    const parsed = parseJsonArray<Record<string, unknown>>(values.actionsJson ?? '');
    if (!parsed) {
      actionBatchForm.setError('actionsJson', { message: 'Invalid JSON array' });
      return;
    }
    try {
      const result = await executeBrowserActionBatch(apiKey, sessionId, {
        actions: parsed,
        stopOnError: values.stopOnError,
      });
      setActionBatchResult(result);
      toast.success('Batch actions executed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Batch actions failed');
    }
  };

  const handleScreenshot = async (values: BrowserScreenshotValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      const result = await getBrowserScreenshot(apiKey, sessionId, values);
      setScreenshot(result);
      toast.success('Screenshot captured');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Screenshot failed');
    }
  };

  const handleCreateTab = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      await createBrowserTab(apiKey, sessionId);
      const list = await listBrowserTabs(apiKey, sessionId);
      setTabs(list);
      toast.success('Tab created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Tab creation failed');
    }
  };

  const handleListTabs = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      const list = await listBrowserTabs(apiKey, sessionId);
      setTabs(list);
      toast.success('Tabs loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load tabs');
    }
  };

  const handleSwitchTab = async (values: BrowserTabsValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey || values.tabIndex === undefined) {
      toast.error('Tab index is required');
      return;
    }
    try {
      await switchBrowserTab(apiKey, sessionId, values.tabIndex);
      await handleListTabs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to switch tab');
    }
  };

  const handleCloseTab = async (values: BrowserTabsValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey || values.tabIndex === undefined) {
      toast.error('Tab index is required');
      return;
    }
    try {
      await closeBrowserTab(apiKey, sessionId, values.tabIndex);
      await handleListTabs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to close tab');
    }
  };

  const handleCreateWindow = async (values: BrowserWindowsValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    const permissions = parseJsonArray<string>(values.permissionsJson ?? '');
    if (values.permissionsJson && !permissions) {
      windowsForm.setError('permissionsJson', { message: 'Invalid JSON array' });
      return;
    }

    const headers = parseJsonObject<Record<string, string>>(values.headersJson ?? '');
    if (values.headersJson && !headers) {
      windowsForm.setError('headersJson', { message: 'Invalid JSON object' });
      return;
    }

    const hasGeoLat = values.geolocationLat !== undefined;
    const hasGeoLng = values.geolocationLng !== undefined;
    if ((hasGeoLat || hasGeoLng) && (!hasGeoLat || !hasGeoLng)) {
      windowsForm.setError('geolocationLat', {
        message: 'Latitude and longitude are required',
      });
      windowsForm.setError('geolocationLng', {
        message: 'Latitude and longitude are required',
      });
      return;
    }

    const hasHttpUser = Boolean(values.httpUsername);
    const hasHttpPass = Boolean(values.httpPassword);
    if (hasHttpUser !== hasHttpPass) {
      windowsForm.setError('httpUsername', { message: 'Username and password are required' });
      windowsForm.setError('httpPassword', { message: 'Username and password are required' });
      return;
    }

    const options: Record<string, unknown> = {};
    if (values.viewportWidth && values.viewportHeight) {
      options.viewport = {
        width: values.viewportWidth,
        height: values.viewportHeight,
      };
    }
    if (values.device?.trim()) {
      options.device = values.device.trim();
    }
    if (values.userAgent?.trim()) {
      options.userAgent = values.userAgent.trim();
    }
    if (values.locale?.trim()) {
      options.locale = values.locale.trim();
    }
    if (values.timezoneId?.trim()) {
      options.timezoneId = values.timezoneId.trim();
    }
    if (values.colorScheme) {
      options.colorScheme = values.colorScheme;
    }
    if (values.reducedMotion) {
      options.reducedMotion = values.reducedMotion;
    }
    options.offline = values.offline;
    options.acceptDownloads = values.acceptDownloads;
    if (permissions) {
      options.permissions = permissions;
    }
    if (headers) {
      options.headers = headers;
    }
    if (hasGeoLat && hasGeoLng) {
      options.geolocation = {
        latitude: values.geolocationLat as number,
        longitude: values.geolocationLng as number,
        accuracy: values.geolocationAccuracy,
      };
    }
    if (hasHttpUser && hasHttpPass) {
      options.httpCredentials = {
        username: values.httpUsername ?? '',
        password: values.httpPassword ?? '',
      };
    }
    if (values.recordVideoEnabled) {
      options.recordVideo = {
        enabled: true,
        width: values.recordVideoWidth,
        height: values.recordVideoHeight,
      };
    }
    try {
      await createBrowserWindow(apiKey, sessionId, options);
      const list = await listBrowserWindows(apiKey, sessionId);
      setWindows(list);
      toast.success('Window created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Window creation failed');
    }
  };

  const handleListWindows = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      const list = await listBrowserWindows(apiKey, sessionId);
      setWindows(list);
      toast.success('Windows loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load windows');
    }
  };

  const handleSwitchWindow = async (values: BrowserWindowsValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey || values.windowIndex === undefined) {
      toast.error('Window index is required');
      return;
    }
    try {
      await switchBrowserWindow(apiKey, sessionId, values.windowIndex);
      await handleListWindows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to switch window');
    }
  };

  const handleCloseWindow = async (values: BrowserWindowsValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey || values.windowIndex === undefined) {
      toast.error('Window index is required');
      return;
    }
    try {
      await closeBrowserWindow(apiKey, sessionId, values.windowIndex);
      await handleListWindows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to close window');
    }
  };

  const handleDialogHistory = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      const history = await getDialogHistory(apiKey, sessionId);
      setDialogHistory(history);
      toast.success('Dialog history loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load dialog history');
    }
  };

  const handleSetRules = async (values: BrowserInterceptValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    const parsed = parseJson<unknown[]>(values.rulesJson ?? '');
    if (!parsed) {
      interceptForm.setError('rulesJson', { message: 'Invalid JSON' });
      return;
    }
    try {
      await setInterceptRules(apiKey, sessionId, parsed);
      const list = await getInterceptRules(apiKey, sessionId);
      setInterceptRulesState(list);
      toast.success('Rules updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to set rules');
    }
  };

  const handleAddRule = async (values: BrowserInterceptValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    const parsed = parseJson<Record<string, unknown>>(values.ruleJson ?? '');
    if (!parsed) {
      interceptForm.setError('ruleJson', { message: 'Invalid JSON' });
      return;
    }
    try {
      await addInterceptRule(apiKey, sessionId, parsed);
      const list = await getInterceptRules(apiKey, sessionId);
      setInterceptRulesState(list);
      toast.success('Rule added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add rule');
    }
  };

  const handleRemoveRule = async (values: BrowserInterceptValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey || !values.ruleId) {
      toast.error('Rule ID is required');
      return;
    }
    try {
      await removeInterceptRule(apiKey, sessionId, values.ruleId);
      const list = await getInterceptRules(apiKey, sessionId);
      setInterceptRulesState(list);
      toast.success('Rule removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove rule');
    }
  };

  const handleClearRules = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      await clearInterceptRules(apiKey, sessionId);
      setInterceptRulesState([]);
      toast.success('Rules cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear rules');
    }
  };

  const handleListRules = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      const list = await getInterceptRules(apiKey, sessionId);
      setInterceptRulesState(list);
      toast.success('Rules loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load rules');
    }
  };

  const handleSetHeaders = async (values: BrowserHeadersValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    const headers = parseJsonObject<Record<string, string>>(values.headersJson ?? '');
    if (!headers) {
      headersForm.setError('headersJson', { message: 'Invalid JSON object' });
      return;
    }
    try {
      const result = await setBrowserHeaders(apiKey, sessionId, {
        origin: values.origin?.trim() || undefined,
        headers,
      });
      setHeadersResult(result);
      toast.success('Headers updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to set headers');
    }
  };

  const handleClearHeaders = async (values: BrowserHeadersValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    if (!values.clearGlobal && !values.origin?.trim()) {
      toast.error('Specify an origin or enable clear global');
      return;
    }
    try {
      await clearBrowserHeaders(apiKey, sessionId, {
        origin: values.origin?.trim() || undefined,
        clearGlobal: values.clearGlobal || undefined,
      });
      setHeadersResult(null);
      toast.success('Headers cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear headers');
    }
  };

  const handleNetworkHistory = async (values: BrowserNetworkHistoryValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      const list = await getNetworkHistory(apiKey, sessionId, values);
      setNetworkHistory(list);
      toast.success('Network history loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load history');
    }
  };

  const handleClearNetworkHistory = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      await clearNetworkHistory(apiKey, sessionId);
      setNetworkHistory([]);
      toast.success('Network history cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear history');
    }
  };

  const handleFetchConsoleMessages = async (values: BrowserDiagnosticsLogValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      const list = await getBrowserConsoleMessages(apiKey, sessionId, values);
      setConsoleMessages(list);
      toast.success('Console messages loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load console messages');
    }
  };

  const handleClearConsoleMessages = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      await clearBrowserConsoleMessages(apiKey, sessionId);
      setConsoleMessages([]);
      toast.success('Console messages cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear console messages');
    }
  };

  const handleFetchPageErrors = async (values: BrowserDiagnosticsLogValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      const list = await getBrowserPageErrors(apiKey, sessionId, values);
      setPageErrors(list);
      toast.success('Page errors loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load page errors');
    }
  };

  const handleClearPageErrors = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      await clearBrowserPageErrors(apiKey, sessionId);
      setPageErrors([]);
      toast.success('Page errors cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear page errors');
    }
  };

  const handleFetchDetectionRisk = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      const summary = await getBrowserDetectionRisk(apiKey, sessionId);
      setDetectionRisk(summary);
      toast.success('Detection risk loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load detection risk');
    }
  };

  const handleStartTrace = async (values: BrowserDiagnosticsTraceValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      await startBrowserTrace(apiKey, sessionId, {
        screenshots: values.screenshots,
        snapshots: values.snapshots,
      });
      toast.success('Tracing started');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start tracing');
    }
  };

  const handleStopTrace = async (values: BrowserDiagnosticsTraceValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      const result = await stopBrowserTrace(apiKey, sessionId, { store: values.store });
      setTraceResult(result);
      toast.success('Tracing stopped');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to stop tracing');
    }
  };

  const handleStartHar = async (values: BrowserDiagnosticsHarValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      await startBrowserHar(apiKey, sessionId, { clear: values.clear });
      toast.success('HAR recording started');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start HAR recording');
    }
  };

  const handleStopHar = async (values: BrowserDiagnosticsHarValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      const result = await stopBrowserHar(apiKey, sessionId, {
        includeRequests: values.includeRequests,
      });
      setHarResult(result);
      toast.success('HAR recording stopped');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to stop HAR recording');
    }
  };

  const handleExportStorage = async (values: BrowserStorageValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    const parsed = parseJson<Record<string, unknown>>(values.exportOptionsJson ?? '');
    try {
      const result = await exportBrowserStorage(apiKey, sessionId, parsed ?? {});
      setStorageExport(result);
      toast.success('Storage exported');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Storage export failed');
    }
  };

  const handleImportStorage = async (values: BrowserStorageValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    const parsed = parseJson<Record<string, unknown>>(values.importDataJson ?? '');
    if (!parsed) {
      storageForm.setError('importDataJson', { message: 'Invalid JSON' });
      return;
    }
    try {
      await importBrowserStorage(apiKey, sessionId, parsed);
      toast.success('Storage imported');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Storage import failed');
    }
  };

  const handleClearStorage = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      await clearBrowserStorage(apiKey, sessionId);
      toast.success('Storage cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Storage clear failed');
    }
  };

  const handleSaveProfile = async (values: BrowserProfileValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      const result = await saveBrowserProfile(apiKey, sessionId, {
        profileId: values.profileId?.trim() || undefined,
        includeSessionStorage: values.includeSessionStorage,
      });
      setProfileSaveResult(result);
      toast.success('Profile saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Profile save failed');
    }
  };

  const handleLoadProfile = async (values: BrowserProfileValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    if (!values.loadProfileId?.trim()) {
      profileForm.setError('loadProfileId', { message: 'Profile ID is required' });
      return;
    }
    try {
      const result = await loadBrowserProfile(apiKey, sessionId, {
        profileId: values.loadProfileId.trim(),
      });
      setProfileLoadResult(result);
      toast.success('Profile loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Profile load failed');
    }
  };

  const handleCreateStreamToken = async (values: BrowserStreamValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;
    try {
      const tokenResult = await createBrowserStreamToken(apiKey, sessionId, values);
      setStreamToken(tokenResult);
      setStreamError(null);
      toast.success('Stream token created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Stream token creation failed');
    }
  };

  const handleDisconnectStream = () => {
    resetStream();
    toast.success('Stream disconnected');
  };

  const handleConnectCdp = async (values: BrowserCdpValues) => {
    if (!apiKey) return;
    try {
      const result = await connectBrowserCdp(apiKey, {
        provider: values.provider,
        wsEndpoint: values.wsEndpoint?.trim() || undefined,
        port: values.port,
        timeout: values.timeout,
      });
      setCdpSession(result);
      if (result?.id) {
        sessionForm.setValue('sessionId', result.id);
      }
      toast.success('CDP session connected');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'CDP connection failed');
    }
  };

  const hasSection = (section: BrowserSessionSection) => sections.includes(section);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasSection('session') && (
          <SessionSection
            apiKey={apiKey}
            form={sessionForm}
            sessionInfo={sessionInfo}
            open={sessionOpen}
            onOpenChange={setSessionOpen}
            onCreate={handleCreateSession}
            onStatus={handleStatus}
            onClose={handleClose}
          />
        )}
        {hasSection('open') && (
          <OpenUrlSection
            apiKey={apiKey}
            form={openForm}
            open={openUrlOpen}
            onOpenChange={setOpenUrlOpen}
            onSubmit={handleOpenUrl}
            result={openResult}
          />
        )}
        {hasSection('snapshot') && (
          <SnapshotSection
            apiKey={apiKey}
            form={snapshotForm}
            open={snapshotOpen}
            onOpenChange={setSnapshotOpen}
            onSubmit={handleSnapshot}
            result={snapshot}
          />
        )}
        {hasSection('delta') && (
          <DeltaSnapshotSection
            apiKey={apiKey}
            form={deltaSnapshotForm}
            open={deltaSnapshotOpen}
            onOpenChange={setDeltaSnapshotOpen}
            onSubmit={handleDeltaSnapshot}
            result={deltaSnapshot}
          />
        )}
        {hasSection('action') && (
          <ActionSection
            apiKey={apiKey}
            form={actionForm}
            open={actionOpen}
            onOpenChange={setActionOpen}
            onSubmit={handleAction}
            result={actionResult}
          />
        )}
        {hasSection('actionBatch') && (
          <ActionBatchSection
            apiKey={apiKey}
            form={actionBatchForm}
            open={actionBatchOpen}
            onOpenChange={setActionBatchOpen}
            onSubmit={handleActionBatch}
            result={actionBatchResult}
          />
        )}
        {hasSection('screenshot') && (
          <ScreenshotSection
            apiKey={apiKey}
            form={screenshotForm}
            open={screenshotOpen}
            onOpenChange={setScreenshotOpen}
            onSubmit={handleScreenshot}
            result={screenshot}
          />
        )}
        {hasSection('tabs') && (
          <TabsSection
            apiKey={apiKey}
            form={tabsForm}
            open={tabsOpen}
            onOpenChange={setTabsOpen}
            tabs={tabs}
            dialogHistory={dialogHistory}
            onCreateTab={handleCreateTab}
            onListTabs={handleListTabs}
            onSwitchTab={handleSwitchTab}
            onCloseTab={handleCloseTab}
            onDialogHistory={handleDialogHistory}
          />
        )}
        {hasSection('windows') && (
          <WindowsSection
            apiKey={apiKey}
            form={windowsForm}
            open={windowsOpen}
            onOpenChange={setWindowsOpen}
            windows={windows}
            onCreateWindow={handleCreateWindow}
            onListWindows={handleListWindows}
            onSwitchWindow={handleSwitchWindow}
            onCloseWindow={handleCloseWindow}
          />
        )}
        {hasSection('intercept') && (
          <InterceptSection
            apiKey={apiKey}
            form={interceptForm}
            open={interceptOpen}
            onOpenChange={setInterceptOpen}
            rules={interceptRules}
            onSetRules={handleSetRules}
            onAddRule={handleAddRule}
            onRemoveRule={handleRemoveRule}
            onClearRules={handleClearRules}
            onListRules={handleListRules}
          />
        )}
        {hasSection('headers') && (
          <HeadersSection
            apiKey={apiKey}
            form={headersForm}
            open={headersOpen}
            onOpenChange={setHeadersOpen}
            result={headersResult}
            onSetHeaders={handleSetHeaders}
            onClearHeaders={handleClearHeaders}
          />
        )}
        {hasSection('network') && (
          <NetworkHistorySection
            apiKey={apiKey}
            form={networkForm}
            open={networkOpen}
            onOpenChange={setNetworkOpen}
            history={networkHistory}
            onFetch={handleNetworkHistory}
            onClear={handleClearNetworkHistory}
          />
        )}
        {hasSection('diagnostics') && (
          <DiagnosticsSection
            apiKey={apiKey}
            logForm={diagnosticsLogForm}
            traceForm={diagnosticsTraceForm}
            harForm={diagnosticsHarForm}
            open={diagnosticsOpen}
            onOpenChange={setDiagnosticsOpen}
            consoleMessages={consoleMessages}
            pageErrors={pageErrors}
            detectionRisk={detectionRisk}
            traceResult={traceResult}
            harResult={harResult}
            onFetchConsole={handleFetchConsoleMessages}
            onClearConsole={handleClearConsoleMessages}
            onFetchErrors={handleFetchPageErrors}
            onClearErrors={handleClearPageErrors}
            onFetchRisk={handleFetchDetectionRisk}
            onStartTrace={handleStartTrace}
            onStopTrace={handleStopTrace}
            onStartHar={handleStartHar}
            onStopHar={handleStopHar}
          />
        )}
        {hasSection('storage') && (
          <StorageSection
            apiKey={apiKey}
            form={storageForm}
            open={storageOpen}
            onOpenChange={setStorageOpen}
            exportResult={storageExport}
            onExport={handleExportStorage}
            onImport={handleImportStorage}
            onClear={handleClearStorage}
          />
        )}
        {hasSection('profile') && (
          <ProfileSection
            apiKey={apiKey}
            form={profileForm}
            open={profileOpen}
            onOpenChange={setProfileOpen}
            saveResult={profileSaveResult}
            loadResult={profileLoadResult}
            onSave={handleSaveProfile}
            onLoad={handleLoadProfile}
          />
        )}
        {hasSection('stream') && (
          <StreamingSection
            apiKey={apiKey}
            form={streamForm}
            open={streamOpen}
            onOpenChange={setStreamOpen}
            token={streamToken}
            status={streamStatus}
            frame={streamFrame}
            error={streamError}
            imageRef={streamImageRef}
            onCreateToken={handleCreateStreamToken}
            onDisconnect={handleDisconnectStream}
            onPointerDown={streamHandlers.onPointerDown}
            onPointerUp={streamHandlers.onPointerUp}
            onWheel={streamHandlers.onWheel}
            onKeyDown={streamHandlers.onKeyDown}
            onKeyUp={streamHandlers.onKeyUp}
          />
        )}
        {hasSection('cdp') && (
          <CdpSection
            apiKey={apiKey}
            form={cdpForm}
            open={cdpOpen}
            onOpenChange={setCdpOpen}
            session={cdpSession}
            onConnect={handleConnectCdp}
          />
        )}
      </CardContent>
    </Card>
  );
}
