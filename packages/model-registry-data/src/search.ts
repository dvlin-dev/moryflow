/**
 * [INPUT]: SearchOptions - 搜索条件
 * [OUTPUT]: ModelInfo[] - 匹配的模型列表
 * [POS]: 搜索服务，提供模糊搜索和精确查询
 */

import Fuse from 'fuse.js';
import type { ModelInfo, ProviderInfo, SearchOptions, SyncMeta } from './types';
import modelsData from './data/models.json';
import providersData from './data/providers.json';
import metaData from './data/meta.json';

// 通过静态 JSON 导入确保打包后不会依赖 dist/data 运行时文件
let modelsCache: ModelInfo[] | null = null;
let providersCache: ProviderInfo[] | null = null;
let metaCache: SyncMeta | null | undefined = undefined; // undefined = 未加载
let fuseInstance: Fuse<ModelInfo> | null = null;

/**
 * 加载模型数据
 */
function loadModels(): ModelInfo[] {
  if (modelsCache) return modelsCache;

  modelsCache = Array.isArray(modelsData) ? (modelsData as ModelInfo[]) : [];

  return modelsCache;
}

/**
 * 加载服务商数据
 */
function loadProviders(): ProviderInfo[] {
  if (providersCache) return providersCache;

  providersCache = Array.isArray(providersData) ? (providersData as ProviderInfo[]) : [];

  return providersCache;
}

/**
 * 加载元数据
 */
function loadMeta(): SyncMeta | null {
  if (metaCache !== undefined) return metaCache;

  metaCache = metaData ? (metaData as SyncMeta) : null;

  return metaCache;
}

/**
 * 获取 Fuse 搜索实例
 */
function getFuseInstance(): Fuse<ModelInfo> {
  if (fuseInstance) return fuseInstance;

  const models = loadModels();
  fuseInstance = new Fuse(models, {
    keys: [
      { name: 'id', weight: 2 },
      { name: 'displayName', weight: 2 },
      { name: 'provider', weight: 1 },
      { name: 'providerName', weight: 1 },
    ],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 2,
  });

  return fuseInstance;
}

/**
 * 搜索模型
 */
export function searchModels(options: SearchOptions): ModelInfo[] {
  const { query, limit = 20, provider, mode, includeDeprecated = false } = options;

  const models = loadModels();
  let results: ModelInfo[];
  const hasQuery = query.trim().length > 0;

  if (hasQuery) {
    // 有搜索词时，使用 Fuse.js 模糊搜索（结果已按相关性排序）
    const fuse = getFuseInstance();
    const fuseResults = fuse.search(query);
    results = fuseResults.map((r) => r.item);
  } else {
    // 无搜索词时，按 provider 排序
    results = [...models].sort((a, b) => a.provider.localeCompare(b.provider));
  }

  // 应用过滤器
  results = results.filter((model) => {
    if (provider && model.provider !== provider) return false;
    if (mode && model.mode !== mode) return false;
    if (!includeDeprecated && model.deprecated) return false;
    return true;
  });

  return results.slice(0, limit);
}

/**
 * 获取所有服务商
 */
export function getProviders(): ProviderInfo[] {
  return loadProviders();
}

/**
 * 根据 ID 获取模型
 */
export function getModelById(modelId: string): ModelInfo | null {
  const models = loadModels();
  return models.find((m) => m.id === modelId) || null;
}

/**
 * 获取所有模型
 */
export function getAllModels(): ModelInfo[] {
  return loadModels();
}

/**
 * 获取模型总数
 */
export function getModelCount(): number {
  return loadModels().length;
}

/**
 * 获取同步元数据
 */
export function getSyncMeta(): SyncMeta | null {
  return loadMeta();
}

/**
 * 重置缓存（用于测试或强制刷新）
 */
export function resetCache(): void {
  modelsCache = null;
  providersCache = null;
  metaCache = undefined;
  fuseInstance = null;
}
