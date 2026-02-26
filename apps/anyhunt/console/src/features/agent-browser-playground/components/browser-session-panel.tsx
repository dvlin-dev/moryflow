/**
 * [PROPS]: BrowserSessionPanelProps（sections 覆盖 actionBatch/headers/diagnostics/profile/stream）
 * [EMITS]: onSessionChange
 * [POS]: Browser Playground 操作面板（容器装配层）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@moryflow/ui';
import {
  defaultBrowserSessionSections,
  type BrowserSessionSection,
} from '../browser-session-section-config';
import { useBrowserSessionSectionOpenState } from '../hooks/use-browser-session-section-open-state';
import { useBrowserSessionPanelResults } from '../hooks/use-browser-session-panel-results';
import { useBrowserSessionLifecycleActions } from '../hooks/use-browser-session-lifecycle-actions';
import { useBrowserSessionForms } from '../hooks/use-browser-session-forms';
import { useBrowserSessionOperationActions } from '../hooks/use-browser-session-operation-actions';
import { useBrowserStream } from '../hooks/use-browser-stream';
import { BrowserSessionPanelContent } from './browser-session-panel-content';

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
  sections = defaultBrowserSessionSections,
  title = 'Browser Session',
  description = 'Manage sessions and execute browser operations.',
}: BrowserSessionPanelProps) {
  const results = useBrowserSessionPanelResults();
  const stream = useBrowserStream();
  const forms = useBrowserSessionForms({ sessionId, onSessionChange });
  const { getSectionOpenState, setSectionOpenStateByKey } = useBrowserSessionSectionOpenState();

  const lifecycleActions = useBrowserSessionLifecycleActions({
    apiKey,
    sessionForm: forms.sessionForm,
    setSessionInfo: results.setSessionInfo,
    resetSessionBoundResults: results.resetSessionBoundResults,
    resetStream: stream.resetStream,
  });

  const operationActions = useBrowserSessionOperationActions({
    apiKey,
    requireSession: lifecycleActions.requireSession,
    ...forms,
    setOpenResult: results.setOpenResult,
    setSnapshot: results.setSnapshot,
    setDeltaSnapshot: results.setDeltaSnapshot,
    setActionResult: results.setActionResult,
    setActionBatchResult: results.setActionBatchResult,
    setScreenshot: results.setScreenshot,
    setTabs: results.setTabs,
    setWindows: results.setWindows,
    setDialogHistory: results.setDialogHistory,
    setInterceptRulesState: results.setInterceptRulesState,
    setHeadersResult: results.setHeadersResult,
    setNetworkHistory: results.setNetworkHistory,
    setConsoleMessages: results.setConsoleMessages,
    setPageErrors: results.setPageErrors,
    setDetectionRisk: results.setDetectionRisk,
    setTraceResult: results.setTraceResult,
    setHarResult: results.setHarResult,
    setStorageExport: results.setStorageExport,
    setProfileSaveResult: results.setProfileSaveResult,
    setProfileLoadResult: results.setProfileLoadResult,
    setStreamToken: stream.setStreamToken,
    setStreamError: stream.setStreamError,
    setCdpSession: results.setCdpSession,
    resetStream: stream.resetStream,
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <BrowserSessionPanelContent
          apiKey={apiKey}
          sections={sections}
          forms={forms}
          results={results}
          stream={stream}
          lifecycleActions={lifecycleActions}
          operationActions={operationActions}
          getSectionOpenState={getSectionOpenState}
          setSectionOpenStateByKey={setSectionOpenStateByKey}
        />
      </CardContent>
    </Card>
  );
}
