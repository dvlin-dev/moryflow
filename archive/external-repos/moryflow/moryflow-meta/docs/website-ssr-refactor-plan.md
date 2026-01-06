# Moryflow 官网 SSR 重构方案

## 1. 背景与目标

### 1.1 当前状态

- **moryflow-meta/delhi** 项目包含官网 (website) 和文档站 (docs-site)
- 官网使用 Astro + React，部署为 Nginx 静态站点
- 主项目 **moryflow** 已有完善的 UI 组件库 `@moryflow/ui`

### 1.2 迁移目标

将 **moryflow-meta** 整体迁移到 **moryflow** 主项目，实现：

1. **复用组件库**: 直接使用 `@moryflow/ui`，无需复制代码
2. **SSR 渲染**: 将官网从 Astro SSG 迁移到 TanStack Start SSR
3. **统一技术栈**: 与主项目保持一致的开发体验

### 1.3 技术栈变更

| 维度 | 迁移前 | 迁移后 |
|------|--------|--------|
| 框架 | Astro 5 + React 19 | TanStack Start + React 19 |
| 渲染 | SSG (静态生成) | SSR (运行时渲染) |
| 路由 | Astro 文件路由 | TanStack Router |
| UI 组件 | 自定义组件 | @moryflow/ui |
| 部署 | Nginx 静态服务 | Node.js SSR 服务器 |

---

## 2. 迁移后的项目结构

```
moryflow/
├── apps/
│   ├── pc/                      # 桌面客户端（已有）
│   ├── www/                     # 官网（新增，从 delhi/website 迁移）
│   └── docs/                    # 文档站（新增，从 delhi/docs-site 迁移）
├── packages/
│   └── ui/                      # 共享 UI 组件库（已有）
├── pnpm-workspace.yaml
└── package.json
```

---

## 3. 迁移步骤

### Step 1: 创建 apps/www 目录

在 moryflow 主项目中创建官网应用：

```bash
mkdir -p apps/www/src/{routes,components,styles,hooks}
mkdir -p apps/www/public
```

### Step 2: 初始化 package.json

```json
{
  "name": "@moryflow/www",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "start": "node .output/server/index.mjs"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tanstack/react-router": "^1.144.0",
    "@tanstack/react-start": "^1.144.0",
    "@moryflow/ui": "workspace:*"
  },
  "devDependencies": {
    "vite": "^7.2.0",
    "@vitejs/plugin-react": "^5.1.0",
    "tailwindcss": "^4.1.0",
    "@tailwindcss/vite": "^4.1.0",
    "typescript": "^5.9.0"
  }
}
```

### Step 3: 配置 TanStack Start

**app.config.ts**
```typescript
import { defineConfig } from '@tanstack/react-start/config'

export default defineConfig({
  server: { preset: 'node-server' },
  routers: {
    ssr: {
      prerender: { enabled: false },
    },
  },
})
```

### Step 4: 创建入口文件

**src/entry-client.tsx**
```typescript
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start/client'
import { createRouter } from './router'

hydrateRoot(document, <StartClient router={createRouter()} />)
```

**src/entry-server.tsx**
```typescript
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { createRouter } from './router'

export default createStartHandler({ createRouter })(defaultStreamHandler)
```

### Step 5: 迁移组件

将 `delhi/website/src/components` 中的组件迁移到 `apps/www/src/components`，并替换为 `@moryflow/ui` 组件。

---

## 4. 组件迁移示例

### 4.1 使用 @moryflow/ui 组件

```tsx
// apps/www/src/components/layout/Header.tsx
import { Button } from "@moryflow/ui/components/button"
import { cn } from "@moryflow/ui/lib/utils"

export function Header() {
  return (
    <header className={cn("fixed top-0 inset-x-0 z-50", "bg-white/70 backdrop-blur-xl")}>
      <nav className="container mx-auto h-16 flex items-center justify-between">
        <Logo />
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" asChild>
            <a href="/docs">文档</a>
          </Button>
          <Button size="sm">下载</Button>
        </div>
      </nav>
    </header>
  )
}
```

### 4.2 路由组织

```tsx
// apps/www/src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import '@/styles/globals.css'

export const Route = createRootRoute({
  component: () => (
    <html lang="zh-CN">
      <head />
      <body className="bg-mory-bg antialiased">
        <Outlet />
      </body>
    </html>
  ),
  head: () => ({
    meta: [
      { title: 'Moryflow - 你的 AI 知识助手' },
      { name: 'description', content: '不是聊天机器人，是会思考的伙伴' },
    ],
  }),
})

// apps/www/src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { Header, Footer } from '@/components/layout'
import { HeroSection, FeaturesSection, DownloadCTA } from '@/components/landing'

export const Route = createFileRoute('/')({
  component: () => (
    <>
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <DownloadCTA />
      </main>
      <Footer />
    </>
  ),
})
```

---

## 5. 样式配置

**src/styles/globals.css**

```css
@import "tailwindcss";

/* 扫描本地和 UI 库组件 */
@source "../**/*.{ts,tsx}";
@source "../../../packages/ui/src/**/*.{ts,tsx}";

/* Mory 品牌主题 */
@theme inline {
  --color-mory-bg: #F7F7F5;
  --color-mory-paper: #FFFFFF;
  --color-mory-orange: #FF9F1C;
  --color-mory-text-primary: #1A1A1A;
  --color-mory-text-secondary: #666666;
}
```

---

## 6. Docker 部署

**Dockerfile.www**

```dockerfile
FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS builder
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/www/package.json ./apps/www/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile --filter @moryflow/www...

COPY apps/www ./apps/www
COPY packages/ui ./packages/ui
RUN pnpm --filter @moryflow/www build

FROM node:22-slim AS runner
WORKDIR /app
COPY --from=builder /app/apps/www/.output ./.output
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

---

## 7. 迁移检查清单

- [ ] 在 moryflow 创建 `apps/www` 目录
- [ ] 更新 `pnpm-workspace.yaml` 包含 `apps/www`
- [ ] 初始化 TanStack Start 配置
- [ ] 迁移并重构组件，使用 `@moryflow/ui`
- [ ] 配置 Tailwind 扫描 UI 库
- [ ] 迁移静态资源到 `public/`
- [ ] 创建 Dockerfile.www
- [ ] 本地测试 SSR 渲染
- [ ] 部署验证

---

## 8. 参考资源

- [TanStack Start](https://tanstack.com/start)
- [TanStack Router](https://tanstack.com/router)
- [@moryflow/ui 组件库](/packages/ui)

---

**文档版本**: 2.0
**更新日期**: 2026-01-03
