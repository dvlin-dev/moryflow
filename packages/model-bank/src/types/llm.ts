/**
 * [DEFINES]: modelProviders 所需的最小 LLM 类型（ProviderCard / ChatModelCard）
 * [USED_BY]: src/modelProviders/*.ts
 * [POS]: 解除对上游应用层 `@/types/llm` 别名依赖，保证 model-bank 可独立编译
 */
import type { ModelSearchImplementType } from './aiModel';

export type ProviderSdkType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'xai'
  | 'azure'
  | 'openrouter'
  | 'openai-compatible'
  | string;

export interface ChatModelCard {
  enabled?: boolean;
  id: string;
  [key: string]: unknown;
}

export interface ModelProviderSettings {
  defaultShowBrowserRequest?: boolean;
  disableBrowserRequest?: boolean;
  modelRecommend?: string[];
  proxyUrl?: {
    placeholder?: string;
    [key: string]: unknown;
  };
  responseAnimation?:
    | 'smooth'
    | {
        speed?: number;
        text?: string;
      }
    | boolean;
  sdkType?: ProviderSdkType;
  searchMode?: ModelSearchImplementType;
  showDeployName?: boolean;
  showModelFetcher?: boolean;
  supportResponsesApi?: boolean;
  [key: string]: unknown;
}

export interface ModelProviderCard {
  chatModels: ChatModelCard[];
  id: string;
  name: string;
  settings?: ModelProviderSettings;
  [key: string]: unknown;
}
