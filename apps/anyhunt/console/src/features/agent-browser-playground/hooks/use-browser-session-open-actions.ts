/**
 * [PROVIDES]: BrowserSession 基础操作（open/snapshot/delta/action/action-batch/screenshot）
 * [DEPENDS]: browser-api / operation args / parse utils
 * [POS]: BrowserSession 操作编排 - 基础动作域
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  executeBrowserAction,
  executeBrowserActionBatch,
  getBrowserDeltaSnapshot,
  getBrowserScreenshot,
  getBrowserSnapshot,
  openBrowserUrl,
} from '../browser-api';
import type {
  BrowserActionBatchValues,
  BrowserActionValues,
  BrowserDeltaSnapshotValues,
  BrowserOpenValues,
  BrowserScreenshotValues,
  BrowserSnapshotValues,
} from '../schemas';
import type { UseBrowserSessionOperationActionsArgs } from './browser-session-operation-actions.types';
import {
  parseJson,
  parseJsonArray,
  parseJsonObject,
} from './browser-session-operation-actions.utils';

type UseBrowserSessionOpenActionsArgs = Pick<
  UseBrowserSessionOperationActionsArgs,
  | 'apiKey'
  | 'requireSession'
  | 'openForm'
  | 'actionForm'
  | 'actionBatchForm'
  | 'setOpenResult'
  | 'setSnapshot'
  | 'setDeltaSnapshot'
  | 'setActionResult'
  | 'setActionBatchResult'
  | 'setScreenshot'
>;

export function useBrowserSessionOpenActions({
  apiKey,
  requireSession,
  openForm,
  actionForm,
  actionBatchForm,
  setOpenResult,
  setSnapshot,
  setDeltaSnapshot,
  setActionResult,
  setActionBatchResult,
  setScreenshot,
}: UseBrowserSessionOpenActionsArgs) {
  const handleOpenUrl = useCallback(
    async (values: BrowserOpenValues) => {
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
    },
    [apiKey, openForm, requireSession, setOpenResult]
  );

  const handleSnapshot = useCallback(
    async (values: BrowserSnapshotValues) => {
      const sessionId = requireSession();
      if (!sessionId || !apiKey) return;

      try {
        const result = await getBrowserSnapshot(apiKey, sessionId, values);
        setSnapshot(result);
        toast.success('Snapshot captured');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Snapshot failed');
      }
    },
    [apiKey, requireSession, setSnapshot]
  );

  const handleDeltaSnapshot = useCallback(
    async (values: BrowserDeltaSnapshotValues) => {
      const sessionId = requireSession();
      if (!sessionId || !apiKey) return;

      try {
        const result = await getBrowserDeltaSnapshot(apiKey, sessionId, values);
        setDeltaSnapshot(result);
        toast.success('Delta snapshot captured');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Delta snapshot failed');
      }
    },
    [apiKey, requireSession, setDeltaSnapshot]
  );

  const handleAction = useCallback(
    async (values: BrowserActionValues) => {
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
    },
    [actionForm, apiKey, requireSession, setActionResult]
  );

  const handleActionBatch = useCallback(
    async (values: BrowserActionBatchValues) => {
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
    },
    [actionBatchForm, apiKey, requireSession, setActionBatchResult]
  );

  const handleScreenshot = useCallback(
    async (values: BrowserScreenshotValues) => {
      const sessionId = requireSession();
      if (!sessionId || !apiKey) return;

      try {
        const result = await getBrowserScreenshot(apiKey, sessionId, values);
        setScreenshot(result);
        toast.success('Screenshot captured');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Screenshot failed');
      }
    },
    [apiKey, requireSession, setScreenshot]
  );

  return {
    handleOpenUrl,
    handleSnapshot,
    handleDeltaSnapshot,
    handleAction,
    handleActionBatch,
    handleScreenshot,
  };
}
