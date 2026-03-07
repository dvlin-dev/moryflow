/**
 * [PROVIDES]: useNavigation - destination + sidebarMode（Agent + Home/Chat）+ sidebarMode 持久化 + 快捷键
 * [DEPENDS]: window.desktopAPI.workspace.getLastSidebarMode/setLastSidebarMode
 * [POS]: Workspace Shell 的导航状态单一事实来源（React hook，含持久化）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_NAVIGATION_STATE,
  type SidebarMode,
  type Destination,
  getDestination,
  getSidebarMode,
  go,
  normalizeSidebarMode,
  setSidebarMode as applySidebarMode,
} from '../navigation/state';

export const useNavigation = () => {
  const [state, setState] = useState(DEFAULT_NAVIGATION_STATE);

  // Boot: destination 固定 agent；只读取/恢复 sidebarMode（全局偏好）
  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const stored = await window.desktopAPI.workspace.getLastSidebarMode();
        if (!mounted) return;
        const restoredSidebarMode = normalizeSidebarMode(stored);
        setState((prev) => {
          if (prev.kind !== 'agent-workspace') {
            return prev;
          }
          if (prev.sidebarMode === restoredSidebarMode) {
            return prev;
          }
          return {
            ...prev,
            sidebarMode: restoredSidebarMode,
          };
        });
      } catch (error) {
        console.warn('[workspace] failed to load lastSidebarMode', error);
      }
    };

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const goTo = useCallback((destination: Destination) => {
    setState((prev) => go(prev, destination));
  }, []);

  const setSidebarMode = useCallback((mode: SidebarMode) => {
    setState((prev) => applySidebarMode(prev, mode));
    try {
      window.desktopAPI.workspace.setLastSidebarMode(mode).catch((error) => {
        console.warn('[workspace] failed to persist lastSidebarMode', error);
      });
    } catch (error) {
      console.warn('[workspace] failed to persist lastSidebarMode', error);
    }
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.isComposing) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          (target as HTMLElement).isContentEditable
        ) {
          return;
        }
      }

      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }
      if (event.altKey || event.shiftKey) {
        return;
      }

      const key = event.key;
      if (key === '1') {
        event.preventDefault();
        setSidebarMode('chat');
        return;
      }
      if (key === '2') {
        event.preventDefault();
        setSidebarMode('home');
        return;
      }
      if (key === '3') {
        event.preventDefault();
        goTo('skills');
        return;
      }
      if (key === '4') {
        event.preventDefault();
        goTo('sites');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goTo, setSidebarMode]);

  return {
    destination: getDestination(state),
    sidebarMode: getSidebarMode(state),
    go: goTo,
    setSidebarMode,
  };
};
