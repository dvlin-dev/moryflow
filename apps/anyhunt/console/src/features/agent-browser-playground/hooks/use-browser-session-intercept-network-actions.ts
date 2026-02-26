/**
 * [PROVIDES]: BrowserSession 拦截/Headers/Network 操作
 * [DEPENDS]: browser-api / parse utils
 * [POS]: BrowserSession 可观测操作 - 网络治理域
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  addInterceptRule,
  clearBrowserHeaders,
  clearInterceptRules,
  clearNetworkHistory,
  getInterceptRules,
  getNetworkHistory,
  removeInterceptRule,
  setBrowserHeaders,
  setInterceptRules,
} from '../browser-api';
import type {
  BrowserHeadersValues,
  BrowserInterceptValues,
  BrowserNetworkHistoryValues,
} from '../schemas';
import type { UseBrowserSessionOperationActionsArgs } from './browser-session-operation-actions.types';
import {
  parseJson,
  parseJsonObject,
} from './browser-session-operation-actions.utils';

type UseBrowserSessionInterceptNetworkActionsArgs = Pick<
  UseBrowserSessionOperationActionsArgs,
  | 'apiKey'
  | 'requireSession'
  | 'interceptForm'
  | 'headersForm'
  | 'setInterceptRulesState'
  | 'setHeadersResult'
  | 'setNetworkHistory'
>;

export function useBrowserSessionInterceptNetworkActions({
  apiKey,
  requireSession,
  interceptForm,
  headersForm,
  setInterceptRulesState,
  setHeadersResult,
  setNetworkHistory,
}: UseBrowserSessionInterceptNetworkActionsArgs) {
  const handleSetRules = useCallback(
    async (values: BrowserInterceptValues) => {
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
    },
    [apiKey, interceptForm, requireSession, setInterceptRulesState]
  );

  const handleAddRule = useCallback(
    async (values: BrowserInterceptValues) => {
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
    },
    [apiKey, interceptForm, requireSession, setInterceptRulesState]
  );

  const handleRemoveRule = useCallback(
    async (values: BrowserInterceptValues) => {
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
    },
    [apiKey, requireSession, setInterceptRulesState]
  );

  const handleClearRules = useCallback(async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;

    try {
      await clearInterceptRules(apiKey, sessionId);
      setInterceptRulesState([]);
      toast.success('Rules cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear rules');
    }
  }, [apiKey, requireSession, setInterceptRulesState]);

  const handleListRules = useCallback(async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;

    try {
      const list = await getInterceptRules(apiKey, sessionId);
      setInterceptRulesState(list);
      toast.success('Rules loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load rules');
    }
  }, [apiKey, requireSession, setInterceptRulesState]);

  const handleSetHeaders = useCallback(
    async (values: BrowserHeadersValues) => {
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
    },
    [apiKey, headersForm, requireSession, setHeadersResult]
  );

  const handleClearHeaders = useCallback(
    async (values: BrowserHeadersValues) => {
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
    },
    [apiKey, requireSession, setHeadersResult]
  );

  const handleNetworkHistory = useCallback(
    async (values: BrowserNetworkHistoryValues) => {
      const sessionId = requireSession();
      if (!sessionId || !apiKey) return;

      try {
        const list = await getNetworkHistory(apiKey, sessionId, values);
        setNetworkHistory(list);
        toast.success('Network history loaded');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load history');
      }
    },
    [apiKey, requireSession, setNetworkHistory]
  );

  const handleClearNetworkHistory = useCallback(async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;

    try {
      await clearNetworkHistory(apiKey, sessionId);
      setNetworkHistory([]);
      toast.success('Network history cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear history');
    }
  }, [apiKey, requireSession, setNetworkHistory]);

  return {
    handleSetRules,
    handleAddRule,
    handleRemoveRule,
    handleClearRules,
    handleListRules,
    handleSetHeaders,
    handleClearHeaders,
    handleNetworkHistory,
    handleClearNetworkHistory,
  };
}
