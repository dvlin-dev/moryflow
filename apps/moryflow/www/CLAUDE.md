# Moryflow WWW (官网)

> 参见根目录 [CLAUDE.md](../../../CLAUDE.md) 获取项目整体上下文。

## 概述

Moryflow Agent-first 产品官网，部署于 `www.moryflow.com`。

主定位：围绕桌面端下载转化的 Agent-first product site，核心心智为 `local-first AI agent workspace`。

页面体系分三类：

- **产品页**：首页 `/`、功能 `/features`、使用场景 `/use-cases`、下载 `/download`、定价 `/pricing`、关于 `/about`
- **SEO 落地页**：核心关键词页（`/agent-workspace`、`/ai-note-taking-app` 等）、对比页（`/compare/*`）、趋势截流页（`/telegram-ai-agent` 等）
- **Legal 页**：`/privacy`、`/terms`

SEO page registry（`src/lib/site-pages.ts`）是路由元信息、sitemap、schema 的单一事实源。

## i18n

- 英文（默认）：无前缀 `/about`
- 中文：`/zh/about`
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

```
www/
├── src/
│   ├── components/
│   │   ├── landing/          # 首页 section 组件
│   │   ├── seo-pages/        # 可复用 SEO 页面组件
│   │   ├── shared/           # 跨页面复用组件（FaqSection / DownloadCtaSection）
│   │   ├── layout/           # 布局组件（Header / Footer）
│   │   └── seo/              # SEO 组件（JsonLd）
│   ├── hooks/
│   │   └── useDownload.ts    # 下载 hook
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
│   │       ├── features.tsx  # 功能页
│   │       ├── download.tsx  # 下载页
│   │       ├── pricing.tsx   # 定价页
│   │       ├── about.tsx     # 关于页
│   │       ├── privacy.tsx   # 隐私政策
│   │       └── terms.tsx     # 服务条款
│   ├── styles/
│   │   └── globals.css       # 全局样式
│   └── router.tsx            # 路由配置
├── server/
│   └── routes/               # Nitro 服务器路由
│       ├── api/v1/health.ts  # 健康检查
│       ├── robots.txt.ts     # Robots
│       └── sitemap.xml.ts    # Sitemap
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

- 参考 Notion 官网的克制、可信、强排版路线
- 背景 `#f7f7f5`，卡片实色 `#ffffff`，品牌色 `#ff9f1c` 仅用于 CTA 和少量强调
- 标题保留 `font-serif`（衬线体），正文系统无衬线字体栈
- 动效白名单：scroll-triggered fade-in、hover scale/shadow；禁止 float/glow/particle

## 待补充资源

### 产品截图占位符

以下组件的产品截图为占位图，需替换为真实截图：

- `AgentFirstHero.tsx` — 主产品截图
- `CorePillarsSection.tsx` — 支柱截图
- `features.tsx` — 功能卡片截图

### Social Proof

`SocialProofSection.tsx` 当前为占位数据，后续需接入真实用户引用。

### Compare 页事实核查

Compare 页（Cowork / OpenClaw / Manus）需在上线前对照最新公开资料核实。

### 页面独立 OG 图

所有页面使用全局 OG fallback，后续应为核心页面设计独立 OG 图。
