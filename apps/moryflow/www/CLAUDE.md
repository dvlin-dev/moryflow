# Moryflow WWW (官网)

> 参见根目录 [CLAUDE.md](../../../CLAUDE.md) 获取项目整体上下文。

## 概述

Moryflow 官网（营销站），部署于 `www.moryflow.com`。

## 技术栈

| 项目   | 技术                       |
| ------ | -------------------------- |
| 框架   | TanStack Start (SSR)       |
| 运行时 | React 19 + Nitro           |
| 构建   | Vite 7                     |
| 样式   | Tailwind CSS v4            |
| UI 库  | /ui                        |
| 图标   | @hugeicons/core-free-icons |

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
│       ├── api/health.ts     # 健康检查
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

| 路径           | 组件                         | 说明                                                                 |
| -------------- | ---------------------------- | -------------------------------------------------------------------- |
| `/`            | index.tsx                    | 首页（Hero + AgentShowcase + WhyLocal + Capabilities + DownloadCTA） |
| `/features`    | features.tsx                 | 功能特性                                                             |
| `/pricing`     | pricing.tsx                  | 定价（Beta 免费）                                                    |
| `/download`    | download.tsx                 | 下载页（macOS/Windows）                                              |
| `/about`       | about.tsx                    | 关于我们                                                             |
| `/privacy`     | privacy.tsx                  | 隐私政策                                                             |
| `/terms`       | terms.tsx                    | 服务条款                                                             |
| `/sitemap.xml` | server/routes/sitemap.xml.ts | Sitemap                                                              |
| `/robots.txt`  | server/routes/robots.txt.ts  | Robots                                                               |
| `/api/health`  | server/routes/api/health.ts  | 健康检查                                                             |

## 图标映射

使用 `@hugeicons/core-free-icons` 替代 `lucide-react`：

| 用途    | Hugeicons             |
| ------- | --------------------- |
| 下载    | Download01Icon        |
| macOS   | AppleIcon             |
| Windows | ComputerIcon          |
| 加载    | Loading01Icon         |
| 成功    | CheckmarkCircle01Icon |
| 勾选    | Tick02Icon            |
| 特效    | SparklesIcon          |
| 安全    | Shield01Icon          |
| 闪电    | FlashIcon             |
| 解锁    | SquareUnlock01Icon    |
| 硬盘    | HardDriveIcon         |
| 大脑    | BrainIcon             |
| 地球    | Globe02Icon           |
| 编辑    | PencilEdit01Icon      |
| 文档    | Book01Icon            |
| 邮件    | Mail01Icon            |
| 爱心    | FavouriteIcon         |
| 目标    | Target01Icon          |
| 用户组  | UserGroupIcon         |

## 近期变更

- 健康检查迁移到 Nitro `server/routes`，并补齐 robots/sitemap/health 单测
- SEO 主域名统一为 `https://www.moryflow.com`，OG/JSON-LD 资源对齐
