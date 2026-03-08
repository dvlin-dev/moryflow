/**
 * [PROVIDES]: app update renderer store + hook（state/settings/action facade）
 * [DEPENDS]: desktopAPI.updates, zustand vanilla store
 * [POS]: 渲染层应用更新单一状态入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useEffect } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { AppUpdateSettings, AppUpdateState, UpdateChannel } from '@shared/ipc';

type AppUpdateStoreState = {
  isLoaded: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  state: AppUpdateState | null;
  settings: AppUpdateSettings | null;
  hydrate: (options?: { preferCache?: boolean }) => Promise<void>;
  refresh: () => Promise<void>;
  setChannel: (channel: UpdateChannel) => Promise<AppUpdateSettings | null>;
  setAutoCheck: (enabled: boolean) => Promise<AppUpdateSettings | null>;
  setAutoDownload: (enabled: boolean) => Promise<AppUpdateSettings | null>;
  checkForUpdates: () => Promise<AppUpdateState | null>;
  downloadUpdate: () => Promise<AppUpdateState | null>;
  restartToInstall: () => Promise<void>;
  skipVersion: (version?: string | null) => Promise<AppUpdateSettings | null>;
  openReleaseNotes: () => Promise<void>;
  openDownloadPage: () => Promise<void>;
};

let inflight: Promise<void> | null = null;
let subscribed = false;
let disposeSubscription: (() => void) | null = null;

const getUpdatesApi = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.desktopAPI?.updates ?? null;
};

const normalizeMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'Update operation failed.';
};

const createAppUpdateStoreState = (
  set: (
    partial:
      | Partial<AppUpdateStoreState>
      | ((state: AppUpdateStoreState) => Partial<AppUpdateStoreState>),
    replace?: false
  ) => void,
  get: () => AppUpdateStoreState
): AppUpdateStoreState => {
  const applySnapshot = (state: AppUpdateState, settings: AppUpdateSettings) => {
    set({
      state,
      settings,
      isLoaded: true,
      isLoading: false,
      errorMessage: null,
    });
  };

  const ensureSubscribed = () => {
    if (subscribed) {
      return;
    }
    const api = getUpdatesApi();
    if (!api?.onStateChange) {
      return;
    }
    subscribed = true;
    disposeSubscription = api.onStateChange((event) => {
      set((current) => ({
        state: event.state,
        isLoaded: true,
        settings: event.settings ?? current.settings,
      }));
    });
  };

  const load = async (options?: { preferCache?: boolean }) => {
    ensureSubscribed();
    const preferCache = options?.preferCache !== false;
    const current = get();
    if (preferCache && current.isLoaded && current.state && current.settings) {
      return;
    }
    if (inflight) {
      return inflight;
    }

    const api = getUpdatesApi();
    if (!api?.getState || !api.getSettings) {
      set({
        isLoaded: true,
        isLoading: false,
        errorMessage: 'desktopAPI.updates is not available',
      });
      return;
    }

    set({ isLoading: true, errorMessage: null });
    inflight = Promise.all([api.getState(), api.getSettings()])
      .then(([state, settings]) => {
        applySnapshot(state, settings);
      })
      .catch((error) => {
        console.error('[use-app-update] failed to load update state', error);
        set({
          isLoaded: true,
          isLoading: false,
          errorMessage: normalizeMessage(error),
        });
      })
      .finally(() => {
        inflight = null;
      });

    return inflight;
  };

  const refreshStateAndSettings = async (): Promise<{
    state: AppUpdateState;
    settings: AppUpdateSettings;
  } | null> => {
    const api = getUpdatesApi();
    if (!api?.getState || !api.getSettings) {
      return null;
    }
    const [state, settings] = await Promise.all([api.getState(), api.getSettings()]);
    applySnapshot(state, settings);
    return { state, settings };
  };

  return {
    isLoaded: false,
    isLoading: false,
    errorMessage: null,
    state: null,
    settings: null,
    hydrate: load,
    refresh: async () => {
      await load({ preferCache: false });
    },
    setChannel: async (channel) => {
      const api = getUpdatesApi();
      if (!api?.setChannel) {
        return null;
      }
      try {
        const settings = await api.setChannel(channel);
        const state = api.getState ? await api.getState() : null;
        set({
          settings,
          state: state ?? get().state,
          errorMessage: null,
          isLoaded: true,
        });
        return settings;
      } catch (error) {
        console.error('[use-app-update] failed to set channel', error);
        set({ errorMessage: normalizeMessage(error) });
        return null;
      }
    },
    setAutoCheck: async (enabled) => {
      const api = getUpdatesApi();
      if (!api?.setAutoCheck) {
        return null;
      }
      try {
        const settings = await api.setAutoCheck(enabled);
        set({ settings, errorMessage: null, isLoaded: true });
        return settings;
      } catch (error) {
        console.error('[use-app-update] failed to set auto check', error);
        set({ errorMessage: normalizeMessage(error) });
        return null;
      }
    },
    setAutoDownload: async (enabled) => {
      const api = getUpdatesApi();
      if (!api?.setAutoDownload) {
        return null;
      }
      try {
        const settings = await api.setAutoDownload(enabled);
        set({ settings, errorMessage: null, isLoaded: true });
        return settings;
      } catch (error) {
        console.error('[use-app-update] failed to set auto download', error);
        set({ errorMessage: normalizeMessage(error) });
        return null;
      }
    },
    checkForUpdates: async () => {
      const api = getUpdatesApi();
      if (!api?.checkForUpdates) {
        return null;
      }
      try {
        const state = await api.checkForUpdates();
        const settings = api.getSettings ? await api.getSettings() : null;
        set({
          state,
          settings: settings ?? get().settings,
          errorMessage: null,
          isLoaded: true,
        });
        return state;
      } catch (error) {
        console.error('[use-app-update] failed to check for updates', error);
        set({ errorMessage: normalizeMessage(error) });
        return null;
      }
    },
    downloadUpdate: async () => {
      const api = getUpdatesApi();
      if (!api?.downloadUpdate) {
        return null;
      }
      try {
        const state = await api.downloadUpdate();
        set({ state, errorMessage: null, isLoaded: true });
        return state;
      } catch (error) {
        console.error('[use-app-update] failed to download update', error);
        set({ errorMessage: normalizeMessage(error) });
        return null;
      }
    },
    restartToInstall: async () => {
      const api = getUpdatesApi();
      if (!api?.restartToInstall) {
        return;
      }
      await api.restartToInstall();
    },
    skipVersion: async (version) => {
      const api = getUpdatesApi();
      if (!api?.skipVersion) {
        return null;
      }
      try {
        const settings = await api.skipVersion(version);
        const snapshot = await refreshStateAndSettings();
        if (!snapshot) {
          set({ settings, errorMessage: null, isLoaded: true });
        }
        return snapshot?.settings ?? settings;
      } catch (error) {
        console.error('[use-app-update] failed to skip version', error);
        set({ errorMessage: normalizeMessage(error) });
        return null;
      }
    },
    openReleaseNotes: async () => {
      const api = getUpdatesApi();
      if (!api?.openReleaseNotes) {
        return;
      }
      try {
        await api.openReleaseNotes();
        set({ errorMessage: null });
      } catch (error) {
        console.error('[use-app-update] failed to open release notes', error);
        set({ errorMessage: normalizeMessage(error) });
      }
    },
    openDownloadPage: async () => {
      const api = getUpdatesApi();
      if (!api?.openDownloadPage) {
        return;
      }
      try {
        await api.openDownloadPage();
        set({ errorMessage: null });
      } catch (error) {
        console.error('[use-app-update] failed to open download page', error);
        set({ errorMessage: normalizeMessage(error) });
      }
    },
  };
};

const appUpdateStore = createStore<AppUpdateStoreState>((set, get) =>
  createAppUpdateStoreState(set, get)
);

export const resetAppUpdateStoreForTests = () => {
  disposeSubscription?.();
  disposeSubscription = null;
  subscribed = false;
  inflight = null;
  appUpdateStore.setState({
    isLoaded: false,
    isLoading: false,
    errorMessage: null,
    state: null,
    settings: null,
  });
};

export const useAppUpdate = (): AppUpdateStoreState => {
  const snapshot = useStore(appUpdateStore, (state) => state);
  const hydrate = useStore(appUpdateStore, (state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return snapshot;
};
