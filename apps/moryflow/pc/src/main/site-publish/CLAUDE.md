# Site Publish 站点发布模块

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

将用户的 Markdown 文件构建为静态网站并发布到云端。

## 职责

- Markdown 渲染为 HTML
- 静态站点构建（路由、导航、资源处理）
- 与服务端 API 通信（发布、更新、下线）
- IPC 处理器注册

## 目录结构

```
site-publish/
├── index.ts              # 模块入口，导出 registerSitePublishHandlers
├── api.ts                # API 请求封装，处理认证和错误
├── handlers.ts           # IPC 处理器，注册所有 IPC 通道
├── template/             # 模板资源（由 site-template 自动生成）
│   ├── index.ts          # 统一导出
│   ├── styles.ts         # 核心 CSS 样式
│   ├── scripts.ts        # 主题脚本
│   ├── page.ts           # 页面模板
│   ├── sidebar.ts        # 侧边栏模板
│   ├── index-page.ts     # 目录页模板
│   ├── index-page-styles.ts  # 目录页样式
│   ├── 404.ts            # 404 页面模板
│   └── 404-styles.ts     # 404 页面样式
├── renderer/             # Markdown 渲染器
│   ├── index.ts          # 渲染器入口
│   ├── template.ts       # 模板导出和工具函数
│   ├── frontmatter.ts    # Frontmatter 解析
│   ├── image.ts          # 图片路径处理
│   └── sidebar.ts        # 侧边栏渲染
└── builder/              # 站点构建器
    ├── index.ts          # 构建器入口
    ├── const.ts          # 类型定义和常量
    ├── scanner.ts        # 目录扫描
    ├── router.ts         # 路由生成
    ├── navigation.ts     # 导航树生成
    ├── pages.ts          # 特殊页面生成
    └── image.ts          # 图片文件处理
```

## 数据流

```
用户 Markdown 文件
       ↓
   builder/scanner.ts (扫描文件)
       ↓
   builder/router.ts (生成路由)
       ↓
   builder/navigation.ts (生成导航)
       ↓
   renderer/ (渲染 HTML，使用 template/)
       ↓
   api.ts (上传到服务端)
       ↓
   Cloudflare R2 + Worker (托管访问)
```

## 模板同步工作流

`template/` 目录由 `apps/moryflow/site-template/` 构建后自动生成：

```bash
cd apps/moryflow/site-template
pnpm build && pnpm sync
```

**模板源文件位置**: `apps/moryflow/site-template/src/templates/`

| 源文件                | 生成文件               | 说明         |
| --------------------- | ---------------------- | ------------ |
| `page.html`           | `page.ts`              | 页面模板     |
| `sidebar.html`        | `sidebar.ts`           | 侧边栏模板   |
| `index-page.html`     | `index-page.ts`        | 目录页模板   |
| `index-page.css`      | `index-page-styles.ts` | 目录页样式   |
| `404.html`            | `404.ts`               | 404 页面模板 |
| `404.css`             | `404-styles.ts`        | 404 页面样式 |
| `dist/styles.min.css` | `styles.ts`            | 核心 CSS     |

## 常见修改场景

| 场景               | 涉及文件                                         | 注意事项                             |
| ------------------ | ------------------------------------------------ | ------------------------------------ |
| 修改页面样式       | `apps/moryflow/site-template/src/`               | 修改后运行 `pnpm build && pnpm sync` |
| 修改 HTML 模板     | `apps/moryflow/site-template/src/templates/`     | 修改后运行 `pnpm sync`               |
| 修改 Markdown 渲染 | `renderer/`                                      | 注意 frontmatter 兼容性              |
| 修改路由规则       | `builder/router.ts`                              | 注意 index.md/README.md 特殊处理     |
| 新增 IPC 通道      | `handlers.ts` + `src/shared/ipc/site-publish.ts` | 双向定义类型                         |

## 依赖关系

```
site-publish/
├── 依赖 → apps/moryflow/site-template/（模板资源）
├── 依赖 → src/shared/ipc/site-publish.ts（IPC 类型）
├── 依赖 → membership-bridge.ts（获取认证 token）
├── 功能文档 → docs/products/moryflow/features/site-publish/
└── 服务端 → apps/moryflow/server/src/site/
```
