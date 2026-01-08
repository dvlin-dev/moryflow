# @aiget/embed

> Fetchx 嵌入脚本（Vanilla JavaScript）

## 概述

轻量级嵌入脚本，用于在第三方网站中集成 Fetchx API。

## 导出

```typescript
import { EmbedClient } from '@aiget/embed';
import { detectProvider } from '@aiget/embed/utils/provider-detect';
```

## 目录结构

```
src/
├── client.ts           # 主客户端
├── types.ts            # 类型定义
├── errors.ts           # 错误类
├── index.ts            # 入口
└── utils/
    ├── provider-detect.ts  # 提供商检测
    └── helpers.ts          # 工具函数
```

## 使用方式

```typescript
const client = createEmbedClient({
  apiKey: 'ag_xxx',
  baseUrl: 'https://aiget.dev',
});

const result = await client.fetch({
  url: 'https://example.com',
  maxWidth: 640,
});
```

## 来源

从 Fetchx 仓库 `packages/embed/` 迁移。

---

_版本: 1.0 | 迁移日期: 2026-01-05_
