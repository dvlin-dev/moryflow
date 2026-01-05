# Fetchx

> 原子能力：网页数据 API（抓取、爬取、数据提取）

## 概述

Fetchx 是 Aiget 平台的网页数据服务，为 LLM 和 AI 应用提供网页内容提取能力。

## 应用结构

| 应用   | 路径      | 说明                     |
| ------ | --------- | ------------------------ |
| Server | `server/` | NestJS 后端 API          |
| WWW    | `www/`    | 落地页（TanStack Start） |

## 核心功能

- **Scrape API** - 单页抓取（Markdown、HTML、截图、链接）
- **Crawl API** - 多页爬取
- **Map API** - URL 发现（不抓取内容）
- **Extract API** - AI 结构化数据提取
- **Search API** - 网页搜索
- **Batch Scrape API** - 批量抓取
- **oEmbed API** - oEmbed 协议支持

## API Key 前缀

`fx_` - Fetchx 专用 API Key

## 域名

| 服务   | 域名                 |
| ------ | -------------------- |
| API    | fetchx.aiget.dev     |
| 落地页 | fetchx.com（规划中） |

## 开发命令

```bash
# 启动 Server 开发
pnpm dev:fetchx

# 启动 WWW 开发
pnpm dev:fetchx:www

# 类型检查
pnpm --filter @aiget/fetchx-server typecheck
pnpm --filter @aiget/fetchx-www typecheck
```

## 迁移来源

从 `/Users/zhangbaolin/code/me/fetchx` 迁移。

---

_版本: 1.0 | 迁移日期: 2026-01-05_
