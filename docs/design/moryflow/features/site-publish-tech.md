---
title: 站点发布与模板系统（合并版）
date: 2026-02-28
scope: moryflow, pc, server, publish-worker, site-template
status: active
---

<!--
[INPUT]: 本地 Markdown 发布链路、Worker + R2 路由、模板工程约束
[OUTPUT]: Site Publish 单一事实源（发布流程 + 模板系统）
[POS]: Moryflow Features / Site Publish

[PROTOCOL]: 本文件变更时同步更新 `docs/design/moryflow/features/index.md`。
-->

# 站点发布与模板系统

本文合并原“站点发布技术方案”与“站点模板系统”文档，后续站点链路统一维护本文件。

## 1. 功能目标

用户将本地 Markdown 文档发布为公开网站：

- 子域名：`{subdomain}.moryflow.app`
- 自动生成导航结构
- 支持明暗主题
- SSG 产物输出纯 HTML + CSS

## 2. 总体架构

```text
PC Client -> Server -> Cloudflare
   |          |         |-- Worker (请求路由)
   |          |         |-- R2 (站点文件)
   |          |         `-- KV (subdomain -> siteId)
   |          `-- Site API
   `-- Site Builder (Markdown -> HTML)
```

## 3. 发布流程

```text
publish(files, subdomain):
  routes = scanFiles(files)
  navigation = buildNavTree(routes)

  for file in files:
    html = renderMarkdown(file.content)
    html = wrapTemplate(html, navigation)
    outputs.add(html)

  upload outputs to R2: sites/{siteId}/...
  write metadata: sites/{siteId}/_meta.json
  bind domain in KV: site:{subdomain} -> siteId
```

### Worker 请求处理

```text
handleRequest(url):
  subdomain = extractSubdomain(url.host)
  siteId = kv.get(`site:${subdomain}`)

  if site.expired: return expiredPage()

  content = r2.get(`sites/${siteId}${url.path}`)
  if site.showWatermark: content = injectWatermark(content)

  return content
```

## 4. 模板系统规范

### 4.1 技术栈

- `vite` `^7.3`
- `react` `^19.2`
- `tailwindcss` `^4.1`

### 4.2 布局策略

- 单页：单文档发布，内容居中（`max-width: 720px`）
- 多页：`Sidebar 240px + Content 860px`

布局自动选择：

```text
detectLayout(pages):
  return pages.length === 1 ? 'single' : 'multi'
```

### 4.3 主题初始化

- 主题脚本内联到 `<head>`，优先本地用户设置。
- 支持 `light/dark/system`。
- system 模式读取 `prefers-color-scheme`。

### 4.4 响应式断点

- `sm (640px)`：隐藏侧栏
- `lg (1024px)`：显示侧栏
- `xl (1280px)`：显示目录（TOC）

### 4.5 设计语言

- 极简克制、低噪声、柔和圆角
- 浅色与深色 token 成对定义
- 过渡动画轻量、避免过度视觉扰动

## 5. 数据模型

```prisma
model Site {
  id            String @id
  subdomain     String @unique
  userId        String
  status        SiteStatus
  showWatermark Boolean
  expiresAt     DateTime?
  pages         SitePage[]
}

model SitePage {
  siteId        String
  path          String
  localFilePath String?
}
```

## 6. 实施约束

- 发布链路中所有状态以服务端记录为准，客户端只负责触发与展示。
- 发布站点只提供 `GET/HEAD` 读取语义；错误页遵守 `no-store` 缓存策略。
- 模板层不得引入与业务状态耦合的运行时逻辑，保持纯渲染职责。

## 7. 代码索引

| 模块       | 路径                                                          |
| ---------- | ------------------------------------------------------------- |
| 模板工程   | `apps/moryflow/site-template/`                                |
| 站点构建   | `apps/moryflow/pc/src/main/site-publish/site-builder.ts`      |
| MD 渲染    | `apps/moryflow/pc/src/main/site-publish/markdown-renderer.ts` |
| IPC 处理   | `apps/moryflow/pc/src/main/site-publish/index.ts`             |
| Server API | `apps/moryflow/server/src/site/`                              |
| Worker     | `apps/moryflow/publish-worker/`                               |
| UI 组件    | `apps/moryflow/pc/src/renderer/components/share/`             |
| Sites CMS  | `apps/moryflow/pc/src/renderer/workspace/components/sites/`   |
