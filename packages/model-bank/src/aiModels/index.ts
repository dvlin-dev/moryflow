import { type AiFullModelCard, type DefaultAiModelListItem } from '../types/aiModel';
import { default as anthropic } from './anthropic';
import { default as azure } from './azure';
import { default as azureai } from './azureai';
import { default as bedrock } from './bedrock';
import { default as cloudflare } from './cloudflare';
import { default as deepseek } from './deepseek';
import { default as fal } from './fal';
import { default as github } from './github';
import { default as google } from './google';
import { default as groq } from './groq';
import { default as huggingface } from './huggingface';
import { default as hunyuan } from './hunyuan';
import { default as minimax } from './minimax';
import { default as mistral } from './mistral';
import { default as moonshot } from './moonshot';
import { default as nvidia } from './nvidia';
import { default as ollama } from './ollama';
import { default as openai } from './openai';
import { default as openrouter } from './openrouter';
import { default as perplexity } from './perplexity';
import { default as qwen } from './qwen';
import { default as vertexai } from './vertexai';
import { default as volcengine } from './volcengine';
import { default as xai } from './xai';
import { default as zenmux } from './zenmux';
import { default as zhipu } from './zhipu';

type ModelsMap = Record<string, AiFullModelCard[]>;

const buildDefaultModelList = (map: ModelsMap): DefaultAiModelListItem[] => {
  let models: DefaultAiModelListItem[] = [];

  Object.entries(map).forEach(([provider, providerModels]) => {
    const newModels = providerModels.map((model) => ({
      ...model,
      abilities: model.abilities ?? {},
      enabled: model.enabled || false,
      providerId: provider,
      source: 'builtin',
    }));
    models = models.concat(newModels);
  });

  return models;
};

export const DEFAULT_AI_MODEL_LIST = buildDefaultModelList({
  anthropic,
  azure,
  azureai,
  bedrock,
  cloudflare,
  deepseek,
  fal,
  github,
  google,
  groq,
  huggingface,
  hunyuan,
  minimax,
  mistral,
  moonshot,
  nvidia,
  ollama,
  openai,
  openrouter,
  perplexity,
  qwen,
  vertexai,
  volcengine,
  xai,
  zenmux,
  zhipu,
});

export { default as anthropic } from './anthropic';
export { default as azure } from './azure';
export { default as azureai } from './azureai';
export { default as bedrock } from './bedrock';
export { default as cloudflare } from './cloudflare';
export { default as deepseek } from './deepseek';
export { default as fal, fluxSchnellParamsSchema } from './fal';
export { default as github } from './github';
export { default as google } from './google';
export { default as groq } from './groq';
export { default as huggingface } from './huggingface';
export { default as hunyuan } from './hunyuan';
export { default as minimax } from './minimax';
export { default as mistral } from './mistral';
export { default as moonshot } from './moonshot';
export { default as nvidia } from './nvidia';
export { default as ollama } from './ollama';
export { gptImage1ParamsSchema, default as openai, openaiChatModels } from './openai';
export { default as openrouter } from './openrouter';
export { default as perplexity } from './perplexity';
export { default as qwen } from './qwen';
export { default as vertexai } from './vertexai';
export { default as volcengine } from './volcengine';
export { default as xai } from './xai';
export { default as zenmux } from './zenmux';
export { default as zhipu } from './zhipu';
