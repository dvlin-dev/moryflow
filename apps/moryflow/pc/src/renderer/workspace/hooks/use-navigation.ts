/**
 * [PROVIDES]: useNavigation - destination + agentSub（Implicit Agent + Modules）+ agentSub 持久化 + 快捷键
 * [DEPENDS]: window.desktopAPI.workspace.getLastAgentSub/setLastAgentSub
 * [POS]: Workspace Shell 的导航状态单一事实来源（React hook，含持久化）
 * [UPDATE]: 2026-02-10 - 移除未消费的 isReady；快捷键避开输入框/IME；desktopAPI 持久化写入增加同步异常保护
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_NAVIGATION_STATE,
  type AgentSub,
  type Destination,
  ensureAgent,
  go,
  normalizeAgentSub,
} from '../navigation/state';

export const useNavigation = () => {
  const [state, setState] = useState(DEFAULT_NAVIGATION_STATE);

  // Boot: destination 固定 agent；只读取/恢复 agentSub（全局偏好）
  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const stored = await window.desktopAPI.workspace.getLastAgentSub();
        if (!mounted) return;
        setState((prev) => ({ ...prev, agentSub: normalizeAgentSub(stored) }));
      } catch (error) {
        console.warn('[workspace] failed to load lastAgentSub', error);
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

  const setSub = useCallback((sub: AgentSub) => {
    setState((prev) => ensureAgent(prev, sub));
    try {
      window.desktopAPI.workspace.setLastAgentSub(sub).catch((error) => {
        console.warn('[workspace] failed to persist lastAgentSub', error);
      });
    } catch (error) {
      console.warn('[workspace] failed to persist lastAgentSub', error);
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
        setSub('chat');
        return;
      }
      if (key === '2') {
        event.preventDefault();
        setSub('workspace');
        return;
      }
      if (key === '3') {
        event.preventDefault();
        goTo('sites');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goTo, setSub]);

  return {
    destination: state.destination,
    agentSub: state.agentSub,
    go: goTo,
    setSub,
  };
};
