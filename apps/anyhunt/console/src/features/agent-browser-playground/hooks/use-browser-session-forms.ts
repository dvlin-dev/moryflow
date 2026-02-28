/**
 * [PROVIDES]: BrowserSessionPanel 全部分区表单实例（含 sessionId 同步与 onSessionChange 通知）
 * [DEPENDS]: schemas.ts（zod schema + values 类型）/ react-hook-form / zodResolver
 * [POS]: BrowserSessionPanel 表单初始化与同步逻辑
 */

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  browserActionBatchSchema,
  browserActionSchema,
  browserCdpSchema,
  browserDeltaSnapshotSchema,
  browserDiagnosticsHarSchema,
  browserDiagnosticsLogSchema,
  browserDiagnosticsTraceSchema,
  browserHeadersSchema,
  browserInterceptSchema,
  browserNetworkHistorySchema,
  browserOpenSchema,
  browserProfileSchema,
  browserScreenshotSchema,
  browserSessionSchema,
  browserSnapshotSchema,
  browserStorageSchema,
  browserStreamSchema,
  browserTabsSchema,
  browserWindowsSchema,
  type BrowserActionBatchValues,
  type BrowserActionValues,
  type BrowserCdpValues,
  type BrowserDeltaSnapshotValues,
  type BrowserDiagnosticsHarValues,
  type BrowserDiagnosticsLogValues,
  type BrowserDiagnosticsTraceValues,
  type BrowserHeadersValues,
  type BrowserInterceptValues,
  type BrowserNetworkHistoryValues,
  type BrowserOpenValues,
  type BrowserProfileValues,
  type BrowserScreenshotValues,
  type BrowserSessionValues,
  type BrowserSnapshotValues,
  type BrowserStorageValues,
  type BrowserStreamValues,
  type BrowserTabsValues,
  type BrowserWindowsValues,
} from '../schemas';

type UseBrowserSessionFormsParams = {
  sessionId?: string;
  onSessionChange?: (sessionId: string) => void;
};

export function useBrowserSessionForms({
  sessionId,
  onSessionChange,
}: UseBrowserSessionFormsParams) {
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
    defaultValues: { wsEndpoint: '', port: undefined, timeout: 30000 },
  });

  const watchedSessionId = useWatch({ control: sessionForm.control, name: 'sessionId' });

  useEffect(() => {
    onSessionChange?.(watchedSessionId || '');
  }, [watchedSessionId, onSessionChange]);

  return {
    sessionForm,
    openForm,
    snapshotForm,
    deltaSnapshotForm,
    actionForm,
    actionBatchForm,
    screenshotForm,
    tabsForm,
    windowsForm,
    interceptForm,
    headersForm,
    networkForm,
    diagnosticsLogForm,
    diagnosticsTraceForm,
    diagnosticsHarForm,
    storageForm,
    profileForm,
    streamForm,
    cdpForm,
  };
}
