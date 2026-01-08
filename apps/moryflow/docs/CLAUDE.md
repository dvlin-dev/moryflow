<!--
[INPUT]: Moryflow Docs 站点源码（TanStack Start + Fumadocs + MDX）
[OUTPUT]: 本目录的职责边界、结构与常用开发命令
[POS]: `docs.moryflow.com` 的独立文档站点（不与官网/应用耦合）

[PROTOCOL]: 本目录结构或站点约束变更时，需同步更新根 `CLAUDE.md` 与 `docs/architecture/*` 中的域名口径（若影响全局）。
-->

# Moryflow Docs

Moryflow 对外文档站点，部署到 `docs.moryflow.com`，与 `www.moryflow.com`（营销）和 `app.moryflow.com`（应用+API）解耦。

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
