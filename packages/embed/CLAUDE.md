# /embed

> Fetchx 嵌入 SDK（TypeScript）

## 概述

轻量级嵌入脚本，用于在第三方网站中集成 Fetchx API。

## 导出

```typescript
import { EmbedClient } from '@anyhunt/embed';
import { detectProvider } from '@anyhunt/embed/utils/provider-detect';
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

## 近期变更

- 统一本地导入路径（去除 `.ts` 后缀），避免编译后路径不一致
- 基础 URL 归一化，避免双斜杠请求路径
- 补齐文件头注释与协议说明

---

_版本: 1.1 | 更新日期: 2026-01-24_
