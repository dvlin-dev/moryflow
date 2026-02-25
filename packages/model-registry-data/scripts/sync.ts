#!/usr/bin/env tsx
/**
 * [INPUT]: LiteLLM GitHub 上的模型数据
 * [OUTPUT]: 本地 JSON 文件 (models.json, providers.json, meta.json)
 * [POS]: 构建时同步脚本，由 prebuild 钩子自动执行
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ModelInfo, ProviderInfo, SyncMeta, UpstreamRegistry } from '../src/types';
import { transformModel } from '../src/transformer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../src/data');
const UPSTREAM_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

/**
 * 从上游拉取数据
 */
async function fetchUpstream(): Promise<UpstreamRegistry> {
  console.log('📡 Fetching upstream model data...');

  const response = await fetch(UPSTREAM_URL, {
    headers: {
      'User-Agent': 'moryflow-model-registry-sync',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<UpstreamRegistry>;
}

/**
 * 转换并处理模型数据
 */
function processModels(upstream: UpstreamRegistry): ModelInfo[] {
  const models = Object.entries(upstream)
    .filter(([id]) => !id.startsWith('sample_'))
    .map(([id, model]) => transformModel(id, model))
    .filter((m) => m.mode === 'chat' || m.mode === 'completion');

  // 按服务商和名称排序
  models.sort((a, b) => {
    const providerCompare = a.provider.localeCompare(b.provider);
    if (providerCompare !== 0) return providerCompare;
    return a.displayName.localeCompare(b.displayName);
  });

  return models;
}

/**
 * 统计服务商信息
 */
function aggregateProviders(models: ModelInfo[]): ProviderInfo[] {
  const counts = models.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = { name: model.providerName, count: 0 };
      }
      acc[model.provider].count++;
      return acc;
    },
    {} as Record<string, { name: string; count: number }>
  );

  return Object.entries(counts)
    .map(([id, { name, count }]) => ({ id, name, modelCount: count }))
    .sort((a, b) => b.modelCount - a.modelCount);
}

/**
 * 写入数据文件
 */
function writeDataFiles(models: ModelInfo[], providers: ProviderInfo[]): void {
  mkdirSync(DATA_DIR, { recursive: true });

  const modelsPath = join(DATA_DIR, 'models.json');
  writeFileSync(modelsPath, JSON.stringify(models, null, 2));
  console.log(`✅ Written ${models.length} models to models.json`);

  const providersPath = join(DATA_DIR, 'providers.json');
  writeFileSync(providersPath, JSON.stringify(providers, null, 2));
  console.log(`✅ Written ${providers.length} providers to providers.json`);

  const meta: SyncMeta = {
    syncedAt: new Date().toISOString(),
    modelCount: models.length,
    providerCount: providers.length,
    source: UPSTREAM_URL,
  };
  const metaPath = join(DATA_DIR, 'meta.json');
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`✅ Written metadata to meta.json`);
}

/**
 * 读取 JSON 数组文件
 */
function readJsonArray(fileName: string): unknown[] | null {
  const filePath = join(DATA_DIR, fileName);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 检查是否有可用缓存数据（非空）
 */
function hasUsableCachedData(): boolean {
  const models = readJsonArray('models.json');
  const providers = readJsonArray('providers.json');

  if (!models || !providers) {
    return false;
  }

  return models.length > 0 && providers.length > 0;
}

/**
 * 主函数
 */
async function sync(): Promise<void> {
  try {
    const upstream = await fetchUpstream();

    // 过滤掉特殊条目
    delete upstream.sample_spec;

    console.log(`📦 Processing ${Object.keys(upstream).length} models...`);

    const models = processModels(upstream);
    const providers = aggregateProviders(models);

    if (models.length === 0 || providers.length === 0) {
      throw new Error('Upstream sync produced an empty registry snapshot');
    }

    writeDataFiles(models, providers);

    console.log('🎉 Sync completed!');
  } catch (error) {
    console.error('❌ Sync failed:', error);

    // 降级处理：仅允许使用可用缓存（非空）
    if (hasUsableCachedData()) {
      console.log('⚠️ Using cached non-empty snapshot as fallback');
      return;
    }

    throw new Error('Model registry sync failed and no usable cached snapshot is available', {
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }
}

sync().catch((error) => {
  console.error('❌ Sync aborted:', error);
  process.exitCode = 1;
});
