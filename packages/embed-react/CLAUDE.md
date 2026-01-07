# @aiget/embed-react

> Fetchx React 嵌入组件

## 概述

@aiget/embed 的 React 封装，提供 Hooks 和组件方式集成 Fetchx API。

## 依赖

- `@aiget/embed` - 核心嵌入逻辑
- `react` ^18 || ^19

## 导出

```typescript
import { useEmbed, EmbedProvider } from '@aiget/embed-react';
```

## 目录结构

```
src/
├── hooks/
│   └── useEmbed.ts     # 主 Hook
├── context/
│   └── EmbedContext.tsx # Context Provider
├── index.ts            # 入口
└── types.ts            # 类型定义
```

## 使用方式

```tsx
import { EmbedProvider, useEmbed } from '@aiget/embed-react';

function App() {
  return (
    <EmbedProvider apiKey="ag_xxx">
      <MyComponent />
    </EmbedProvider>
  );
}

function MyComponent() {
  const { scrape, loading, error } = useEmbed();

  const handleScrape = async () => {
    const result = await scrape({ url: 'https://example.com' });
    console.log(result);
  };

  return <button onClick={handleScrape}>Scrape</button>;
}
```

## 来源

从 Fetchx 仓库 `packages/embed-react/` 迁移。

---

_版本: 1.0 | 迁移日期: 2026-01-05_
