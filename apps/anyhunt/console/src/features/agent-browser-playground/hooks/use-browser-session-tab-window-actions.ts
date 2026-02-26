/**
 * [PROVIDES]: BrowserSession Tab/Window 操作
 * [DEPENDS]: browser-api / context options mapper
 * [POS]: BrowserSession 操作编排 - 页面容器域
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import { buildBrowserContextOptions } from '../browser-context-options';
import {
  closeBrowserTab,
  closeBrowserWindow,
  createBrowserTab,
  createBrowserWindow,
  getDialogHistory,
  listBrowserTabs,
  listBrowserWindows,
  switchBrowserTab,
  switchBrowserWindow,
} from '../browser-api';
import type { BrowserTabsValues, BrowserWindowsValues } from '../schemas';
import type { UseBrowserSessionOperationActionsArgs } from './browser-session-operation-actions.types';
import { applyBrowserContextOptionErrors } from './browser-session-operation-actions.utils';

type UseBrowserSessionTabWindowActionsArgs = Pick<
  UseBrowserSessionOperationActionsArgs,
  'apiKey' | 'requireSession' | 'windowsForm' | 'setTabs' | 'setWindows' | 'setDialogHistory'
>;

export function useBrowserSessionTabWindowActions({
  apiKey,
  requireSession,
  windowsForm,
  setTabs,
  setWindows,
  setDialogHistory,
}: UseBrowserSessionTabWindowActionsArgs) {
  const handleCreateTab = useCallback(async () => {
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
  }, [apiKey, requireSession, setTabs]);

  const handleListTabs = useCallback(async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;

    try {
      const list = await listBrowserTabs(apiKey, sessionId);
      setTabs(list);
      toast.success('Tabs loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load tabs');
    }
  }, [apiKey, requireSession, setTabs]);

  const handleSwitchTab = useCallback(
    async (values: BrowserTabsValues) => {
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
    },
    [apiKey, handleListTabs, requireSession]
  );

  const handleCloseTab = useCallback(
    async (values: BrowserTabsValues) => {
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
    },
    [apiKey, handleListTabs, requireSession]
  );

  const handleCreateWindow = useCallback(
    async (values: BrowserWindowsValues) => {
      const sessionId = requireSession();
      if (!sessionId || !apiKey) return;

      const { options, errors } = buildBrowserContextOptions(values);
      if (errors.length > 0 || !options) {
        applyBrowserContextOptionErrors(windowsForm, errors);
        return;
      }

      try {
        await createBrowserWindow(apiKey, sessionId, options);
        const list = await listBrowserWindows(apiKey, sessionId);
        setWindows(list);
        toast.success('Window created');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Window creation failed');
      }
    },
    [apiKey, requireSession, setWindows, windowsForm]
  );

  const handleListWindows = useCallback(async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;

    try {
      const list = await listBrowserWindows(apiKey, sessionId);
      setWindows(list);
      toast.success('Windows loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load windows');
    }
  }, [apiKey, requireSession, setWindows]);

  const handleSwitchWindow = useCallback(
    async (values: BrowserWindowsValues) => {
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
    },
    [apiKey, handleListWindows, requireSession]
  );

  const handleCloseWindow = useCallback(
    async (values: BrowserWindowsValues) => {
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
    },
    [apiKey, handleListWindows, requireSession]
  );

  const handleDialogHistory = useCallback(async () => {
    const sessionId = requireSession();
    if (!sessionId || !apiKey) return;

    try {
      const history = await getDialogHistory(apiKey, sessionId);
      setDialogHistory(history);
      toast.success('Dialog history loaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load dialog history');
    }
  }, [apiKey, requireSession, setDialogHistory]);

  return {
    handleCreateTab,
    handleListTabs,
    handleSwitchTab,
    handleCloseTab,
    handleCreateWindow,
    handleListWindows,
    handleSwitchWindow,
    handleCloseWindow,
    handleDialogHistory,
  };
}
