---
title: 站点发布（技术方案）
date: 2026-01-12
scope: moryflow, pc, server, publish-worker
status: active
---

<!--
[INPUT]: 本地 Markdown → 静态站；发布到 `*.moryflow.app`；Worker + R2
[OUTPUT]: 发布流程、Worker 处理与代码索引（Monorepo 路径）
[POS]: Moryflow 内部技术文档：站点发布

[PROTOCOL]: 本文件变更时同步更新 `docs/products/moryflow/index.md`。
-->

# 站点发布

## 需求

用户将本地 Markdown 文档发布为公开网站：

- 子域名格式：`{subdomain}.moryflow.app`
- 自动生成导航结构
- 支持明暗主题

## 技术方案

### 架构

```
PC Client → Server → Cloudflare
   │           │         │
   │           │         ├── Worker (请求路由)
   │           │         ├── R2 (文件存储)
   │           │         └── KV (缓存)
   │           │
   │           └── Site API (管理)
   │
   └── Site Builder (构建 HTML)
```

### 发布流程（伪代码）

```
publish(files, subdomain):
  # 1. 扫描文件，生成路由
  routes = scanFiles(files)
  navigation = buildNavTree(routes)

  # 2. 渲染 Markdown → HTML
  for file in files:
    html = renderMarkdown(file.content)
    html = wrapTemplate(html, navigation)
    outputs.add(html)

  # 3. 上传到 R2
  for output in outputs:
    r2.put(`sites/${siteId}/${output.path}`, output.content)

  # 4. 更新元数据
  r2.put(`sites/${siteId}/_meta.json`, metadata)
  kv.put(`site:${subdomain}`, siteId)
```

### Worker 请求处理

```
handleRequest(url):
  subdomain = extractSubdomain(url.host)
  siteId = kv.get(`site:${subdomain}`)

  if site.expired:
    return expiredPage()

  content = r2.get(`sites/${siteId}${url.path}`)

  if site.showWatermark:
    content = injectWatermark(content)

  return content
```

### 数据模型

```prisma
model Site {
  id          String @id
  subdomain   String @unique
  userId      String
  status      SiteStatus  // ACTIVE | OFFLINE | DELETED
  showWatermark Boolean
  expiresAt   DateTime?
  pages       SitePage[]
}

model SitePage {
  siteId        String
  path          String
  localFilePath String?
}
```

## 代码索引

| 模块       | 路径                                                          |
| ---------- | ------------------------------------------------------------- |
| 站点构建   | `apps/moryflow/pc/src/main/site-publish/site-builder.ts`      |
| MD 渲染    | `apps/moryflow/pc/src/main/site-publish/markdown-renderer.ts` |
| IPC 处理   | `apps/moryflow/pc/src/main/site-publish/index.ts`             |
| Server API | `apps/moryflow/server/src/site/`                              |
| Worker     | `apps/moryflow/publish-worker/`                               |
| UI 组件    | `apps/moryflow/pc/src/renderer/components/share/`             |
| Sites CMS  | `apps/moryflow/pc/src/renderer/workspace/components/sites/`   |
