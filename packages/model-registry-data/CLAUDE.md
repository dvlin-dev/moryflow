# model-registry-data

> LiteLLM 模型数据注册表，提供模型搜索和自动填充功能
> 最近更新：2026-02-26（根构建链路新增 `prepare:model-registry-data` 兜底脚本，保证干净 CI 中 `src/data/*.json` 存在，避免 postinstall `TS2307`）
> 最近更新：2026-02-25（修复 dist 运行时读取 data JSON 失败导致模型数为 0；改为静态 JSON 导入并新增构建产物回归测试）

## 概述

从 LiteLLM 开源数据源同步 1700+ 个 AI 模型的元数据，提供：

- 构建时数据同步（prebuild 钩子）
- 模糊搜索（Fuse.js）
- 模型参数自动填充

## 目录结构

```
packages/model-registry-data/
├── scripts/
│   └── sync.ts          # 构建时同步脚本
├── test/
│   └── dist-data.test.mjs # 构建产物回归测试（避免 runtime require data 文件）
├── src/
│   ├── types.ts         # 类型定义
│   ├── transformer.ts   # 数据转换
│   ├── search.ts        # 搜索功能
│   ├── index.ts         # 导出入口
│   └── data/            # 同步生成的数据（gitignore）
│       ├── models.json
│       ├── providers.json
│       └── meta.json
└── package.json
```

## 使用方式

```typescript
import { searchModels, getModelById, getProviders } from '@moryflow/model-registry-data';

// 搜索模型
const results = searchModels({ query: 'gpt-4', limit: 10 });

// 获取单个模型
const model = getModelById('gpt-4o');

// 获取所有服务商
const providers = getProviders();
```

## 数据同步

```bash
# 手动同步
pnpm --filter @moryflow/model-registry-data sync

# 构建时自动同步（prebuild 钩子）
pnpm --filter @moryflow/model-registry-data build

# 回归测试（包含构建）
pnpm --filter @moryflow/model-registry-data test:unit
```

- 同步脚本通过 `node --import tsx scripts/sync.ts` 运行；在网络受限/上游不可用时应使用缓存数据继续构建（不要让构建因同步失败而失败）。
- 搜索模块使用静态 JSON 导入（`models/providers/meta`）参与打包，禁止回退到运行时 `require('./data/*.json')`，避免 renderer 环境出现 `Search 0 models`。
- 根目录 `build:packages` 会先执行 `scripts/ensure-model-registry-data.cjs`，仅在文件缺失时创建最小兜底 JSON，防止干净 checkout 在 `postinstall` 阶段编译失败。

## 数据源

- **上游**: [LiteLLM model_prices_and_context_window.json](https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json)
- **更新频率**: 每次构建时同步

## 集成位置

| 位置                                          | 用途                               |
| --------------------------------------------- | ---------------------------------- |
| `apps/pc/.../add-model-dialog.tsx`            | PC 端添加模型时搜索和自动填充      |
| `apps/moryflow/admin/.../ModelFormDialog.tsx` | Admin 后台添加模型时搜索和自动填充 |

## 依赖

- `fuse.js` - 模糊搜索
- `tsx` - 运行同步脚本
- `tsup` - 构建打包
