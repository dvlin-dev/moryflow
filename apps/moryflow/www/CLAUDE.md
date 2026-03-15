# Moryflow WWW (官网)

> 参见根目录 [CLAUDE.md](../../../CLAUDE.md) 获取项目整体上下文。

## 概述

Moryflow Agent-first 产品官网，部署于 `www.moryflow.com`。

主定位：围绕桌面端下载转化的 Agent-first product site，核心心智为 `local-first AI agent workspace`。

页面体系分三类：

- **产品页**：首页 `/`、下载 `/download`、定价 `/pricing`
- **SEO 落地页**：核心关键词页（`/agent-workspace`、`/ai-note-taking-app` 等）、对比页（`/compare/*`）、趋势截流页（`/telegram-ai-agent` 等）
- **Legal 页**：`/privacy`、`/terms`

SEO page registry（`src/lib/site-pages.ts`）是路由元信息、sitemap、schema 的单一事实源。

## 下载口径

- 平台定义（id / label / arch）统一在 `apps/moryflow/shared/public-download.ts`
- 版本号与下载 URL 由 `/api/v1/latest-release` 动态获取（10 分钟缓存，源自 GitHub Releases API）
- 客户端通过 `useLatestRelease` → `useDownload` 获取版本信息和 asset 下载链接
- GitHub Releases 是手动下载、release notes 和应用内自动更新的唯一源

## i18n

- 英文（默认）：无前缀 `/download`
- 中文：`/zh/download`
- 路由结构：`routes/{-$locale}/` 可选参数目录，layout route 校验 locale
- locale 基础设施：`src/lib/i18n.ts`

## 技术栈

| 项目   | 技术                 |
| ------ | -------------------- |
| 框架   | TanStack Start (SSR) |
| 运行时 | React 19 + Nitro     |
| 构建   | Vite 7               |
| 样式   | Tailwind CSS v4      |
| UI 库  | @moryflow/ui         |
| 图标   | lucide-react         |

## 项目结构

```text
www/
├── src/
│   ├── components/
│   │   ├── landing/          # 首页 section 组件
│   │   ├── seo-pages/        # 可复用 SEO 页面组件
│   │   ├── shared/           # 跨页面复用组件（FaqSection / DownloadCtaSection）
│   │   ├── layout/           # 布局组件（Header / Footer）
│   │   └── seo/              # SEO 组件（JsonLd）
│   ├── hooks/
│   │   ├── useDownload.ts      # 下载 hook（消费 useLatestRelease）
│   │   └── useLatestRelease.ts # 动态获取最新 release
│   ├── lib/
│   │   ├── cn.ts             # 样式工具
│   │   ├── i18n.ts           # i18n 基础设施
│   │   ├── platform.ts       # 平台检测（detectPlatform / usePlatformDetection）
│   │   ├── seo.ts            # SEO 配置与 meta 生成
│   │   └── site-pages.ts     # 站点页面 registry（单一事实源）
│   ├── routes/               # TanStack Start 文件路由
│   │   ├── __root.tsx        # 根布局
│   │   └── {-$locale}/       # locale 可选参数路由
│   │       ├── route.tsx     # locale layout route
│   │       ├── index.tsx     # 首页
│   │       ├── download.tsx  # 下载页
│   │       ├── pricing.tsx   # 定价页
│   │       ├── privacy.tsx   # 隐私政策
│   │       └── terms.tsx     # 服务条款
│   ├── styles/
│   │   └── globals.css       # 全局样式
│   └── router.tsx            # 路由配置
├── server/
│   └── routes/               # Nitro 服务器路由
│       ├── api/v1/health.ts           # 健康检查
│       ├── api/v1/github-stars.ts    # GitHub Star 计数（1h 缓存）
│       ├── api/v1/latest-release.ts  # 最新 Release（10min 缓存）
│       ├── features.ts             # 301 → /
│       ├── use-cases.ts            # 301 → /
│       ├── about.ts                # 301 → /
│       ├── robots.txt.ts           # Robots
│       └── sitemap.xml.ts          # Sitemap
├── public/                   # 静态资源
├── Dockerfile                # Docker 构建
├── vite.config.ts            # Vite 配置
└── package.json
```

## 开发

```bash
pnpm install
pnpm --filter @moryflow/www dev
pnpm --filter @moryflow/www build
pnpm --filter @moryflow/www typecheck
pnpm --filter @moryflow/www test:unit
```

## 环境变量

| 变量           | 说明           | 默认值                        |
| -------------- | -------------- | ----------------------------- |
| `VITE_API_URL` | API 服务器地址 | `https://server.moryflow.com` |

## 部署

在 `deploy/moryflow/docker-compose.yml` 中配置为 `moryflow-www` 服务。

```bash
docker build -f apps/moryflow/www/Dockerfile -t moryflow-www .
docker run -p 3000:3000 moryflow-www
```

## UI 组件约束

- 优先使用 `@moryflow/ui`（`packages/ui`）中已有组件，通过 `className` 覆盖品牌风格
- 仅当组件库不覆盖的场景才新建官网专属组件
- 统一使用 `lucide-react` 图标，禁止 `@hugeicons/*` 与 `@tabler/icons-react`

## 视觉方向

- 消费 `@moryflow/ui/styles` 语义化 Token（`bg-background`、`text-foreground`、`bg-card` 等），与 PC 端统一
- 暖中性底色：`background` (#F7F5F2)、`card` (#FCFAF7)
- 品牌色扩展 token：`brand` (#455DD3)、`brand-light` (#6B7FE0)、`brand-lighter` (#9AABE8)、`brand-dark` (#213183)
- 字体：Inter 400~800（Google Fonts），通过字重和 tracking 建立层级；禁止 `font-serif`
- 营销渐变：`gradient-hero-glow`（蓝紫色径向 glow）、`gradient-section-subtle`（极浅蓝紫区块背景）
- 卡片以 `shadow-sm` + `hover:shadow-lg` 建立层次，而非纯边框
- 动效：`useScrollReveal` / `useScrollRevealGroup` 驱动入场动画（fade-up / scale-up / stagger）
- 禁止 float/glow/particle 等重动效

## 内容维护注意点

### Compare 页事实核查

Compare 页（Cowork / OpenClaw / Manus）需在上线前对照最新公开资料核实。
