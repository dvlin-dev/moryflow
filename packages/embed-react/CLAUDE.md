# /embed-react

> Fetchx React 嵌入组件

## 概述

/embed 的 React 封装，提供 Hooks 和组件方式集成 Fetchx API。

## 依赖

- `/embed` - 核心嵌入逻辑
- `react` ^18 || ^19

## 导出

```typescript
import { useEmbed, EmbedProvider } from '@moryflow/embed-react';
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
import { EmbedProvider, useEmbed } from '@moryflow/embed-react';

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
