# Fumadocs + TanStack Start 集成指南

本文档记录了在 TanStack Start 项目中集成 fumadocs 文档系统时遇到的问题和解决方案。

## 核心要点

### 1. 使用 @content-collections 而非 fumadocs-mdx

**问题**: `fumadocs-mdx` 与 TanStack Start 存在兼容性问题，会导致 SSR/预渲染失败。

**解决方案**: 使用 `@content-collections` 替代：

```bash
pnpm add @content-collections/core @content-collections/mdx @fumadocs/content-collections
pnpm add -D @content-collections/vite
```

### 2. fumadocs 版本选择

| 功能 | 最低版本 |
|------|---------|
| `fumadocs-ui/provider/tanstack` | v15.8.5 |
| TanStack Start 兼容 | v15.8.5 |

**注意**: v15.2.10 没有 `provider/tanstack` 导出，v16.x 的 API 有较大变化。推荐使用 **v15.8.5**。

```json
{
  "dependencies": {
    "fumadocs-core": "^15.8.5",
    "fumadocs-ui": "^15.8.5"
  }
}
```

---

## 必需配置文件

### vite.config.ts

```typescript
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import contentCollections from '@content-collections/vite'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    contentCollections(),      // 必须在 tanstackStart 之前
    tsconfigPaths(),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
      },
      sitemap: {
        enabled: true,
        host: 'https://your-docs-site.com',
      },
    }),
    viteReact(),
    tailwindcss(),             // 重要：必须包含，否则样式丢失！
  ],
})
```

### content-collections.ts

在项目根目录创建：

```typescript
import {
  defineCollection,
  defineConfig,
  suppressDeprecatedWarnings,
} from '@content-collections/core'
import {
  frontmatterSchema,
  metaSchema,
  transformMDX,
} from '@fumadocs/content-collections/configuration'

// 抑制过时警告
suppressDeprecatedWarnings('implicitContentProperty')

const docs = defineCollection({
  name: 'docs',
  directory: 'content/docs',
  include: '**/*.mdx',
  schema: frontmatterSchema,
  transform: transformMDX,
})

const metas = defineCollection({
  name: 'meta',
  directory: 'content/docs',
  include: '**/meta.json',
  parser: 'json',
  schema: metaSchema,
})

export default defineConfig({
  collections: [docs, metas],
})
```

### tsconfig.json

必须添加 `content-collections` 路径别名：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "content-collections": ["./.content-collections/generated"]
    }
  },
  "include": [
    "src",
    ".content-collections",
    "*.config.ts",
    "*.config.mts",
    "content"
  ]
}
```

### src/lib/source.ts

```typescript
import { allDocs, allMetas } from 'content-collections'
import { loader } from 'fumadocs-core/source'
import { createMDXSource } from '@fumadocs/content-collections'
import { i18n } from './i18n'

export const source = loader({
  baseUrl: '/docs',
  source: createMDXSource(allDocs, allMetas),
  i18n,
})
```

### src/lib/i18n.ts

```typescript
import { defineI18n } from 'fumadocs-core/i18n'

export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'zh'],
  hideLocale: 'default-locale',
})
```

---

## 根组件配置

### src/routes/__root.tsx

```typescript
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useParams,
} from '@tanstack/react-router'
import * as React from 'react'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'  // 注意路径
import { I18nProvider } from 'fumadocs-ui/i18n'              // 注意路径
import { i18n } from '../lib/i18n'
import '../styles/app.css'

// UI 翻译
const translations: Record<string, Record<string, string>> = {
  en: {
    search: 'Search documentation...',
    searchNoResult: 'No results found',
    toc: 'On this page',
    tocNoHeading: 'No headings',      // 注意：无 s
    lastUpdate: 'Last updated',
    chooseTheme: 'Choose theme',
    nextPage: 'Next',
    previousPage: 'Previous',
    chooseLanguage: 'Change language',
  },
  zh: {
    search: '搜索文档...',
    searchNoResult: '未找到结果',
    toc: '目录',
    tocNoHeading: '无标题',           // 注意：无 s
    lastUpdate: '最后更新',
    chooseTheme: '选择主题',
    nextPage: '下一页',
    previousPage: '上一页',
    chooseLanguage: '选择语言',
  },
}

function I18nWrapper({ children }: { children: React.ReactNode }) {
  const params = useParams({ strict: false }) as { lang?: string }
  const locale = params.lang || i18n.defaultLanguage

  return (
    <I18nProvider
      locale={locale}
      locales={i18n.languages.map((lang) => ({
        name: lang === 'zh' ? '中文' : 'English',
        locale: lang,
      }))}
      translations={translations[locale]}
    >
      {children}
    </I18nProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const params = useParams({ strict: false }) as { lang?: string }
  const locale = params.lang || i18n.defaultLanguage

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col">
        <RootProvider>
          <I18nWrapper>{children}</I18nWrapper>
        </RootProvider>
        <Scripts />
      </body>
    </html>
  )
}

export const Route = createRootRoute({
  component: () => (
    <RootDocument>
      <Outlet />
    </RootDocument>
  ),
  // ... head config
})
```

---

## 文档页面渲染

使用 `MDXContent` 组件渲染 MDX 内容：

```typescript
import { MDXContent } from '@content-collections/mdx/react'

// 在页面组件中
<MDXContent
  code={(page.data as any).body}
  components={getMDXComponents()}
/>
```

---

## 常见错误及解决方案

### 1. 样式完全丢失

**原因**: 缺少 `@tailwindcss/vite` 插件

**解决**: 确保 vite.config.ts 包含 `tailwindcss()` 插件

### 2. Cannot find module 'content-collections'

**原因**: tsconfig.json 缺少路径别名

**解决**: 添加 `"content-collections": ["./.content-collections/generated"]`

### 3. fumadocs-ui/provider/tanstack 不存在

**原因**: fumadocs 版本过低

**解决**: 升级到 v15.8.5+

### 4. 交互功能（搜索/主题/语言切换）不工作

**原因**: React hydration 失败，通常是 fumadocs-mdx 兼容性问题

**解决**: 使用 @content-collections 替代 fumadocs-mdx

### 5. ERR_UNKNOWN_FILE_EXTENSION ".css" (预渲染时)

**说明**: 这是已知的预渲染问题，但不影响开发和构建

---

## CSS 样式配置

推荐使用 OKLCH 颜色系统，需要同时设置标准变量和 fumadocs 变量：

```css
:root {
  /* 标准变量 */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  /* ... */

  /* fumadocs 变量 */
  --fd-background: oklch(1 0 0);
  --fd-foreground: oklch(0.145 0 0);
  /* ... */
}
```

---

## 依赖清单

```json
{
  "dependencies": {
    "@content-collections/core": "^0.13.0",
    "@content-collections/mdx": "^0.2.2",
    "@fumadocs/content-collections": "^1.2.5",
    "@tanstack/react-router": "^1.120.5",
    "@tanstack/react-start": "^1.120.5",
    "fumadocs-core": "^15.8.5",
    "fumadocs-ui": "^15.8.5",
    "react": "^19.0.0"
  },
  "devDependencies": {
    "@content-collections/vite": "^0.2.8",
    "@tailwindcss/vite": "^4.0.0",
    "@tanstack/react-router-devtools": "^1.120.5",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.2",
    "vite": "^6.2.3",
    "vite-tsconfig-paths": "^5.1.4"
  }
}
```

---

## 项目结构

```
apps/docs/
├── content/
│   └── docs/
│       ├── en/           # 英文文档
│       │   ├── index.mdx
│       │   └── meta.json
│       └── zh/           # 中文文档
│           ├── index.mdx
│           └── meta.json
├── src/
│   ├── lib/
│   │   ├── i18n.ts
│   │   └── source.ts
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── docs/
│   │   │   └── $.tsx     # /docs/* 路由
│   │   └── $lang/
│   │       └── docs/
│   │           └── $.tsx # /$lang/docs/* 路由
│   └── styles/
│       └── app.css
├── content-collections.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 最后检查清单

- [ ] fumadocs 版本 >= 15.8.5
- [ ] 使用 @content-collections 而非 fumadocs-mdx
- [ ] vite.config.ts 包含 tailwindcss() 插件
- [ ] tsconfig.json 包含 content-collections 路径别名
- [ ] RootProvider 从 `fumadocs-ui/provider/tanstack` 导入
- [ ] I18nProvider 从 `fumadocs-ui/i18n` 导入
- [ ] 翻译键使用 `tocNoHeading`（无 s）
