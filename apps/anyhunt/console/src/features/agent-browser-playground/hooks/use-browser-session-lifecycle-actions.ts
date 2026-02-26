/**
 * [PROVIDES]: useBrowserSessionLifecycleActions - 会话生命周期 handlers
 * [DEPENDS]: browser-context-options, browser API, RHF form
 * [POS]: BrowserSessionPanel 的 session create/status/close 业务编排层
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import type { UseFormReturn } from 'react-hook-form';
import { buildBrowserContextOptions } from '../browser-context-options';
import {
  closeBrowserSession,
  createBrowserSession,
  getBrowserSessionStatus,
} from '../browser-api';
import type { BrowserSessionInfo } from '../types';
import type { BrowserSessionValues } from '../schemas';

const setFormError = (
  form: UseFormReturn<BrowserSessionValues>,
  field: keyof BrowserSessionValues,
  message: string
) => {
  form.setError(field, { message });
};

const applyContextOptionErrors = (
  form: UseFormReturn<BrowserSessionValues>,
  errors: ReturnType<typeof buildBrowserContextOptions>['errors']
) => {
  errors.forEach((error) => {
    switch (error.field) {
      case 'permissionsJson':
        setFormError(form, 'permissionsJson', error.message);
        break;
      case 'headersJson':
        setFormError(form, 'headersJson', error.message);
        break;
      case 'geolocation':
        setFormError(form, 'geolocationLat', error.message);
        setFormError(form, 'geolocationLng', error.message);
        break;
      case 'httpCredentials':
        setFormError(form, 'httpUsername', error.message);
        setFormError(form, 'httpPassword', error.message);
        break;
      default:
        break;
    }
  });
};

interface UseBrowserSessionLifecycleActionsArgs {
  apiKey: string;
  sessionForm: UseFormReturn<BrowserSessionValues>;
  setSessionInfo: (value: BrowserSessionInfo | null) => void;
  resetSessionBoundResults: () => void;
  resetStream: () => void;
}

export function useBrowserSessionLifecycleActions({
  apiKey,
  sessionForm,
  setSessionInfo,
  resetSessionBoundResults,
  resetStream,
}: UseBrowserSessionLifecycleActionsArgs) {
  const requireSession = useCallback(() => {
    const sessionId = sessionForm.getValues('sessionId')?.trim();
    if (!sessionId) {
      toast.error('Session ID is required');
      return null;
    }
    return sessionId;
  }, [sessionForm]);

  const handleCreateSession = useCallback(
    async (values: BrowserSessionValues) => {
      if (!apiKey) {
        toast.error('Select an API key first');
        return;
      }

      const { options, errors } = buildBrowserContextOptions(values, {
        timeout: values.timeout,
        javaScriptEnabled: values.javaScriptEnabled,
        ignoreHTTPSErrors: values.ignoreHTTPSErrors,
      });
      if (errors.length > 0 || !options) {
        applyContextOptionErrors(sessionForm, errors);
        return;
      }

      try {
        const session = await createBrowserSession(apiKey, options);
        sessionForm.setValue('sessionId', session.id);
        setSessionInfo(session);
        toast.success('Session created');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create session');
      }
    },
    [apiKey, sessionForm, setSessionInfo]
  );

  const handleStatus = useCallback(async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;

    try {
      const status = await getBrowserSessionStatus(apiKey, sessionId);
      setSessionInfo(status);
      toast.success('Session status loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch status');
    }
  }, [apiKey, requireSession, setSessionInfo]);

  const handleClose = useCallback(async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;

    try {
      await closeBrowserSession(apiKey, sessionId);
      resetSessionBoundResults();
      resetStream();
      sessionForm.setValue('sessionId', '');
      toast.success('Session closed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to close session');
    }
  }, [apiKey, requireSession, resetSessionBoundResults, resetStream, sessionForm]);

  return {
    requireSession,
    handleCreateSession,
    handleStatus,
    handleClose,
  };
}
