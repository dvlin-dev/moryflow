---
title: Moryflow WWW SEO Content Guidelines
scope: apps/moryflow/www
status: active
---

# Moryflow WWW SEO 内容规范

本文档约束 Moryflow 官网 SEO landing 页和 Compare 页的内容生产方式。它既服务人工撰写，也服务后续自动化生成，但所有页面模型都要以当前代码事实为准，不单独发明第二套结构。

## 页面类型

当前页面类型以 `apps/moryflow/www/src/lib/site-pages.ts` 为准：

| 类型          | 说明               | Schema                            |
| ------------- | ------------------ | --------------------------------- |
| `home`        | 首页               | `SoftwareApplication`             |
| `product`     | 下载页、定价页     | `WebPage` / `SoftwareApplication` |
| `hub`         | use-case 聚合页    | `WebPage`                         |
| `seo-landing` | 关键词落地页       | `FAQPage`                         |
| `compare`     | 对比页与对比目录页 | `WebPage` / `FAQPage`             |
| `legal`       | 隐私政策、服务条款 | `WebPage`                         |

## Slug 规则

- 全小写，单词用连字符分隔：`/agent-workspace`、`/ai-note-taking-app`
- 对比页统一前缀 `/compare/`：`/compare/notion`
- 不使用下划线、驼峰、尾部斜杠
- 页面 path 必须与 `src/lib/site-pages.ts` 中的 `path` 完全一致
- 路由文件放在 `src/routes/{-$locale}/` 下；对比页放在 `src/routes/{-$locale}/compare/`

## 关键词输入格式

每页都要明确：

- `Primary keyword`：核心目标词，1 个
- `Secondary keywords`：相关长尾词，2-5 个
- `Search intent`：Informational / Commercial / Navigational
- `Target audience`：目标用户画像，1-2 句

## Title / H1 / Meta 模板

### Title

```text
{Page Title} | Moryflow
```

- 总长度不超过 60 字符
- 核心关键词放在前面
- 禁止全大写、感叹号、emoji

### H1

- 每页只有一个 H1
- H1 必须包含 primary keyword 或自然变体
- H1 不和 `<title>` 完全重复，但含义保持一致
- 不以问句作为 H1

### Meta Description

- 120-155 字符
- 包含 primary keyword
- 直接说明用户能得到什么
- 禁止使用 `Learn more`、`Discover` 这类空话开头

## 内容结构

### SEO landing 页

固定结构：

```text
Hero → Problem Framing → Why Moryflow → Workflow → FAQ → Related Pages → CTA
```

要求：

- Hero 只承担关键词、价值说明和下载 CTA
- Problem Framing 必须写真实用户痛点，不写模板句式
- Why Moryflow 用具体能力解释问题如何被解决
- Workflow 写清步骤顺序，不堆术语
- FAQ 至少 4 组

### Compare 页

固定结构：

```text
Hero → At a Glance → Who It's For → Key Differences → FAQ → Related Pages → CTA
```

要求：

- `At a Glance` 以事实对照为主，不下判断
- `Who It's For` 同时写 Moryflow 和竞品各自更适合谁
- `Key Differences` 用中性语言描述方法差异
- Compare 页最终仍回到下载入口，而不是另外引导到旧功能页

## FAQ 规则

- 问题使用自然搜索语句
- 答案 2-4 句话，直接回答，不绕
- 不写 `Great question` 之类套话
- 每页至少 1 个定义型问题
- 每页至少 1 个差异型问题
- FAQ 同时服务页面内容和 FAQPage schema

## Schema 规则

- SEO landing 页默认使用 `FAQPage`
- Compare 目录页可用 `WebPage`
- Compare 具体页面优先使用 `FAQPage`
- 首页使用 `SoftwareApplication`
- 下载页使用 `SoftwareApplication`
- 其他产品页使用 `WebPage`

## Registry 规则

每个新页面都必须先注册到 `src/lib/site-pages.ts`。当前字段以 `SitePageDefinition` 为准：

| 字段           | 必需 | 说明                                                             |
| -------------- | ---- | ---------------------------------------------------------------- |
| `id`           | 是   | 稳定页面标识                                                     |
| `path`         | 是   | URL path（无 locale 前缀），以 `/` 开头                          |
| `kind`         | 是   | `home` / `product` / `hub` / `seo-landing` / `compare` / `legal` |
| `indexable`    | 是   | 是否允许索引                                                     |
| `locales`      | 是   | 当前发布的 locale 状态映射                                       |
| `schema`       | 是   | `WebPage` / `FAQPage` / `SoftwareApplication` / `none`           |
| `lastModified` | 是   | ISO 日期字符串，通常使用构建时间                                 |
| `ogImage`      | 否   | 页面自定义 OG 图地址                                             |

补充约束：

- 新页面不允许绕过 registry 单独接 sitemap、meta 或 locale
- `lastModified` 以构建常量为准，不在运行时动态生成
- `locales` 当前统一按 `en` / `zh` 双语发布处理，除非代码事实变化

## Internal Linking 规则

- 每个 SEO landing 页的 `relatedPages` 至少 3 个内链
- 链接目标至少覆盖 1 个同类 SEO 页和 1 个产品页
- 产品页优先使用 `/download` 与 `/pricing`
- 对比页回链到对应能力页和 `/download`
- Footer `Resources` 组保持 `/blog` 与 `/use-cases` 稳定入口
- 首页 Hero 与 blog index 需要保留 `/use-cases` 的强入口，避免 hub 只依赖 sitemap 与 footer 被发现
- `/use-cases` 是允许索引的聚合页，可作为 landing / compare / blog 之间的发现中枢

## CTA 规则

- 每页有且仅有 2 个下载 CTA：Hero 1 个，底部 1 个
- CTA 文案统一：`Download Moryflow`
- CTA 使用 `@moryflow/ui` 的 `Button`
- 必须设置 `data-track-cta`
- CTA 下方小字统一为：`Free during beta · macOS (Apple Silicon and Intel)`
- CTA 目标统一为 `/download`

## 禁止项

### 文案禁止

- `Have you ever...` / `Imagine...` / `你是否曾经...`
- `Best` / `industry-leading` / `revolutionary`
- `替代品` / `更好` / `更强` / `killer`
- 虚构用户评价、统计数据、社会证明
- 未经核查的竞品功能描述

### 技术禁止

- `lastModified` 使用运行时 `new Date()`
- 页面未注册到 `site-pages.ts`
- FAQ 少于 4 组
- 缺少 schema
- 内链不足 3 个

### 视觉禁止

- 装饰性动画（float / glow / particle / gradient blob）
- 大面积 `backdrop-blur`
- 无必要的重装饰背景

## 实施流程

1. 先在 `site-pages.ts` 注册页面
2. 再创建或更新对应 route 文件
3. 补页面 meta、schema、CTA 和 related pages
4. 跑最小必要验证

最低验证命令：

```bash
pnpm --filter @moryflow/www typecheck
pnpm --filter @moryflow/www test:unit
```
