import {
  THINKING_LEVEL_LABELS as SHARED_THINKING_LEVEL_LABELS,
  getDefaultThinkingLevelsForProvider,
} from '@moryflow/api';

export const PROVIDER_PANEL_HEIGHT = '100%';
export const PROVIDER_PANEL_MAX_HEIGHT = 'none';

export const DEFAULT_CUSTOM_MODEL_CONTEXT = 128_000;
export const DEFAULT_CUSTOM_MODEL_OUTPUT = 16_384;
export const THINKING_LEVEL_LABELS = SHARED_THINKING_LEVEL_LABELS;

export const getThinkingLevelsBySdkType = (sdkType: string): string[] => {
  return getDefaultThinkingLevelsForProvider(sdkType);
};
