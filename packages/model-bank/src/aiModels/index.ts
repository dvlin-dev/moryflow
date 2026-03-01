import { type AiFullModelCard, type LobeDefaultAiModelListItem } from '../types/aiModel';
import { default as azure } from './azure';
import { default as bedrock } from './bedrock';
import { default as fal } from './fal';
import { default as huggingface } from './huggingface';
import { default as vertexai } from './vertexai';

type ModelsMap = Record<string, AiFullModelCard[]>;

const buildDefaultModelList = (map: ModelsMap): LobeDefaultAiModelListItem[] => {
  let models: LobeDefaultAiModelListItem[] = [];

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

export const LOBE_DEFAULT_MODEL_LIST = buildDefaultModelList({
  azure,
  bedrock,
  fal,
  huggingface,
  vertexai,
});

export { default as azure } from './azure';
export { default as bedrock } from './bedrock';
export { default as fal, fluxSchnellParamsSchema } from './fal';
export { default as huggingface } from './huggingface';
export { default as vertexai } from './vertexai';
