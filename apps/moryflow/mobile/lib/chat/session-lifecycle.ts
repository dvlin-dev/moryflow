/**
 * [PROVIDES]: deleteSessionWithLifecycle, useStopCurrentSessionOnChange
 * [DEPENDS]: react
 * [POS]: Mobile Chat 会话删除/切换时的运行时生命周期保护
 * [UPDATE]: 2026-03-07 - 删除 active session 前先 stop；切换 session 时自动停止上一轮运行
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect } from 'react';

type StopChatRun = () => void | Promise<void>;
type DeleteChatSession = (sessionId: string) => void | Promise<void>;

type DeleteSessionWithLifecycleInput = {
  sessionId: string;
  activeSessionId: string | null;
  stop: StopChatRun;
  deleteSession: DeleteChatSession;
};

export const deleteSessionWithLifecycle = async (
  input: DeleteSessionWithLifecycleInput
): Promise<void> => {
  if (input.sessionId === input.activeSessionId) {
    await input.stop();
  }

  await input.deleteSession(input.sessionId);
};

export const useStopCurrentSessionOnChange = (
  activeSessionId: string | null,
  stop: StopChatRun
): void => {
  useEffect(() => {
    return () => {
      void stop();
    };
  }, [activeSessionId, stop]);
};
