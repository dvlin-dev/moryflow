# /embed

> Fetchx 嵌入 SDK（TypeScript）

## 概述

轻量级嵌入脚本，用于在第三方网站中集成 Fetchx API。

## 导出

```typescript
import { EmbedClient } from '@moryflow/embed';
import { detectProvider } from '@moryflow/embed/utils/provider-detect';
```

## 目录结构

```
src/
├── client.ts             # 主客户端
├── types.ts              # 类型定义
├── errors.ts             # 错误类
├── index.ts              # 入口
└── utils/
    ├── index.ts           # 工具入口
    └── provider-detect.ts # 提供商检测
```

## 使用方式

```typescript
const client = createEmbedClient({
  apiKey: 'ah_xxx',
  baseUrl: 'https://server.anyhunt.app',
});

const result = await client.fetch('https://example.com', {
  maxWidth: 640,
});
```

## 来源

从 Fetchx 仓库 `packages/embed/` 迁移。

---
