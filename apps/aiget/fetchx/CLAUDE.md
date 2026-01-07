# Fetchx

> 原子能力：网页数据 API（抓取、爬取、数据提取）

## 概述

Fetchx 是 Aiget 平台的网页数据服务，为 LLM 和 AI 应用提供网页内容提取能力。

## 应用结构

| 应用   | 路径         | 说明                                   |
| ------ | ------------ | -------------------------------------- |
| Server | `../server/` | Aiget Dev 统一后端（包含 Fetchx 模块） |
| WWW    | `../www/`    | Aiget Dev 官网（模块页：`/fetchx`）    |

## 核心功能

- **Scrape API** - 单页抓取（Markdown、HTML、截图、链接）
- **Crawl API** - 多页爬取
- **Map API** - URL 发现（不抓取内容）
- **Extract API** - AI 结构化数据提取
- **Search API** - 网页搜索
- **Batch Scrape API** - 批量抓取
- **oEmbed API** - oEmbed 协议支持

## API Key 前缀

`ag_` - Aiget Dev 统一 API Key

## 域名

| 服务   | 域名             |
| ------ | ---------------- |
| API    | aiget.dev/api/v1 |
| 落地页 | aiget.dev/fetchx |

## 开发命令

```bash
# 启动 Aiget Server 开发
pnpm dev:aiget

# 启动 WWW 开发
pnpm dev:aiget:www

# 类型检查
pnpm --filter @aiget/aiget-server typecheck
pnpm --filter @aiget/aiget-www typecheck
```

## 迁移来源

从 `/Users/bowling/code/me/fetchx` 迁移。

---

_版本: 1.0 | 迁移日期: 2026-01-05_
