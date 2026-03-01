import type { ChatModelCard, ModelProviderCard } from '../types/llm';

import AzureProvider from './azure';
import BedrockProvider from './bedrock';
import FalProvider from './fal';
import HuggingFaceProvider from './huggingface';
import VertexAIProvider from './vertexai';

/**
 * @deprecated
 */
export const LOBE_DEFAULT_MODEL_LIST: ChatModelCard[] = [
  AzureProvider.chatModels,
  BedrockProvider.chatModels,
  FalProvider.chatModels,
  HuggingFaceProvider.chatModels,
  VertexAIProvider.chatModels,
].flat();

export const DEFAULT_MODEL_PROVIDER_LIST = [
  BedrockProvider,
  { ...AzureProvider, chatModels: [] },
  FalProvider,
  HuggingFaceProvider,
  VertexAIProvider,
];

export const filterEnabledModels = (provider: ModelProviderCard) => {
  return provider.chatModels.filter((v) => v.enabled).map((m) => m.id);
};

export const isProviderDisableBrowserRequest = (id: string) => {
  const provider = DEFAULT_MODEL_PROVIDER_LIST.find((v) => v.id === id && v.disableBrowserRequest);
  return !!provider;
};

export { default as AzureProviderCard } from './azure';
export { default as BedrockProviderCard } from './bedrock';
export { default as FalProviderCard } from './fal';
export { default as HuggingFaceProviderCard } from './huggingface';
export { default as VertexAIProviderCard } from './vertexai';
