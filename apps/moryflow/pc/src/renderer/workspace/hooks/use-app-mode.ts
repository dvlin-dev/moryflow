/**
 * [PROVIDES]: useAppMode - App Mode 状态（Chat/Workspace/Sites）+ 持久化 + 快捷键
 * [DEPENDS]: window.desktopAPI.workspace
 * [POS]: Workspace Shell 的顶层 Mode 状态单一事实来源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useState } from 'react';

export type AppMode = 'chat' | 'workspace' | 'sites';

const normalizeMode = (value: unknown): AppMode => {
  if (value === 'chat' || value === 'workspace' || value === 'sites') {
    return value;
  }
  return 'chat';
};

export const useAppMode = () => {
  const [mode, setModeState] = useState<AppMode>('chat');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const stored = await window.desktopAPI.workspace.getLastMode();
        if (!mounted) return;
        setModeState(normalizeMode(stored));
      } catch (error) {
        console.warn('[workspace] failed to load lastMode', error);
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    };

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const setMode = useCallback((next: AppMode) => {
    setModeState(next);
    window.desktopAPI.workspace.setLastMode(next).catch((error) => {
      console.warn('[workspace] failed to persist lastMode', error);
    });
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }
      if (event.altKey || event.shiftKey) {
        return;
      }

      const key = event.key;
      if (key === '1') {
        event.preventDefault();
        setMode('chat');
        return;
      }
      if (key === '2') {
        event.preventDefault();
        setMode('workspace');
        return;
      }
      if (key === '3') {
        event.preventDefault();
        setMode('sites');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setMode]);

  return {
    mode,
    setMode,
    isReady: ready,
  };
};
