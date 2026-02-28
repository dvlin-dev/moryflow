import type { ModelProviderCard } from '../types/llm';

const PPIO: ModelProviderCard = {
  chatModels: [],
  checkModel: 'deepseek/deepseek-r1-distill-qwen-32b',
  description:
    'PPIO provides reliable, cost-effective open-model APIs, including DeepSeek, Llama, Qwen, and other leading models.',
  disableBrowserRequest: true,
  id: 'ppio',
  modelList: { showModelFetcher: true },
  modelsUrl: 'https://ppinfra.com/llm-api',
  name: 'PPIO',
  settings: {
    disableBrowserRequest: true,
    sdkType: 'openai',
    showModelFetcher: true,
  },
  url: 'https://ppinfra.com/user/register',
};

export default PPIO;
