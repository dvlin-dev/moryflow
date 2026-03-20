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
