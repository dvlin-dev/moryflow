/**
 * [PROPS]: BrowserSessionPanelProps（sections 可按页面裁剪）
 * [EMITS]: onSessionChange
 * [POS]: Browser Playground 操作面板（分区组件）
 */

import { useEffect, useState } from 'react';
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@anyhunt/ui';
import { CodeBlock } from '@anyhunt/ui/ai/code-block';
import {
  browserSessionSchema,
  browserOpenSchema,
  browserSnapshotSchema,
  browserDeltaSnapshotSchema,
  browserActionSchema,
  browserScreenshotSchema,
  browserTabsSchema,
  browserWindowsSchema,
  browserInterceptSchema,
  browserNetworkHistorySchema,
  browserStorageSchema,
  browserCdpSchema,
  type BrowserSessionValues,
  type BrowserOpenValues,
  type BrowserSnapshotValues,
  type BrowserDeltaSnapshotValues,
  type BrowserActionValues,
  type BrowserScreenshotValues,
  type BrowserTabsValues,
  type BrowserWindowsValues,
  type BrowserInterceptValues,
  type BrowserNetworkHistoryValues,
  type BrowserStorageValues,
  type BrowserCdpValues,
} from '../schemas';
import {
  addInterceptRule,
  clearInterceptRules,
  clearNetworkHistory,
  clearBrowserStorage,
  closeBrowserSession,
  closeBrowserTab,
  closeBrowserWindow,
  connectBrowserCdp,
  createBrowserSession,
  createBrowserTab,
  createBrowserWindow,
  executeBrowserAction,
  exportBrowserStorage,
  getBrowserDeltaSnapshot,
  getBrowserScreenshot,
  getBrowserSessionStatus,
  getBrowserSnapshot,
  getDialogHistory,
  getInterceptRules,
  getNetworkHistory,
  importBrowserStorage,
  listBrowserTabs,
  listBrowserWindows,
  openBrowserUrl,
  removeInterceptRule,
  setInterceptRules,
  switchBrowserTab,
  switchBrowserWindow,
} from '../api';
import type {
  BrowserActionResponse,
  BrowserDeltaSnapshotResponse,
  BrowserNetworkRequestRecord,
  BrowserOpenResponse,
  BrowserScreenshotResponse,
  BrowserSessionInfo,
  BrowserSnapshotResponse,
  BrowserStorageExportResult,
  BrowserTabInfo,
  BrowserWindowInfo,
} from '../types';
import { CollapsibleSection } from '../../playground-shared/components/collapsible-section';

const parseJson = <T,>(value?: string): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

export type BrowserSessionSection =
  | 'session'
  | 'open'
  | 'snapshot'
  | 'delta'
  | 'action'
  | 'screenshot'
  | 'tabs'
  | 'windows'
  | 'intercept'
  | 'network'
  | 'storage'
  | 'cdp';

const defaultSections: BrowserSessionSection[] = [
  'session',
  'open',
  'snapshot',
  'delta',
  'action',
  'screenshot',
  'tabs',
  'windows',
  'intercept',
  'network',
  'storage',
  'cdp',
];

export interface BrowserSessionPanelProps {
  apiKeyId: string;
  sessionId?: string;
  onSessionChange?: (sessionId: string) => void;
  sections?: BrowserSessionSection[];
  title?: string;
  description?: string;
}

export function BrowserSessionPanel({
  apiKeyId,
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
  const [screenshot, setScreenshot] = useState<BrowserScreenshotResponse | null>(null);
  const [tabs, setTabs] = useState<BrowserTabInfo[] | null>(null);
  const [windows, setWindows] = useState<BrowserWindowInfo[] | null>(null);
  const [dialogHistory, setDialogHistory] = useState<unknown[]>([]);
  const [interceptRules, setInterceptRulesState] = useState<unknown[] | null>(null);
  const [networkHistory, setNetworkHistory] = useState<BrowserNetworkRequestRecord[] | null>(null);
  const [storageExport, setStorageExport] = useState<BrowserStorageExportResult | null>(null);
  const [cdpSession, setCdpSession] = useState<BrowserSessionInfo | null>(null);

  const [sessionOpen, setSessionOpen] = useState(true);
  const [openUrlOpen, setOpenUrlOpen] = useState(true);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [deltaSnapshotOpen, setDeltaSnapshotOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const [tabsOpen, setTabsOpen] = useState(false);
  const [windowsOpen, setWindowsOpen] = useState(false);
  const [interceptOpen, setInterceptOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [cdpOpen, setCdpOpen] = useState(false);

  const sessionForm = useForm<BrowserSessionValues>({
    resolver: zodResolver(browserSessionSchema),
    defaultValues: {
      sessionId: '',
      javaScriptEnabled: true,
      ignoreHTTPSErrors: true,
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
    defaultValues: { url: '', waitUntil: 'domcontentloaded' },
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
    defaultValues: { windowIndex: undefined },
  });

  const interceptForm = useForm<BrowserInterceptValues>({
    resolver: zodResolver(browserInterceptSchema),
    defaultValues: { rulesJson: '', ruleJson: '', ruleId: '' },
  });

  const networkForm = useForm<BrowserNetworkHistoryValues>({
    resolver: zodResolver(browserNetworkHistorySchema),
    defaultValues: { limit: undefined, urlFilter: '' },
  });

  const storageForm = useForm<BrowserStorageValues>({
    resolver: zodResolver(browserStorageSchema),
    defaultValues: { exportOptionsJson: '', importDataJson: '' },
  });

  const cdpForm = useForm<BrowserCdpValues>({
    resolver: zodResolver(browserCdpSchema),
    defaultValues: { wsEndpoint: '', port: undefined, timeout: 30000 },
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
    if (!apiKeyId) {
      toast.error('Select an API key first');
      return;
    }

    const options: Record<string, unknown> = {
      timeout: values.timeout,
      userAgent: values.userAgent || undefined,
      javaScriptEnabled: values.javaScriptEnabled,
      ignoreHTTPSErrors: values.ignoreHTTPSErrors,
    };

    if (values.viewportWidth && values.viewportHeight) {
      options.viewport = {
        width: values.viewportWidth,
        height: values.viewportHeight,
      };
    }

    try {
      const session = await createBrowserSession(apiKeyId, options);
      sessionForm.setValue('sessionId', session.id);
      setSessionInfo(session);
      toast.success('Session created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create session');
    }
  };

  const handleStatus = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    try {
      const status = await getBrowserSessionStatus(apiKeyId, sessionId);
      setSessionInfo(status);
      toast.success('Session status loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch status');
    }
  };

  const handleClose = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    try {
      await closeBrowserSession(apiKeyId, sessionId);
      setSessionInfo(null);
      setOpenResult(null);
      setSnapshot(null);
      setDeltaSnapshot(null);
      setActionResult(null);
      setScreenshot(null);
      setTabs(null);
      setWindows(null);
      setDialogHistory([]);
      setInterceptRulesState(null);
      setNetworkHistory(null);
      setStorageExport(null);
      sessionForm.setValue('sessionId', '');
      toast.success('Session closed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to close session');
    }
  };

  const handleOpenUrl = async (values: BrowserOpenValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    try {
      const result = await openBrowserUrl(apiKeyId, sessionId, values);
      setOpenResult(result);
      toast.success('URL opened');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open URL');
    }
  };

  const handleSnapshot = async (values: BrowserSnapshotValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    try {
      const result = await getBrowserSnapshot(apiKeyId, sessionId, values);
      setSnapshot(result);
      toast.success('Snapshot captured');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Snapshot failed');
    }
  };

  const handleDeltaSnapshot = async (values: BrowserDeltaSnapshotValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    try {
      const result = await getBrowserDeltaSnapshot(apiKeyId, sessionId, values);
      setDeltaSnapshot(result);
      toast.success('Delta snapshot captured');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delta snapshot failed');
    }
  };

  const handleAction = async (values: BrowserActionValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    const parsed = parseJson<Record<string, unknown>>(values.actionJson);
    if (!parsed) {
      actionForm.setError('actionJson', { message: 'Invalid JSON' });
      return;
    }
    try {
      const result = await executeBrowserAction(apiKeyId, sessionId, parsed);
      setActionResult(result);
      toast.success('Action executed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed');
    }
  };

  const handleScreenshot = async (values: BrowserScreenshotValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    try {
      const result = await getBrowserScreenshot(apiKeyId, sessionId, values);
      setScreenshot(result);
      toast.success('Screenshot captured');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Screenshot failed');
    }
  };

  const handleCreateTab = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    try {
      await createBrowserTab(apiKeyId, sessionId);
      const list = await listBrowserTabs(apiKeyId, sessionId);
      setTabs(list);
      toast.success('Tab created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Tab creation failed');
    }
  };

  const handleListTabs = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    try {
      const list = await listBrowserTabs(apiKeyId, sessionId);
      setTabs(list);
      toast.success('Tabs loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load tabs');
    }
  };

  const handleSwitchTab = async (values: BrowserTabsValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId || values.tabIndex === undefined) {
      toast.error('Tab index is required');
      return;
    }
    try {
      await switchBrowserTab(apiKeyId, sessionId, values.tabIndex);
      await handleListTabs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to switch tab');
    }
  };

  const handleCloseTab = async (values: BrowserTabsValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId || values.tabIndex === undefined) {
      toast.error('Tab index is required');
      return;
    }
    try {
      await closeBrowserTab(apiKeyId, sessionId, values.tabIndex);
      await handleListTabs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to close tab');
    }
  };

  const handleCreateWindow = async (values: BrowserWindowsValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    const options: Record<string, unknown> = {};
    if (values.viewportWidth && values.viewportHeight) {
      options.viewport = {
        width: values.viewportWidth,
        height: values.viewportHeight,
      };
    }
    if (values.userAgent) {
      options.userAgent = values.userAgent;
    }
    try {
      await createBrowserWindow(apiKeyId, sessionId, options);
      const list = await listBrowserWindows(apiKeyId, sessionId);
      setWindows(list);
      toast.success('Window created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Window creation failed');
    }
  };

  const handleListWindows = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    try {
      const list = await listBrowserWindows(apiKeyId, sessionId);
      setWindows(list);
      toast.success('Windows loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load windows');
    }
  };

  const handleSwitchWindow = async (values: BrowserWindowsValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId || values.windowIndex === undefined) {
      toast.error('Window index is required');
      return;
    }
    try {
      await switchBrowserWindow(apiKeyId, sessionId, values.windowIndex);
      await handleListWindows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to switch window');
    }
  };

  const handleCloseWindow = async (values: BrowserWindowsValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId || values.windowIndex === undefined) {
      toast.error('Window index is required');
      return;
    }
    try {
      await closeBrowserWindow(apiKeyId, sessionId, values.windowIndex);
      await handleListWindows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to close window');
    }
  };

  const handleDialogHistory = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    try {
      const history = await getDialogHistory(apiKeyId, sessionId);
      setDialogHistory(history);
      toast.success('Dialog history loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load dialog history');
    }
  };

  const handleSetRules = async (values: BrowserInterceptValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    const parsed = parseJson<unknown[]>(values.rulesJson ?? '');
    if (!parsed) {
      interceptForm.setError('rulesJson', { message: 'Invalid JSON' });
      return;
    }
    try {
      await setInterceptRules(apiKeyId, sessionId, parsed);
      const list = await getInterceptRules(apiKeyId, sessionId);
      setInterceptRulesState(list);
      toast.success('Rules updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to set rules');
    }
  };

  const handleAddRule = async (values: BrowserInterceptValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    const parsed = parseJson<Record<string, unknown>>(values.ruleJson ?? '');
    if (!parsed) {
      interceptForm.setError('ruleJson', { message: 'Invalid JSON' });
      return;
    }
    try {
      await addInterceptRule(apiKeyId, sessionId, parsed);
      const list = await getInterceptRules(apiKeyId, sessionId);
      setInterceptRulesState(list);
      toast.success('Rule added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add rule');
    }
  };

  const handleRemoveRule = async (values: BrowserInterceptValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId || !values.ruleId) {
      toast.error('Rule ID is required');
      return;
    }
    try {
      await removeInterceptRule(apiKeyId, sessionId, values.ruleId);
      const list = await getInterceptRules(apiKeyId, sessionId);
      setInterceptRulesState(list);
      toast.success('Rule removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove rule');
    }
  };

  const handleClearRules = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    try {
      await clearInterceptRules(apiKeyId, sessionId);
      setInterceptRulesState([]);
      toast.success('Rules cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear rules');
    }
  };

  const handleListRules = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    try {
      const list = await getInterceptRules(apiKeyId, sessionId);
      setInterceptRulesState(list);
      toast.success('Rules loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load rules');
    }
  };

  const handleNetworkHistory = async (values: BrowserNetworkHistoryValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    try {
      const list = await getNetworkHistory(apiKeyId, sessionId, values);
      setNetworkHistory(list);
      toast.success('Network history loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load history');
    }
  };

  const handleClearNetworkHistory = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    try {
      await clearNetworkHistory(apiKeyId, sessionId);
      setNetworkHistory([]);
      toast.success('Network history cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear history');
    }
  };

  const handleExportStorage = async (values: BrowserStorageValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    const parsed = parseJson<Record<string, unknown>>(values.exportOptionsJson ?? '');
    try {
      const result = await exportBrowserStorage(apiKeyId, sessionId, parsed ?? {});
      setStorageExport(result);
      toast.success('Storage exported');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Storage export failed');
    }
  };

  const handleImportStorage = async (values: BrowserStorageValues) => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    const parsed = parseJson<Record<string, unknown>>(values.importDataJson ?? '');
    if (!parsed) {
      storageForm.setError('importDataJson', { message: 'Invalid JSON' });
      return;
    }
    try {
      await importBrowserStorage(apiKeyId, sessionId, parsed);
      toast.success('Storage imported');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Storage import failed');
    }
  };

  const handleClearStorage = async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKeyId) return;
    try {
      await clearBrowserStorage(apiKeyId, sessionId);
      toast.success('Storage cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Storage clear failed');
    }
  };

  const handleConnectCdp = async (values: BrowserCdpValues) => {
    if (!apiKeyId) return;
    try {
      const result = await connectBrowserCdp(apiKeyId, values);
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
            apiKeyId={apiKeyId}
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
            apiKeyId={apiKeyId}
            form={openForm}
            open={openUrlOpen}
            onOpenChange={setOpenUrlOpen}
            onSubmit={handleOpenUrl}
            result={openResult}
          />
        )}
        {hasSection('snapshot') && (
          <SnapshotSection
            apiKeyId={apiKeyId}
            form={snapshotForm}
            open={snapshotOpen}
            onOpenChange={setSnapshotOpen}
            onSubmit={handleSnapshot}
            result={snapshot}
          />
        )}
        {hasSection('delta') && (
          <DeltaSnapshotSection
            apiKeyId={apiKeyId}
            form={deltaSnapshotForm}
            open={deltaSnapshotOpen}
            onOpenChange={setDeltaSnapshotOpen}
            onSubmit={handleDeltaSnapshot}
            result={deltaSnapshot}
          />
        )}
        {hasSection('action') && (
          <ActionSection
            apiKeyId={apiKeyId}
            form={actionForm}
            open={actionOpen}
            onOpenChange={setActionOpen}
            onSubmit={handleAction}
            result={actionResult}
          />
        )}
        {hasSection('screenshot') && (
          <ScreenshotSection
            apiKeyId={apiKeyId}
            form={screenshotForm}
            open={screenshotOpen}
            onOpenChange={setScreenshotOpen}
            onSubmit={handleScreenshot}
            result={screenshot}
          />
        )}
        {hasSection('tabs') && (
          <TabsSection
            apiKeyId={apiKeyId}
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
            apiKeyId={apiKeyId}
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
            apiKeyId={apiKeyId}
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
        {hasSection('network') && (
          <NetworkHistorySection
            apiKeyId={apiKeyId}
            form={networkForm}
            open={networkOpen}
            onOpenChange={setNetworkOpen}
            history={networkHistory}
            onFetch={handleNetworkHistory}
            onClear={handleClearNetworkHistory}
          />
        )}
        {hasSection('storage') && (
          <StorageSection
            apiKeyId={apiKeyId}
            form={storageForm}
            open={storageOpen}
            onOpenChange={setStorageOpen}
            exportResult={storageExport}
            onExport={handleExportStorage}
            onImport={handleImportStorage}
            onClear={handleClearStorage}
          />
        )}
        {hasSection('cdp') && (
          <CdpSection
            apiKeyId={apiKeyId}
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

type SessionSectionProps = {
  apiKeyId: string;
  form: UseFormReturn<BrowserSessionValues>;
  sessionInfo: BrowserSessionInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (values: BrowserSessionValues) => void;
  onStatus: () => void;
  onClose: () => void;
};

function SessionSection({
  apiKeyId,
  form,
  sessionInfo,
  open,
  onOpenChange,
  onCreate,
  onStatus,
  onClose,
}: SessionSectionProps) {
  return (
    <CollapsibleSection title="Session" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
          <FormField
            control={form.control}
            name="sessionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Session ID</FormLabel>
                <FormControl>
                  <Input placeholder="session_xxx" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="viewportWidth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Viewport Width</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="1280" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="viewportHeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Viewport Height</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="800" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="timeout"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Timeout (ms)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="300000" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="userAgent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>User Agent</FormLabel>
                <FormControl>
                  <Input placeholder="Custom UA" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-6">
            <FormField
              control={form.control}
              name="javaScriptEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>JavaScript</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ignoreHTTPSErrors"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Ignore HTTPS Errors</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!apiKeyId}>
              Create Session
            </Button>
            <Button type="button" variant="outline" onClick={onStatus} disabled={!apiKeyId}>
              Get Status
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={!apiKeyId}>
              Close Session
            </Button>
          </div>
          {sessionInfo && <CodeBlock code={formatJson(sessionInfo)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type OpenUrlSectionProps = {
  apiKeyId: string;
  form: UseFormReturn<BrowserOpenValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BrowserOpenValues) => void;
  result: BrowserOpenResponse | null;
};

function OpenUrlSection({
  apiKeyId,
  form,
  open,
  onOpenChange,
  onSubmit,
  result,
}: OpenUrlSectionProps) {
  return (
    <CollapsibleSection title="Open URL" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="waitUntil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wait Until</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="load">load</SelectItem>
                      <SelectItem value="domcontentloaded">domcontentloaded</SelectItem>
                      <SelectItem value="networkidle">networkidle</SelectItem>
                      <SelectItem value="commit">commit</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timeout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeout (ms)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="30000" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={!apiKeyId}>
            Open URL
          </Button>
          {result && <CodeBlock code={formatJson(result)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type SnapshotSectionProps = {
  apiKeyId: string;
  form: UseFormReturn<BrowserSnapshotValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BrowserSnapshotValues) => void;
  result: BrowserSnapshotResponse | null;
};

function SnapshotSection({
  apiKeyId,
  form,
  open,
  onOpenChange,
  onSubmit,
  result,
}: SnapshotSectionProps) {
  return (
    <CollapsibleSection title="Snapshot" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <FormField
              control={form.control}
              name="interactive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Interactive Only</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="compact"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Compact</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="maxDepth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Depth</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="20" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scope Selector</FormLabel>
                  <FormControl>
                    <Input placeholder="#content" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={!apiKeyId}>
            Capture Snapshot
          </Button>
          {result && <CodeBlock code={formatJson(result)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type DeltaSnapshotSectionProps = {
  apiKeyId: string;
  form: UseFormReturn<BrowserDeltaSnapshotValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BrowserDeltaSnapshotValues) => void;
  result: BrowserDeltaSnapshotResponse | null;
};

function DeltaSnapshotSection({
  apiKeyId,
  form,
  open,
  onOpenChange,
  onSubmit,
  result,
}: DeltaSnapshotSectionProps) {
  return (
    <CollapsibleSection title="Delta Snapshot" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="delta"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormLabel>Delta Mode</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <Button type="submit" disabled={!apiKeyId}>
            Capture Delta
          </Button>
          {result && <CodeBlock code={formatJson(result)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type ActionSectionProps = {
  apiKeyId: string;
  form: UseFormReturn<BrowserActionValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BrowserActionValues) => void;
  result: BrowserActionResponse | null;
};

function ActionSection({
  apiKeyId,
  form,
  open,
  onOpenChange,
  onSubmit,
  result,
}: ActionSectionProps) {
  return (
    <CollapsibleSection title="Action" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="actionJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Action JSON</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder='{"type":"click","selector":"@e1"}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={!apiKeyId}>
            Execute Action
          </Button>
          {result && <CodeBlock code={formatJson(result)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type ScreenshotSectionProps = {
  apiKeyId: string;
  form: UseFormReturn<BrowserScreenshotValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BrowserScreenshotValues) => void;
  result: BrowserScreenshotResponse | null;
};

function ScreenshotSection({
  apiKeyId,
  form,
  open,
  onOpenChange,
  onSubmit,
  result,
}: ScreenshotSectionProps) {
  return (
    <CollapsibleSection title="Screenshot" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="selector"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selector (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="#main" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Format</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="png" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="png">png</SelectItem>
                      <SelectItem value="jpeg">jpeg</SelectItem>
                      <SelectItem value="webp">webp</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quality</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="80" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fullPage"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Full Page</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={!apiKeyId}>
            Capture Screenshot
          </Button>
          {result && (
            <div className="space-y-2">
              <CodeBlock code={formatJson(result)} language="json" />
              <img
                src={`data:${result.mimeType};base64,${result.data}`}
                alt="Screenshot"
                className="max-h-64 rounded-md border border-border-muted"
              />
            </div>
          )}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type TabsSectionProps = {
  apiKeyId: string;
  form: UseFormReturn<BrowserTabsValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: BrowserTabInfo[] | null;
  dialogHistory: unknown[];
  onCreateTab: () => void;
  onListTabs: () => void;
  onSwitchTab: (values: BrowserTabsValues) => void;
  onCloseTab: (values: BrowserTabsValues) => void;
  onDialogHistory: () => void;
};

function TabsSection({
  apiKeyId,
  form,
  open,
  onOpenChange,
  tabs,
  dialogHistory,
  onCreateTab,
  onListTabs,
  onSwitchTab,
  onCloseTab,
  onDialogHistory,
}: TabsSectionProps) {
  return (
    <CollapsibleSection title="Tabs" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="tabIndex"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tab Index</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={onCreateTab} disabled={!apiKeyId}>
              Create Tab
            </Button>
            <Button type="button" variant="outline" onClick={onListTabs} disabled={!apiKeyId}>
              List Tabs
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onSwitchTab)}
              disabled={!apiKeyId}
            >
              Activate Tab
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={form.handleSubmit(onCloseTab)}
              disabled={!apiKeyId}
            >
              Close Tab
            </Button>
          </div>
          {tabs && <CodeBlock code={formatJson(tabs)} language="json" />}
          <Button type="button" variant="outline" onClick={onDialogHistory}>
            Get Dialog History
          </Button>
          {dialogHistory.length > 0 && (
            <CodeBlock code={formatJson(dialogHistory)} language="json" />
          )}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type WindowsSectionProps = {
  apiKeyId: string;
  form: UseFormReturn<BrowserWindowsValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  windows: BrowserWindowInfo[] | null;
  onCreateWindow: (values: BrowserWindowsValues) => void;
  onListWindows: () => void;
  onSwitchWindow: (values: BrowserWindowsValues) => void;
  onCloseWindow: (values: BrowserWindowsValues) => void;
};

function WindowsSection({
  apiKeyId,
  form,
  open,
  onOpenChange,
  windows,
  onCreateWindow,
  onListWindows,
  onSwitchWindow,
  onCloseWindow,
}: WindowsSectionProps) {
  return (
    <CollapsibleSection title="Windows" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="windowIndex"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Window Index</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="viewportWidth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Viewport Width</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="1280" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="viewportHeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Viewport Height</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="800" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="userAgent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>User Agent</FormLabel>
                <FormControl>
                  <Input placeholder="Custom UA" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={form.handleSubmit(onCreateWindow)} disabled={!apiKeyId}>
              Create Window
            </Button>
            <Button type="button" variant="outline" onClick={onListWindows} disabled={!apiKeyId}>
              List Windows
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onSwitchWindow)}
              disabled={!apiKeyId}
            >
              Activate Window
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={form.handleSubmit(onCloseWindow)}
              disabled={!apiKeyId}
            >
              Close Window
            </Button>
          </div>
          {windows && <CodeBlock code={formatJson(windows)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type InterceptSectionProps = {
  apiKeyId: string;
  form: UseFormReturn<BrowserInterceptValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: unknown[] | null;
  onSetRules: (values: BrowserInterceptValues) => void;
  onAddRule: (values: BrowserInterceptValues) => void;
  onRemoveRule: (values: BrowserInterceptValues) => void;
  onClearRules: () => void;
  onListRules: () => void;
};

function InterceptSection({
  apiKeyId,
  form,
  open,
  onOpenChange,
  rules,
  onSetRules,
  onAddRule,
  onRemoveRule,
  onClearRules,
  onListRules,
}: InterceptSectionProps) {
  return (
    <CollapsibleSection title="Network Intercept" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="rulesJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rules JSON (array)</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder="[]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ruleJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Single Rule JSON</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder='{"urlPattern":"*"}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ruleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rule ID</FormLabel>
                <FormControl>
                  <Input placeholder="rule_123" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={form.handleSubmit(onSetRules)} disabled={!apiKeyId}>
              Set Rules
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onAddRule)}
              disabled={!apiKeyId}
            >
              Add Rule
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onRemoveRule)}
              disabled={!apiKeyId}
            >
              Remove Rule
            </Button>
            <Button type="button" variant="ghost" onClick={onClearRules} disabled={!apiKeyId}>
              Clear Rules
            </Button>
            <Button type="button" variant="outline" onClick={onListRules} disabled={!apiKeyId}>
              List Rules
            </Button>
          </div>
          {rules && <CodeBlock code={formatJson(rules)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type NetworkHistorySectionProps = {
  apiKeyId: string;
  form: UseFormReturn<BrowserNetworkHistoryValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: BrowserNetworkRequestRecord[] | null;
  onFetch: (values: BrowserNetworkHistoryValues) => void;
  onClear: () => void;
};

function NetworkHistorySection({
  apiKeyId,
  form,
  open,
  onOpenChange,
  history,
  onFetch,
  onClear,
}: NetworkHistorySectionProps) {
  return (
    <CollapsibleSection title="Network History" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limit</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="50" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="urlFilter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Filter</FormLabel>
                  <FormControl>
                    <Input placeholder="*.png" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={form.handleSubmit(onFetch)} disabled={!apiKeyId}>
              Get History
            </Button>
            <Button type="button" variant="ghost" onClick={onClear} disabled={!apiKeyId}>
              Clear History
            </Button>
          </div>
          {history && <CodeBlock code={formatJson(history)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type StorageSectionProps = {
  apiKeyId: string;
  form: UseFormReturn<BrowserStorageValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportResult: BrowserStorageExportResult | null;
  onExport: (values: BrowserStorageValues) => void;
  onImport: (values: BrowserStorageValues) => void;
  onClear: () => void;
};

function StorageSection({
  apiKeyId,
  form,
  open,
  onOpenChange,
  exportResult,
  onExport,
  onImport,
  onClear,
}: StorageSectionProps) {
  return (
    <CollapsibleSection title="Storage" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="exportOptionsJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Export Options JSON</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder='{"include":{"cookies":true}}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="importDataJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Import Data JSON</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder='{"cookies":[]}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={form.handleSubmit(onExport)} disabled={!apiKeyId}>
              Export
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onImport)}
              disabled={!apiKeyId}
            >
              Import
            </Button>
            <Button type="button" variant="ghost" onClick={onClear} disabled={!apiKeyId}>
              Clear
            </Button>
          </div>
          {exportResult && <CodeBlock code={formatJson(exportResult)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}

type CdpSectionProps = {
  apiKeyId: string;
  form: UseFormReturn<BrowserCdpValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: BrowserSessionInfo | null;
  onConnect: (values: BrowserCdpValues) => void;
};

function CdpSection({ apiKeyId, form, open, onOpenChange, session, onConnect }: CdpSectionProps) {
  return (
    <CollapsibleSection title="CDP Connect" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onConnect)} className="space-y-4">
          <FormField
            control={form.control}
            name="wsEndpoint"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WebSocket Endpoint</FormLabel>
                <FormControl>
                  <Input placeholder="ws://localhost:9222/devtools/browser/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="9222" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timeout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeout (ms)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="30000" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={!apiKeyId}>
            Connect CDP
          </Button>
          {session && <CodeBlock code={formatJson(session)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}
