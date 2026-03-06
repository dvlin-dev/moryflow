/**
 * [INPUT]: 首次升级提示消费写入请求
 * [OUTPUT]: 首次升级提示消费读取结果（全局一次）
 * [POS]: Chat 权限升级提示持久化状态（electron-store）
 * [UPDATE]: 2026-03-03 - 新增原子消费接口 consumeFullAccessUpgradePromptOnce，避免“仅查询即消费”
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
