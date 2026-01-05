# 动态模型注册表

## 需求

利用 LiteLLM 开源数据，实现模型信息自动填充：
- 构建时同步最新模型数据
- PC 设置弹窗：模型搜索 + 自动填充参数
- Admin 后台：模型搜索 + 自动填充参数
- 离线可用（数据在本地）

## 技术方案

### 架构

```
LiteLLM GitHub (model_prices_and_context_window.json)
         │
         │ 构建时拉取（prebuild 脚本）
         ▼
packages/model-registry-data/
├── scripts/sync.ts        # 同步脚本
├── src/
│   ├── data/
│   │   ├── models.json    # 模型数据（自动生成）
│   │   └── providers.json # 服务商列表（自动生成）
│   ├── transformer.ts     # 数据转换
│   └── search.ts          # Fuse.js 搜索
         │
    ┌────┴────┐
    ▼         ▼
 apps/pc   apps/admin
```

### 数据结构

```typescript
// 转换后的模型信息
interface ModelInfo {
  id: string                 // 原始模型 ID
  displayName: string        // 显示名称
  provider: string           // 服务商 ID
  providerName: string       // 服务商名称
  mode: string               // chat | embedding | ...
  maxContextTokens: number
  maxOutputTokens: number
  inputPricePerMillion: number   // $/1M tokens
  outputPricePerMillion: number
  capabilities: {
    vision: boolean
    tools: boolean
    reasoning: boolean
    json: boolean
    audio: boolean
    pdf: boolean
  }
  deprecated: boolean
}
```

### 核心逻辑（伪代码）

```
# 构建时同步
sync():
  upstream = fetch(LITELLM_URL)
  models = upstream.map(transformModel)
  providers = groupByProvider(models)
  writeJson('models.json', models)
  writeJson('providers.json', providers)

# 模型搜索（同步方法，数据已在本地）
searchModels({ query, limit, provider, mode }):
  if query:
    results = fuse.search(query)
  else:
    results = allModels

  results = results.filter(by provider, mode, deprecated)
  return results.slice(0, limit)

# UI 自动填充
handleSelectModel(model):
  setModelId(model.id)
  setContextSize(model.maxContextTokens)
  setCapabilities(model.capabilities)
  # ...
```

## 代码索引

| 模块 | 路径 |
|------|------|
| 同步脚本 | `packages/model-registry-data/scripts/sync.ts` |
| 类型定义 | `packages/model-registry-data/src/types.ts` |
| 数据转换 | `packages/model-registry-data/src/transformer.ts` |
| 搜索功能 | `packages/model-registry-data/src/search.ts` |
| PC 添加模型弹窗 | `apps/pc/src/renderer/components/settings-dialog/components/providers/add-model-dialog.tsx` |
| Admin 模型表单 | `apps/admin/src/features/models/components/ModelFormDialog.tsx` |
