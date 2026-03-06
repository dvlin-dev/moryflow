/**
 * [PROVIDES]: BrowserSession 数据与连接操作（storage/profile/stream/cdp）
 * [DEPENDS]: browser-api / parse utils
 * [POS]: BrowserSession 操作编排 - 持久化与连接域
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  clearBrowserStorage,
  connectBrowserCdp,
  createBrowserStreamToken,
  exportBrowserStorage,
  importBrowserStorage,
  loadBrowserProfile,
  saveBrowserProfile,
} from '../browser-api';
import type {
  BrowserCdpValues,
  BrowserProfileValues,
  BrowserStorageValues,
  BrowserStreamValues,
} from '../schemas';
import type { UseBrowserSessionOperationActionsArgs } from './browser-session-operation-actions.types';
import { parseJson } from './browser-session-operation-actions.utils';

type UseBrowserSessionDataActionsArgs = Pick<
  UseBrowserSessionOperationActionsArgs,
  | 'apiKey'
  | 'requireSession'
  | 'sessionForm'
  | 'storageForm'
  | 'profileForm'
  | 'setStorageExport'
  | 'setProfileSaveResult'
  | 'setProfileLoadResult'
  | 'setStreamToken'
  | 'setStreamError'
  | 'setCdpSession'
  | 'resetStream'
>;

export function buildCdpConnectPayload(values: BrowserCdpValues): {
  wsEndpoint?: string;
  port?: number;
  timeout?: number;
} {
  return {
    wsEndpoint: values.wsEndpoint?.trim() || undefined,
    port: values.port,
    timeout: values.timeout,
  };
}

export function useBrowserSessionDataActions({
  apiKey,
  requireSession,
  sessionForm,
  storageForm,
  profileForm,
  setStorageExport,
  setProfileSaveResult,
  setProfileLoadResult,
  setStreamToken,
  setStreamError,
  setCdpSession,
  resetStream,
}: UseBrowserSessionDataActionsArgs) {
  const handleExportStorage = useCallback(
    async (values: BrowserStorageValues) => {
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
    },
    [apiKey, requireSession, setStorageExport]
  );

  const handleImportStorage = useCallback(
    async (values: BrowserStorageValues) => {
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
    },
    [apiKey, requireSession, storageForm]
  );

  const handleClearStorage = useCallback(async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;

    try {
      await clearBrowserStorage(apiKey, sessionId);
      toast.success('Storage cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Storage clear failed');
    }
  }, [apiKey, requireSession]);

  const handleSaveProfile = useCallback(
    async (values: BrowserProfileValues) => {
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
    },
    [apiKey, requireSession, setProfileSaveResult]
  );

  const handleLoadProfile = useCallback(
    async (values: BrowserProfileValues) => {
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
    },
    [apiKey, profileForm, requireSession, setProfileLoadResult]
  );

  const handleCreateStreamToken = useCallback(
    async (values: BrowserStreamValues) => {
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
    },
    [apiKey, requireSession, setStreamError, setStreamToken]
  );

  const handleDisconnectStream = useCallback(() => {
    resetStream();
    toast.success('Stream disconnected');
  }, [resetStream]);

  const handleConnectCdp = useCallback(
    async (values: BrowserCdpValues) => {
      if (!apiKey) return;

      try {
        const result = await connectBrowserCdp(apiKey, buildCdpConnectPayload(values));
        setCdpSession(result);
        if (result?.id) {
          sessionForm.setValue('sessionId', result.id);
        }
        toast.success('CDP session connected');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'CDP connection failed');
      }
    },
    [apiKey, sessionForm, setCdpSession]
  );

  return {
    handleExportStorage,
    handleImportStorage,
    handleClearStorage,
    handleSaveProfile,
    handleLoadProfile,
    handleCreateStreamToken,
    handleDisconnectStream,
    handleConnectCdp,
  };
}
