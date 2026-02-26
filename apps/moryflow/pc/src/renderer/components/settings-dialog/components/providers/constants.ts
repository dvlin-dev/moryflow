export const PROVIDER_PANEL_HEIGHT = '100%';
export const PROVIDER_PANEL_MAX_HEIGHT = 'none';

export const DEFAULT_CUSTOM_MODEL_CONTEXT = 128_000;
export const DEFAULT_CUSTOM_MODEL_OUTPUT = 16_384;

export const THINKING_LEVEL_LABELS: Record<string, string> = {
  off: 'Off',
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  max: 'Max',
  xhigh: 'X-High',
};

export const getThinkingLevelsBySdkType = (sdkType: string): string[] => {
  switch (sdkType) {
    case 'openrouter':
      return ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
    case 'anthropic':
      return ['off', 'low', 'medium', 'high', 'max'];
    case 'google':
      return ['off', 'low', 'medium', 'high'];
    case 'openai':
    case 'openai-compatible':
    case 'xai':
      return ['off', 'low', 'medium', 'high'];
    default:
      return ['off', 'low', 'medium', 'high'];
  }
};
