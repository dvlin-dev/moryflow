/**
 * [INPUT]: 首次升级提示消费写入请求
 * [OUTPUT]: 首次升级提示消费读取结果（全局一次）
 * [POS]: Chat 权限升级提示持久化状态（electron-store）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import Store from 'electron-store';

type FullAccessUpgradePromptStoreShape = {
  fullAccessUpgradePromptConsumed: boolean;
};

const PROMPT_CONSUMED_KEY = 'fullAccessUpgradePromptConsumed' as const;

const promptStore = new Store<FullAccessUpgradePromptStoreShape>({
  name: 'chat-permission-prompt',
  defaults: {
    fullAccessUpgradePromptConsumed: false,
  },
});

export const isFullAccessUpgradePromptConsumed = (): boolean =>
  promptStore.get(PROMPT_CONSUMED_KEY) === true;

export const consumeFullAccessUpgradePrompt = (): void => {
  promptStore.set(PROMPT_CONSUMED_KEY, true);
};

export const consumeFullAccessUpgradePromptOnce = (): boolean => {
  if (isFullAccessUpgradePromptConsumed()) {
    return false;
  }
  consumeFullAccessUpgradePrompt();
  return true;
};

export const __resetFullAccessUpgradePromptStoreForTest = (): void => {
  promptStore.set(PROMPT_CONSUMED_KEY, false);
};
