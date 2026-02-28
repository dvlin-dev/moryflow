import type { ModelProviderCard } from '../types/llm';

const Moryflow: ModelProviderCard = {
  chatModels: [],
  description:
    'Moryflow Cloud uses official APIs to access AI models and measures usage with Credits tied to model tokens.',
  enabled: true,
  id: 'moryflow',
  modelsUrl: 'https://docs.moryflow.com',
  name: 'Moryflow',
  settings: {
    modelEditable: false,
    showAddNewModel: false,
    showModelFetcher: false,
  },
  showConfig: false,
  url: 'https://server.moryflow.com/api/v1',
};

export default Moryflow;

export const planCardModels = [
  'claude-sonnet-4-5-20250929',
  'gemini-3.1-pro-preview',
  'gpt-5.2',
  'deepseek-chat',
];
