# /embed-react

> Fetchx React 嵌入组件

## 概述

/embed 的 React 封装，提供 Hooks 和组件方式集成 Fetchx API。

## 依赖

- `/embed` - 核心嵌入逻辑
- `react` ^18 || ^19

## 导出

```typescript
import { useEmbed, EmbedProvider } from '@anyhunt/embed-react';
```

## 目录结构

```
src/
├── hooks/
│   ├── useEmbed.ts         # 主 Hook
│   ├── useEmbedContext.ts  # Context 读取
│   └── index.ts            # Hooks 入口
├── components/
│   ├── Embed.tsx           # 通用嵌入组件
│   ├── EmbedProvider.tsx   # Provider
│   └── EmbedSkeleton.tsx   # Skeleton
├── context.tsx             # Context 定义
└── index.ts                # 入口
```

## 使用方式

```tsx
import { EmbedProvider, useEmbed } from '@anyhunt/embed-react';

function App() {
  return (
    <EmbedProvider apiKey="ah_xxx">
      <MyComponent />
    </EmbedProvider>
  );
}

function MyComponent() {
  const { data, isLoading, error, refetch } = useEmbed('https://example.com', {
    maxWidth: 640,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

## 来源

从 Fetchx 仓库 `packages/embed-react/` 迁移。

---

## 近期变更

- Embed 支持 photo/link 类型 fallback 渲染（html 缺失时不再空白）
- 补齐 client 边界与文件头注释，统一本地导入路径
- 新增 Embed 单元测试基线（photo/link 渲染）

---

_版本: 1.1 | 更新日期: 2026-01-24_
