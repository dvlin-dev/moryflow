/**
 * [PROVIDES]: BrowserSession 诊断操作（console/errors/risk/trace/har）
 * [DEPENDS]: browser-api
 * [POS]: BrowserSession 可观测操作 - 诊断域
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  clearBrowserConsoleMessages,
  clearBrowserPageErrors,
  getBrowserConsoleMessages,
  getBrowserDetectionRisk,
  getBrowserPageErrors,
  startBrowserHar,
  startBrowserTrace,
  stopBrowserHar,
  stopBrowserTrace,
} from '../browser-api';
import type {
  BrowserDiagnosticsHarValues,
  BrowserDiagnosticsLogValues,
  BrowserDiagnosticsTraceValues,
} from '../schemas';
import type { UseBrowserSessionOperationActionsArgs } from './browser-session-operation-actions.types';

type UseBrowserSessionDiagnosticsActionsArgs = Pick<
  UseBrowserSessionOperationActionsArgs,
  | 'apiKey'
  | 'requireSession'
  | 'setConsoleMessages'
  | 'setPageErrors'
  | 'setDetectionRisk'
  | 'setTraceResult'
  | 'setHarResult'
>;

export function useBrowserSessionDiagnosticsActions({
  apiKey,
  requireSession,
  setConsoleMessages,
  setPageErrors,
  setDetectionRisk,
  setTraceResult,
  setHarResult,
}: UseBrowserSessionDiagnosticsActionsArgs) {
  const handleFetchConsoleMessages = useCallback(
    async (values: BrowserDiagnosticsLogValues) => {
      const sessionId = requireSession();
      if (!sessionId || !apiKey) return;

      try {
        const list = await getBrowserConsoleMessages(apiKey, sessionId, values);
        setConsoleMessages(list);
        toast.success('Console messages loaded');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load console messages');
      }
    },
    [apiKey, requireSession, setConsoleMessages]
  );

  const handleClearConsoleMessages = useCallback(async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;

    try {
      await clearBrowserConsoleMessages(apiKey, sessionId);
      setConsoleMessages([]);
      toast.success('Console messages cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear console messages');
    }
  }, [apiKey, requireSession, setConsoleMessages]);

  const handleFetchPageErrors = useCallback(
    async (values: BrowserDiagnosticsLogValues) => {
      const sessionId = requireSession();
      if (!sessionId || !apiKey) return;

      try {
        const list = await getBrowserPageErrors(apiKey, sessionId, values);
        setPageErrors(list);
        toast.success('Page errors loaded');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load page errors');
      }
    },
    [apiKey, requireSession, setPageErrors]
  );

  const handleClearPageErrors = useCallback(async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;

    try {
      await clearBrowserPageErrors(apiKey, sessionId);
      setPageErrors([]);
      toast.success('Page errors cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear page errors');
    }
  }, [apiKey, requireSession, setPageErrors]);

  const handleFetchDetectionRisk = useCallback(async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;

    try {
      const summary = await getBrowserDetectionRisk(apiKey, sessionId);
      setDetectionRisk(summary);
      toast.success('Detection risk loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load detection risk');
    }
  }, [apiKey, requireSession, setDetectionRisk]);

  const handleStartTrace = useCallback(
    async (values: BrowserDiagnosticsTraceValues) => {
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
    },
    [apiKey, requireSession]
  );

  const handleStopTrace = useCallback(
    async (values: BrowserDiagnosticsTraceValues) => {
      const sessionId = requireSession();
      if (!sessionId || !apiKey) return;

      try {
        const result = await stopBrowserTrace(apiKey, sessionId, { store: values.store });
        setTraceResult(result);
        toast.success('Tracing stopped');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to stop tracing');
      }
    },
    [apiKey, requireSession, setTraceResult]
  );

  const handleStartHar = useCallback(
    async (values: BrowserDiagnosticsHarValues) => {
      const sessionId = requireSession();
      if (!sessionId || !apiKey) return;

      try {
        await startBrowserHar(apiKey, sessionId, { clear: values.clear });
        toast.success('HAR recording started');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to start HAR recording');
      }
    },
    [apiKey, requireSession]
  );

  const handleStopHar = useCallback(
    async (values: BrowserDiagnosticsHarValues) => {
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
    },
    [apiKey, requireSession, setHarResult]
  );

  return {
    handleFetchConsoleMessages,
    handleClearConsoleMessages,
    handleFetchPageErrors,
    handleClearPageErrors,
    handleFetchDetectionRisk,
    handleStartTrace,
    handleStopTrace,
    handleStartHar,
    handleStopHar,
  };
}
