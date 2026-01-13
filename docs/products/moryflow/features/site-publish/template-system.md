---
title: 站点模板系统
date: 2026-01-12
scope: moryflow, site-template
status: draft
---

<!--
[INPUT]: 站点模板的组织方式与构建产物（Vite/React/Tailwind）
[OUTPUT]: 模板系统的结构与约束（Monorepo 路径）
[POS]: Moryflow 内部技术文档：站点发布模板

[PROTOCOL]: 本文件变更时同步更新 `docs/products/moryflow/index.md`。
-->

# 站点模板系统

## 需求

使用 Vite + React 19 + TailwindCSS v4 构建站点模板：

- 自动布局选择（单页/多页）
- 明暗模式适配
- SSG 输出纯 HTML + CSS

## 技术方案

### 技术栈

| 依赖        | 版本  |
| ----------- | ----- |
| vite        | ^7.3  |
| react       | ^19.2 |
| tailwindcss | ^4.1  |

### 设计系统

**设计原则**：极简克制、呼吸留白、柔和圆润、微妙层次、丝滑过渡

**色彩系统**：

| 用途    | Light           | Dark                  |
| ------- | --------------- | --------------------- |
| 背景-主 | #ffffff         | #191919               |
| 背景-次 | #f7f6f3         | #252525               |
| 文字-主 | rgb(55,53,47)   | rgba(255,255,255,0.9) |
| 链接    | rgb(35,131,226) | rgb(82,156,232)       |

### 布局结构

**单页面布局**（单文档发布，max-width: 720px 居中）

**多页面布局**（多文档发布，Sidebar 240px + Content 860px）

### 核心逻辑（伪代码）

```
# 布局自动选择
detectLayout(pages):
  return pages.length == 1 ? 'single' : 'multi'

# 主题初始化（内联到 <head>）
themeScript:
  theme = localStorage.get('theme') || 'system'
  isDark = theme == 'dark' ||
    (theme == 'system' && matchMedia('(prefers-color-scheme: dark)'))
  document.documentElement.classList.toggle('dark', isDark)

# SSG 构建
build():
  singleHtml = renderToStaticMarkup(<SinglePage />)
  multiHtml = renderToStaticMarkup(<MultiPage />)
  output with placeholders: {{title}}, {{content}}, {{navigation}}
```

### 响应式断点

| 断点 | 宽度   | 布局变化   |
| ---- | ------ | ---------- |
| sm   | 640px  | 隐藏侧边栏 |
| lg   | 1024px | 显示侧边栏 |
| xl   | 1280px | 显示 TOC   |

## 代码索引

| 模块            | 路径                                                          |
| --------------- | ------------------------------------------------------------- |
| 模板工程        | `apps/moryflow/site-template/`                                |
| Markdown 渲染器 | `apps/moryflow/pc/src/main/site-publish/markdown-renderer.ts` |
| 站点构建器      | `apps/moryflow/pc/src/main/site-publish/site-builder.ts`      |
