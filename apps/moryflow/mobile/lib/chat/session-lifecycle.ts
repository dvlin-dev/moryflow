/**
 * [PROVIDES]: deleteSessionWithLifecycle, useStopCurrentSessionOnChange
 * [DEPENDS]: react
 * [POS]: Mobile Chat 会话删除/切换时的运行时生命周期保护
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
