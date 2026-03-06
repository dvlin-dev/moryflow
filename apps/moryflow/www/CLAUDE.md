# Moryflow WWW (官网)

> 参见根目录 [CLAUDE.md](../../../CLAUDE.md) 获取项目整体上下文。

## 概述

Moryflow 官网（营销站），部署于 `www.moryflow.com`。

## 近期变更

- Build：builder 阶段恢复复制 `apps/moryflow/www`、`packages/types`、`packages/api`、`packages/ui` 的 `node_modules`（不复制 `sync`），修复跨 stage 丢失 workspace 链接导致 `packages/types` 报 `TS6053`
- Build：Docker 依赖安装显式追加 `--filter @moryflow/types... --filter @moryflow/typescript-config...`，修复 `packages/types` 在 filtered install 下缺少 tsconfig 基座包导致的 `TS6053`
- Build：Docker builder 阶段改为仅复用根 `node_modules`（兼容 hoisted），并补齐 `tsconfig.agents.json` 复制，修复 `packages/sync/node_modules` 不存在与 `packages/api` 容器编译配置缺失问题
- Build：Docker 构建补齐 `packages/types -> packages/sync -> packages/api` 预构建链路，修复 `@moryflow/api/client` 在构建期无法解析的问题
- Build：builder 阶段补齐根 `tsconfig.base.json` 复制，避免 `packages/sync` 在容器内构建时报 `TS5083`

## 技术栈

| 项目   | 技术                 |
| ------ | -------------------- |
| 框架   | TanStack Start (SSR) |
| 运行时 | React 19 + Nitro     |
| 构建   | Vite 7               |
| 样式   | Tailwind CSS v4      |
| UI 库  | /ui                  |
| 图标   | lucide-react         |

## 项目结构

```
www/
├── src/
│   ├── components/
│   │   ├── landing/          # 首页组件
│   │   │   ├── Hero.tsx
│   │   │   ├── AgentShowcase.tsx
│   │   │   ├── WhyLocalSection.tsx
│   │   │   ├── CapabilitiesSection.tsx
│   │   │   └── DownloadCTA.tsx
│   │   ├── layout/           # 布局组件
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   └── seo/              # SEO 组件
│   │       └── JsonLd.tsx
│   ├── hooks/
│   │   └── useDownload.ts    # 下载 hook
│   ├── lib/
│   │   ├── cn.ts             # 样式工具
│   │   └── seo.ts            # SEO 配置
│   ├── routes/               # 页面路由
│   │   ├── __root.tsx        # 根布局
│   │   ├── index.tsx         # 首页
│   │   ├── features.tsx      # 功能页
│   │   ├── pricing.tsx       # 定价页
│   │   ├── download.tsx      # 下载页
│   │   ├── about.tsx         # 关于页
│   │   ├── privacy.tsx       # 隐私政策
│   │   └── terms.tsx         # 服务条款
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
# 安装依赖
pnpm install

# 开发模式
pnpm --filter @moryflow/www dev

# 构建
pnpm --filter @moryflow/www build

# 预览构建结果
pnpm --filter @moryflow/www preview
```

## 环境变量

| 变量           | 说明           | 默认值                        |
| -------------- | -------------- | ----------------------------- |
| `VITE_API_URL` | API 服务器地址 | `https://server.moryflow.com` |

## 部署

### Docker

```bash
# 构建镜像（从仓库根目录）
docker build -f apps/moryflow/www/Dockerfile -t moryflow-www .

# 运行
docker run -p 3000:3000 moryflow-www
```

### Docker Compose

在 `deploy/moryflow/docker-compose.yml` 中配置为 `moryflow-www` 服务。

## 页面列表

| 路径             | 组件                           | 说明                                                                 |
| ---------------- | ------------------------------ | -------------------------------------------------------------------- |
| `/`              | index.tsx                      | 首页（Hero + AgentShowcase + WhyLocal + Capabilities + DownloadCTA） |
| `/features`      | features.tsx                   | 功能特性                                                             |
| `/pricing`       | pricing.tsx                    | 定价（Beta 免费）                                                    |
| `/download`      | download.tsx                   | 下载页（macOS/Windows）                                              |
| `/about`         | about.tsx                      | 关于我们                                                             |
| `/privacy`       | privacy.tsx                    | 隐私政策                                                             |
| `/terms`         | terms.tsx                      | 服务条款                                                             |
| `/sitemap.xml`   | server/routes/sitemap.xml.ts   | Sitemap                                                              |
| `/robots.txt`    | server/routes/robots.txt.ts    | Robots                                                               |
| `/api/v1/health` | server/routes/api/v1/health.ts | 健康检查                                                             |

## 图标规范

- 统一使用 `lucide-react`，业务直接组件调用（如 `<ChevronDown />`）
- 使用 `className` 或 `size` 控制尺寸，不引入额外 `Icon` 包装层
- 禁止 `@hugeicons/*` 与 `@tabler/icons-react`
  | 目标 | Target01Icon |
  | 用户组 | UserGroupIcon |

## 近期变更

- Nginx 健康检查探针路径对齐为 `/api/v1/health`，避免与 Nitro 路由版本前缀不一致
- 官网图标回退 Lucide，移除 Hugeicons 依赖并统一调用方式
- 健康检查迁移到 Nitro `server/routes`，并补齐 robots/sitemap/health 单测
- SEO 主域名统一为 `https://www.moryflow.com`，OG/JSON-LD 资源对齐
