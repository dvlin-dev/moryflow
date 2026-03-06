import type { ModelProviderCard } from '../types/llm';

// ref :https://openrouter.ai/docs#models
const OpenRouter: ModelProviderCard = {
  chatModels: [],
  checkModel: 'minimax/minimax-m2.5-20260211',
  description:
    'OpenRouter provides access to many frontier models from OpenAI, Anthropic, LLaMA, and more, letting users pick the best model and price for their use case.',
  id: 'openrouter',
  modelList: { showModelFetcher: true },
  modelsUrl: 'https://openrouter.ai/models',
  name: 'OpenRouter',
  settings: {
    // OpenRouter don't support browser request
    // 基于上游兼容性反馈，浏览器直连请求默认关闭
    disableBrowserRequest: true,
    proxyUrl: {
      placeholder: 'https://openrouter.ai/api/v1',
    },
    sdkType: 'openai',
    searchMode: 'params',
    showModelFetcher: true,
  },
  url: 'https://openrouter.ai',
};

export default OpenRouter;
