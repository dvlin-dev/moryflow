import type { ChatModelCard, ModelProviderCard } from '../types/llm';

import AnthropicProvider from './anthropic';
import AzureProvider from './azure';
import AzureAIProvider from './azureai';
import BedrockProvider from './bedrock';
import CloudflareProvider from './cloudflare';
import DeepSeekProvider from './deepseek';
import FalProvider from './fal';
import GithubProvider from './github';
import GoogleProvider from './google';
import GroqProvider from './groq';
import HuggingFaceProvider from './huggingface';
import HunyuanProvider from './hunyuan';
import MinimaxProvider from './minimax';
import MistralProvider from './mistral';
import MoonshotProvider from './moonshot';
import NvidiaProvider from './nvidia';
import OllamaProvider from './ollama';
import OpenAIProvider from './openai';
import OpenRouterProvider from './openrouter';
import PerplexityProvider from './perplexity';
import QwenProvider from './qwen';
import VertexAIProvider from './vertexai';
import VolcengineProvider from './volcengine';
import XAIProvider from './xai';
import ZenMuxProvider from './zenmux';
import ZhiPuProvider from './zhipu';

/**
 * @deprecated
 */
export const LOBE_DEFAULT_MODEL_LIST: ChatModelCard[] = [
  OpenAIProvider.chatModels,
  QwenProvider.chatModels,
  ZhiPuProvider.chatModels,
  BedrockProvider.chatModels,
  DeepSeekProvider.chatModels,
  GoogleProvider.chatModels,
  GroqProvider.chatModels,
  GithubProvider.chatModels,
  MinimaxProvider.chatModels,
  MistralProvider.chatModels,
  MoonshotProvider.chatModels,
  OllamaProvider.chatModels,
  OpenRouterProvider.chatModels,
  PerplexityProvider.chatModels,
  AnthropicProvider.chatModels,
  HuggingFaceProvider.chatModels,
  XAIProvider.chatModels,
  NvidiaProvider.chatModels,
  HunyuanProvider.chatModels,
  CloudflareProvider.chatModels,
  AzureProvider.chatModels,
  AzureAIProvider.chatModels,
  VertexAIProvider.chatModels,
  VolcengineProvider.chatModels,
  FalProvider.chatModels,
  ZenMuxProvider.chatModels,
].flat();

export const DEFAULT_MODEL_PROVIDER_LIST = [
  AnthropicProvider,
  GoogleProvider,
  OpenAIProvider,
  DeepSeekProvider,
  MoonshotProvider,
  BedrockProvider,
  VertexAIProvider,
  { ...AzureProvider, chatModels: [] },
  AzureAIProvider,
  OpenRouterProvider,
  FalProvider,
  OllamaProvider,
  HuggingFaceProvider,
  CloudflareProvider,
  GithubProvider,
  NvidiaProvider,
  GroqProvider,
  PerplexityProvider,
  MistralProvider,
  XAIProvider,
  QwenProvider,
  HunyuanProvider,
  ZhiPuProvider,
  VolcengineProvider,
  MinimaxProvider,
  ZenMuxProvider,
];

export const filterEnabledModels = (provider: ModelProviderCard) => {
  return provider.chatModels.filter((v) => v.enabled).map((m) => m.id);
};

export const isProviderDisableBrowserRequest = (id: string) => {
  const provider = DEFAULT_MODEL_PROVIDER_LIST.find((v) => v.id === id && v.disableBrowserRequest);
  return !!provider;
};

export { default as AnthropicProviderCard } from './anthropic';
export { default as AzureProviderCard } from './azure';
export { default as AzureAIProviderCard } from './azureai';
export { default as BedrockProviderCard } from './bedrock';
export { default as CloudflareProviderCard } from './cloudflare';
export { default as DeepSeekProviderCard } from './deepseek';
export { default as FalProviderCard } from './fal';
export { default as GithubProviderCard } from './github';
export { default as GoogleProviderCard } from './google';
export { default as GroqProviderCard } from './groq';
export { default as HuggingFaceProviderCard } from './huggingface';
export { default as HunyuanProviderCard } from './hunyuan';
export { default as MinimaxProviderCard } from './minimax';
export { default as MistralProviderCard } from './mistral';
export { default as MoonshotProviderCard } from './moonshot';
export { default as NvidiaProviderCard } from './nvidia';
export { default as OllamaProviderCard } from './ollama';
export { default as OpenAIProviderCard } from './openai';
export { default as OpenRouterProviderCard } from './openrouter';
export { default as PerplexityProviderCard } from './perplexity';
export { default as QwenProviderCard } from './qwen';
export { default as VertexAIProviderCard } from './vertexai';
export { default as VolcengineProviderCard } from './volcengine';
export { default as XAIProviderCard } from './xai';
export { default as ZenMuxProviderCard } from './zenmux';
export { default as ZhiPuProviderCard } from './zhipu';
