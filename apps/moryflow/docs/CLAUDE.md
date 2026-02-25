<!--
[INPUT]: Moryflow Docs 站点源码（TanStack Start + Fumadocs + MDX）
[OUTPUT]: 本目录的职责边界、结构与常用开发命令
[POS]: `docs.moryflow.com` 的独立文档站点（不与官网/应用耦合）

[PROTOCOL]: 本目录结构或站点约束变更时，需同步更新根 `CLAUDE.md` 与 `docs/architecture/*` 中的域名口径（若影响全局）。
-->

# Moryflow Docs

Moryflow 对外文档站点，部署到 `docs.moryflow.com`，与 `www.moryflow.com`（营销）和 `server.moryflow.com`（应用+API）解耦。

## 近期变更

- Build：Docker 依赖安装显式追加 `--filter @moryflow/types... --filter @moryflow/typescript-config...`，修复 `packages/types` 在 filtered install 下缺少 tsconfig 基座包导致的 `TS6053`
- Build：Docker 构建链路改为仅复用根 `node_modules`（兼容 hoisted），并补齐 `tsconfig.agents.json` 与 `.npmrc` 复制，避免 `packages/api/sync` 在容器内缺配置或拷贝 `node_modules` 失败
- Build：Docker 构建补齐 `packages/types -> packages/sync -> packages/api` 预构建链路，修复 `@moryflow/api/client` 在 Vite/Rollup 阶段解析失败
- Build：builder 阶段补齐根 `tsconfig.base.json` 复制，避免容器内 `packages/sync` 编译时报 `TS5083`

## 技术栈

- TanStack Start（SSR）
- Fumadocs（内容与 UI）
- MDX（内容源）
- Nitro（server output）

## 目录结构

| 目录       | 说明                |
| ---------- | ------------------- |
| `content/` | 文档内容源（MDX）   |
| `src/`     | Start 路由与站点 UI |
| `public/`  | 静态资源            |

## 常用命令

```bash
pnpm --filter @moryflow/docs dev
pnpm --filter @moryflow/docs build
pnpm --filter @moryflow/docs typecheck
```

## 约束

- TanStack Router 需要开启 `strictNullChecks`（见 `tsconfig.json`）。
- `content-collections` 是构建期生成的虚拟模块；TypeScript 类型通过 `src/content-collections.d.ts` 提供（不依赖生成目录）。
- SSR Router 必须每个请求创建新实例：禁止在服务端复用 Router 单例（避免反代/多域名场景出现自重定向循环）。
