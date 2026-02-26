/**
 * [PROPS]: BrowserSessionPanelContentProps
 * [EMITS]: section 级操作事件（创建/切换/查询/清理等）
 * [POS]: BrowserSessionPanel 的分区装配层（不维护业务状态）
 */

import type { BrowserSessionSection } from '../browser-session-section-config';
import type { useBrowserSessionForms } from '../hooks/use-browser-session-forms';
import type { useBrowserSessionLifecycleActions } from '../hooks/use-browser-session-lifecycle-actions';
import type { useBrowserSessionOperationActions } from '../hooks/use-browser-session-operation-actions';
import type { useBrowserSessionPanelResults } from '../hooks/use-browser-session-panel-results';
import type { useBrowserStream } from '../hooks/use-browser-stream';
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

type BrowserSessionForms = ReturnType<typeof useBrowserSessionForms>;
type BrowserSessionResults = ReturnType<typeof useBrowserSessionPanelResults>;
type BrowserSessionLifecycleActions = ReturnType<typeof useBrowserSessionLifecycleActions>;
type BrowserSessionOperationActions = ReturnType<typeof useBrowserSessionOperationActions>;
type BrowserSessionStream = Pick<
  ReturnType<typeof useBrowserStream>,
  'streamToken' | 'streamStatus' | 'streamFrame' | 'streamError' | 'streamImageRef' | 'handlers'
>;

interface BrowserSessionPanelContentProps {
  apiKey: string;
  sections: BrowserSessionSection[];
  forms: BrowserSessionForms;
  results: BrowserSessionResults;
  stream: BrowserSessionStream;
  lifecycleActions: BrowserSessionLifecycleActions;
  operationActions: BrowserSessionOperationActions;
  getSectionOpenState: (section: BrowserSessionSection) => boolean;
  setSectionOpenStateByKey: (section: BrowserSessionSection, open: boolean) => void;
}

export function BrowserSessionPanelContent({
  apiKey,
  sections,
  forms,
  results,
  stream,
  lifecycleActions,
  operationActions,
  getSectionOpenState,
  setSectionOpenStateByKey,
}: BrowserSessionPanelContentProps) {
  const hasSection = (section: BrowserSessionSection) => sections.includes(section);
  const getSectionToggleProps = (section: BrowserSessionSection) => ({
    open: getSectionOpenState(section),
    onOpenChange: (open: boolean) => setSectionOpenStateByKey(section, open),
  });

  return (
    <>
      {hasSection('session') && (
        <SessionSection
          apiKey={apiKey}
          form={forms.sessionForm}
          sessionInfo={results.sessionInfo}
          {...getSectionToggleProps('session')}
          onCreate={lifecycleActions.handleCreateSession}
          onStatus={lifecycleActions.handleStatus}
          onClose={lifecycleActions.handleClose}
        />
      )}

      {hasSection('open') && (
        <OpenUrlSection
          apiKey={apiKey}
          form={forms.openForm}
          {...getSectionToggleProps('open')}
          onSubmit={operationActions.handleOpenUrl}
          result={results.openResult}
        />
      )}

      {hasSection('snapshot') && (
        <SnapshotSection
          apiKey={apiKey}
          form={forms.snapshotForm}
          {...getSectionToggleProps('snapshot')}
          onSubmit={operationActions.handleSnapshot}
          result={results.snapshot}
        />
      )}

      {hasSection('delta') && (
        <DeltaSnapshotSection
          apiKey={apiKey}
          form={forms.deltaSnapshotForm}
          {...getSectionToggleProps('delta')}
          onSubmit={operationActions.handleDeltaSnapshot}
          result={results.deltaSnapshot}
        />
      )}

      {hasSection('action') && (
        <ActionSection
          apiKey={apiKey}
          form={forms.actionForm}
          {...getSectionToggleProps('action')}
          onSubmit={operationActions.handleAction}
          result={results.actionResult}
        />
      )}

      {hasSection('actionBatch') && (
        <ActionBatchSection
          apiKey={apiKey}
          form={forms.actionBatchForm}
          {...getSectionToggleProps('actionBatch')}
          onSubmit={operationActions.handleActionBatch}
          result={results.actionBatchResult}
        />
      )}

      {hasSection('screenshot') && (
        <ScreenshotSection
          apiKey={apiKey}
          form={forms.screenshotForm}
          {...getSectionToggleProps('screenshot')}
          onSubmit={operationActions.handleScreenshot}
          result={results.screenshot}
        />
      )}

      {hasSection('tabs') && (
        <TabsSection
          apiKey={apiKey}
          form={forms.tabsForm}
          {...getSectionToggleProps('tabs')}
          tabs={results.tabs}
          dialogHistory={results.dialogHistory}
          onCreateTab={operationActions.handleCreateTab}
          onListTabs={operationActions.handleListTabs}
          onSwitchTab={operationActions.handleSwitchTab}
          onCloseTab={operationActions.handleCloseTab}
          onDialogHistory={operationActions.handleDialogHistory}
        />
      )}

      {hasSection('windows') && (
        <WindowsSection
          apiKey={apiKey}
          form={forms.windowsForm}
          {...getSectionToggleProps('windows')}
          windows={results.windows}
          onCreateWindow={operationActions.handleCreateWindow}
          onListWindows={operationActions.handleListWindows}
          onSwitchWindow={operationActions.handleSwitchWindow}
          onCloseWindow={operationActions.handleCloseWindow}
        />
      )}

      {hasSection('intercept') && (
        <InterceptSection
          apiKey={apiKey}
          form={forms.interceptForm}
          {...getSectionToggleProps('intercept')}
          rules={results.interceptRules}
          onSetRules={operationActions.handleSetRules}
          onAddRule={operationActions.handleAddRule}
          onRemoveRule={operationActions.handleRemoveRule}
          onClearRules={operationActions.handleClearRules}
          onListRules={operationActions.handleListRules}
        />
      )}

      {hasSection('headers') && (
        <HeadersSection
          apiKey={apiKey}
          form={forms.headersForm}
          {...getSectionToggleProps('headers')}
          result={results.headersResult}
          onSetHeaders={operationActions.handleSetHeaders}
          onClearHeaders={operationActions.handleClearHeaders}
        />
      )}

      {hasSection('network') && (
        <NetworkHistorySection
          apiKey={apiKey}
          form={forms.networkForm}
          {...getSectionToggleProps('network')}
          history={results.networkHistory}
          onFetch={operationActions.handleNetworkHistory}
          onClear={operationActions.handleClearNetworkHistory}
        />
      )}

      {hasSection('diagnostics') && (
        <DiagnosticsSection
          apiKey={apiKey}
          logForm={forms.diagnosticsLogForm}
          traceForm={forms.diagnosticsTraceForm}
          harForm={forms.diagnosticsHarForm}
          {...getSectionToggleProps('diagnostics')}
          consoleMessages={results.consoleMessages}
          pageErrors={results.pageErrors}
          detectionRisk={results.detectionRisk}
          traceResult={results.traceResult}
          harResult={results.harResult}
          onFetchConsole={operationActions.handleFetchConsoleMessages}
          onClearConsole={operationActions.handleClearConsoleMessages}
          onFetchErrors={operationActions.handleFetchPageErrors}
          onClearErrors={operationActions.handleClearPageErrors}
          onFetchRisk={operationActions.handleFetchDetectionRisk}
          onStartTrace={operationActions.handleStartTrace}
          onStopTrace={operationActions.handleStopTrace}
          onStartHar={operationActions.handleStartHar}
          onStopHar={operationActions.handleStopHar}
        />
      )}

      {hasSection('storage') && (
        <StorageSection
          apiKey={apiKey}
          form={forms.storageForm}
          {...getSectionToggleProps('storage')}
          exportResult={results.storageExport}
          onExport={operationActions.handleExportStorage}
          onImport={operationActions.handleImportStorage}
          onClear={operationActions.handleClearStorage}
        />
      )}

      {hasSection('profile') && (
        <ProfileSection
          apiKey={apiKey}
          form={forms.profileForm}
          {...getSectionToggleProps('profile')}
          saveResult={results.profileSaveResult}
          loadResult={results.profileLoadResult}
          onSave={operationActions.handleSaveProfile}
          onLoad={operationActions.handleLoadProfile}
        />
      )}

      {hasSection('stream') && (
        <StreamingSection
          apiKey={apiKey}
          form={forms.streamForm}
          {...getSectionToggleProps('stream')}
          token={stream.streamToken}
          status={stream.streamStatus}
          frame={stream.streamFrame}
          error={stream.streamError}
          imageRef={stream.streamImageRef}
          onCreateToken={operationActions.handleCreateStreamToken}
          onDisconnect={operationActions.handleDisconnectStream}
          onPointerDown={stream.handlers.onPointerDown}
          onPointerUp={stream.handlers.onPointerUp}
          onWheel={stream.handlers.onWheel}
          onKeyDown={stream.handlers.onKeyDown}
          onKeyUp={stream.handlers.onKeyUp}
        />
      )}

      {hasSection('cdp') && (
        <CdpSection
          apiKey={apiKey}
          form={forms.cdpForm}
          {...getSectionToggleProps('cdp')}
          session={results.cdpSession}
          onConnect={operationActions.handleConnectCdp}
        />
      )}
    </>
  );
}
