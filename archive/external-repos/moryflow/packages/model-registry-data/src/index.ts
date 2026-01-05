/**
 * [PROVIDES]: 模型搜索、服务商列表、模型详情查询
 * [DEPENDS]: types.ts, search.ts
 * [POS]: 包导出入口
 */

// 类型导出
export type {
  ModelInfo,
  ModelCapabilities,
  ProviderInfo,
  SearchOptions,
  SyncMeta,
  UpstreamModel,
  UpstreamRegistry,
} from './types'

// 搜索功能导出
export {
  searchModels,
  getProviders,
  getModelById,
  getAllModels,
  getModelCount,
  getSyncMeta,
  resetCache,
} from './search'

// 转换器导出（用于外部扩展）
export { transformModel, PROVIDER_NAMES } from './transformer'
