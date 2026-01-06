# 官网 SSR

## 需求

将官网迁移到 SSR 渲染，优化 SEO：
- 服务端渲染完整 HTML
- 复用 `@moryflow/ui` 组件库
- 动态生成 sitemap

## 技术方案

### 技术栈

| 项目 | 技术 |
|------|------|
| 框架 | TanStack Start |
| 路由 | TanStack Router |
| UI | @moryflow/ui + Tailwind v4 |
| 部署 | Docker + Node.js |

### 项目结构

```
apps/www/
├── src/
│   ├── routes/           # 文件路由
│   │   ├── __root.tsx    # 根布局
│   │   ├── index.tsx     # 首页
│   │   ├── features.tsx
│   │   ├── pricing.tsx
│   │   ├── sitemap.xml.ts
│   │   └── robots.txt.ts
│   ├── components/
│   │   ├── landing/      # 首页组件
│   │   ├── layout/       # Header/Footer
│   │   └── seo/          # JSON-LD
│   └── lib/
│       └── seo.ts        # SEO 工具
├── app.config.ts
└── Dockerfile
```

### SEO 配置（伪代码）

```typescript
// 生成页面 meta
generateMeta(page):
  return [
    { title: page.title },
    { property: 'og:title', content: page.title },
    { property: 'og:image', content: ogImage },
    { name: 'twitter:card', content: 'summary_large_image' },
    // ...
  ]

// 动态 sitemap
generateSitemap():
  pages = [
    { path: '/', priority: 1.0 },
    { path: '/features', priority: 0.9 },
    { path: '/pricing', priority: 0.9 },
    // ...
  ]
  return renderXML(pages)
```

### 部署

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN pnpm install && pnpm build
CMD ["node", "dist/server/index.js"]
EXPOSE 3000
```

## 代码索引

| 模块 | 路径 |
|------|------|
| 路由配置 | `apps/www/src/routes/` |
| SEO 工具 | `apps/www/src/lib/seo.ts` |
| JSON-LD | `apps/www/src/components/seo/JsonLd.tsx` |
| 布局组件 | `apps/www/src/components/layout/` |
| 首页组件 | `apps/www/src/components/landing/` |
| 构建配置 | `apps/www/app.config.ts` |
| Docker | `apps/www/Dockerfile` |
