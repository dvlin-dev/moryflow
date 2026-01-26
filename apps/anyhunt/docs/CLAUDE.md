# Docs

> This folder structure changes require updating this document.

## Overview

API documentation and usage guides. Built with TanStack Start + Fumadocs.

## Responsibilities

- API reference documentation
- Getting started guides
- Code examples
- Full-text search
- Multi-language support (i18n)

## Constraints

- Static/SSR generation
- MDX for documentation content
- Fumadocs conventions
- Source content in `/content/docs/`
- `strictNullChecks` must be enabled (TanStack Router requirement)
- SSR Router 必须每个请求创建新实例：禁止在服务端复用 Router 单例（避免反代/多域名场景出现自重定向循环）。
- Docker 构建固定使用 pnpm@9.12.2（避免 corepack pnpm@9.14+ 在容器内出现 depNode.fetching 报错）
- Docker 构建安装依赖使用 `node-linker=hoisted` 且关闭 `shamefully-hoist`，避免 pnpm link 阶段崩溃

## 环境变量

- 默认无必填环境变量
- 示例文件：`.env.example`

## Directory Structure

| Directory     | Description                   |
| ------------- | ----------------------------- |
| `routes/`     | File-based routing            |
| `components/` | Custom doc components         |
| `lib/`        | Fumadocs config, search, i18n |
| `styles/`     | Documentation styles          |

## Routes

```
routes/
├── __root.tsx        # Root layout
├── index.tsx         # Home page
├── $lang/            # Internationalized routes
│   └── docs/$.tsx    # Dynamic docs page
└── docs/$.tsx        # Fallback docs route
```

## Key Files

| File                           | Description                    |
| ------------------------------ | ------------------------------ |
| `lib/source.ts`                | Fumadocs content source config |
| `lib/search.ts`                | Search implementation          |
| `lib/i18n.ts`                  | Internationalization setup     |
| `lib/layout.shared.tsx`        | Shared layout components       |
| `mdx-components.tsx`           | Custom MDX component overrides |
| `components/search-dialog.tsx` | Search UI                      |
| `components/providers.tsx`     | Context providers              |

## Content Location

Documentation content is in `/content/docs/` at project root:

```
content/
└── docs/
    ├── index.mdx           # Introduction
    ├── getting-started.mdx
    ├── api/
    │   ├── scrape.mdx
    │   ├── crawl.mdx
    │   └── ...
    └── guides/
        └── ...
```

## Common Modification Scenarios

| Scenario               | Files to Modify         | Notes            |
| ---------------------- | ----------------------- | ---------------- |
| Add documentation page | `/content/docs/`        | Create MDX file  |
| Add custom component   | `mdx-components.tsx`    | Register for MDX |
| Change search config   | `lib/search.ts`         |                  |
| Add language           | `lib/i18n.ts`           | Configure locale |
| Change layout          | `lib/layout.shared.tsx` |                  |

## MDX Components

```tsx
// mdx-components.tsx
export const mdxComponents = {
  // Override default elements
  h1: (props) => <h1 className="..." {...props} />,
  // Custom components
  CodeBlock: (props) => <CustomCodeBlock {...props} />,
  // ...
};
```

## Dependencies

```
docs/
├── @tanstack/start - SSR framework
├── fumadocs-core - Docs framework
├── fumadocs-mdx - MDX processing
├── fumadocs-ui - Doc UI components
└── shiki - Syntax highlighting
```

## Key Exports

This is a standalone app, no exports to other packages.

## Notes

- `content-collections` 是构建期生成的虚拟模块；TypeScript 类型通过本仓库的 `src/content-collections.d.ts` 提供（不依赖生成目录）。
- API 示例统一使用 `https://server.anyhunt.app/api/v1` 作为 Base URL。
- Docs 顶部导航 GitHub 链接固定为 `https://github.com/anyhunt`。

## Recent Changes

- API 示例统一为 raw JSON 成功体 + RFC7807 错误体，移除 `success/data` 包装示例
- Docker build 仅复制根 `node_modules`，避免 hoisted 模式缺失包级目录导致失败
