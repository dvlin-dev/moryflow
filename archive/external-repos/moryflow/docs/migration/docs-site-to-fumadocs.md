# MoryFlow 文档站迁移方案

> 将 `apps/docs-site`（Rspress）迁移至 `apps/docs`（Fumadocs + TanStack React Start）

## 目标

1. 复用 aiget/apps/docs 的架构和代码，快速搭建新文档站
2. 迁移现有 docs-site 的全部内容（中英文文档）
3. 保留并改造自定义组件（如 DownloadButtons）
4. 删除旧的 apps/docs-site 目录

---

## 一、架构对比

| 维度 | docs-site（现有） | aiget/apps/docs（参考） | apps/docs（目标） |
|------|------------------|------------------------|------------------|
| 文档框架 | Rspress | Fumadocs | Fumadocs |
| 前端框架 | React | React 19 | React 19 |
| 路由 | Rspress 内置 | TanStack Router | TanStack Router |
| 构建工具 | Rspress CLI | Vite 7 | Vite 7 |
| SSR | 静态生成 | Nitro SSR | Nitro SSR |
| 内容处理 | Rspress MDX | Content Collections | Content Collections |
| 搜索 | Rspress 内置 | Orama + 汉语分词 | Orama + 汉语分词 |
| 样式 | Rspress 主题 | Tailwind CSS v4 | Tailwind CSS v4 |
| 国际化 | 路径前缀 `/zh/` | 文件后缀 `.zh.mdx` | 文件后缀 `.zh.mdx` |

### 优势分析

Fumadocs 架构优势：

1. **SSR 支持**：更好的 SEO 和首屏性能
2. **搜索功能**：内置 Orama 全文搜索，支持中文分词
3. **类型安全**：Content Collections 编译时类型检查
4. **现代构建**：Vite 7 极速开发体验
5. **Server Functions**：无需额外 API 路由
6. **统一技术栈**：与主项目 TailwindCSS 风格一致

---

## 二、迁移步骤

### Phase 1: 复制参考项目架构

**操作**：直接复制 aiget/apps/docs 到 apps/docs，然后进行改造

```bash
# 1. 复制整个目录
cp -r /Users/bowling/code/me/aiget/apps/docs ./apps/docs

# 2. 删除 aiget 相关内容（保留架构）
rm -rf apps/docs/content/docs/*
rm -rf apps/docs/.content-collections
rm -rf apps/docs/.output
rm -rf apps/docs/node_modules
```

### Phase 2: 配置调整

#### 2.1 package.json 修改

```json
{
  "name": "@moryflow/docs",
  "version": "0.0.1",
  "description": "MoryFlow Documentation",
  "scripts": {
    "dev": "vite --port 5190",
    "build": "vite build",
    "start": "node .output/server/index.mjs",
    "typecheck": "tsc --noEmit"
  }
}
```

#### 2.2 vite.config.ts 修改

```typescript
// 修改 sitemap host
tanstackStart({
  prerender: false,
  sitemap: {
    enabled: true,
    host: 'https://docs.moryflow.com',  // 改为 MoryFlow 域名
  },
})
```

#### 2.3 i18n 配置保持不变

```typescript
// src/lib/i18n.ts
export const { I18nProvider, useI18n, createI18nMiddleware } = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'zh'],
  hideLocale: 'default-locale',
})
```

#### 2.4 布局配置修改（src/lib/layout.shared.tsx）

```typescript
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export function getLayoutConfig(locale: string): BaseLayoutProps {
  return {
    githubUrl: 'https://github.com/dvlin-dev/moryflow',  // 改为 MoryFlow 仓库
    nav: {
      title: (
        <>
          <img src="/logo.svg" alt="MoryFlow" className="size-5" />
          <span className="font-medium ml-2">MoryFlow Docs</span>
        </>
      ),
    },
    links: [
      {
        text: locale === 'zh' ? '下载' : 'Download',
        url: 'https://moryflow.com/download',
      },
      {
        text: locale === 'zh' ? '官网' : 'Website',
        url: 'https://moryflow.com',
      },
    ],
  }
}
```

### Phase 3: 内容迁移

#### 3.1 文件命名规则转换

| Rspress（现有） | Fumadocs（目标） |
|----------------|-----------------|
| `docs/zh/getting-started/index.md` | `content/docs/getting-started.zh.mdx` |
| `docs/en/getting-started/index.md` | `content/docs/getting-started.mdx` |
| `docs/zh/features/vault.md` | `content/docs/features/vault.zh.mdx` |
| `docs/en/features/vault.md` | `content/docs/features/vault.mdx` |

#### 3.2 内容结构映射

```
content/docs/
├── meta.json                    # 英文导航
├── meta.zh.json                 # 中文导航
├── index.mdx                    # 首页（英文）
├── index.zh.mdx                 # 首页（中文）
├── getting-started.mdx          # 快速开始
├── getting-started.zh.mdx
├── features/                    # 功能详解
│   ├── meta.json
│   ├── meta.zh.json
│   ├── vault.mdx
│   ├── vault.zh.mdx
│   ├── editor.mdx
│   ├── editor.zh.mdx
│   ├── ai-assistant.mdx
│   ├── ai-assistant.zh.mdx
│   ├── ai-tools.mdx
│   ├── ai-tools.zh.mdx
│   └── mcp.mdx
│   └── mcp.zh.mdx
├── guides/                      # 使用指南
│   ├── meta.json
│   ├── meta.zh.json
│   ├── study-prep.mdx
│   ├── study-prep.zh.mdx
│   └── ...
├── settings/                    # 设置配置
│   ├── meta.json
│   ├── meta.zh.json
│   ├── ai-models.mdx
│   ├── ai-models.zh.mdx
│   └── ...
├── advanced/                    # 进阶使用
│   ├── meta.json
│   ├── meta.zh.json
│   └── ...
└── faq.mdx                      # FAQ
└── faq.zh.mdx
```

#### 3.3 导航配置迁移

**现有 rspress.config.ts 中的 zhSidebar：**
```typescript
const zhSidebar: Sidebar = {
  '/zh/': [
    { text: '快速开始', link: '/zh/getting-started/', items: [...] },
    { text: '功能详解', link: '/zh/features/', items: [...] },
    // ...
  ],
}
```

**转换为 meta.zh.json：**
```json
{
  "title": "文档",
  "pages": [
    "index",
    "getting-started",
    "---功能详解---",
    "features/...",
    "---使用指南---",
    "guides/...",
    "---设置配置---",
    "settings/...",
    "---进阶使用---",
    "advanced/...",
    "---常见问题---",
    "faq"
  ]
}
```

#### 3.4 Frontmatter 格式转换

**Rspress 格式（现有）：**
```yaml
---
pageType: doc
title: 快速开始
---
```

**Fumadocs 格式（目标）：**
```yaml
---
title: 快速开始
description: 了解 MoryFlow 的基本使用方法
---
```

### Phase 4: 组件迁移

#### 4.1 DownloadButtons 组件改造

**位置**：`apps/docs/src/components/download-buttons.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'

interface Manifest {
  version: string
  platforms: {
    mac: { dmg: string }
    windows: { exe: string }
  }
}

export function DownloadButtons({ locale }: { locale: string }) {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [downloadState, setDownloadState] = useState<Record<string, 'idle' | 'preparing' | 'downloading'>>({})

  useEffect(() => {
    fetch('https://download.moryflow.com/manifest.json')
      .then(res => res.json())
      .then(setManifest)
      .catch(console.error)
  }, [])

  const handleDownload = (platform: string, url: string) => {
    setDownloadState(prev => ({ ...prev, [platform]: 'preparing' }))

    setTimeout(() => {
      setDownloadState(prev => ({ ...prev, [platform]: 'downloading' }))
      window.location.href = url

      setTimeout(() => {
        setDownloadState(prev => ({ ...prev, [platform]: 'idle' }))
      }, 3000)
    }, 500)
  }

  if (!manifest) {
    return <div className="animate-pulse h-10 bg-muted rounded" />
  }

  const labels = {
    mac: locale === 'zh' ? 'macOS (Apple Silicon)' : 'macOS (Apple Silicon)',
    windows: locale === 'zh' ? 'Windows (64-bit)' : 'Windows (64-bit)',
    version: locale === 'zh' ? '当前版本' : 'Current version',
  }

  return (
    <div className="flex flex-col gap-4 not-prose">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleDownload('mac', manifest.platforms.mac.dmg)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
          disabled={downloadState.mac === 'downloading'}
        >
          <AppleIcon className="size-5" />
          {labels.mac}
        </button>
        <button
          onClick={() => handleDownload('windows', manifest.platforms.windows.exe)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
          disabled={downloadState.windows === 'downloading'}
        >
          <WindowsIcon className="size-5" />
          {labels.windows}
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        {labels.version}: v{manifest.version}
      </p>
    </div>
  )
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
    </svg>
  )
}
```

#### 4.2 注册到 MDX 组件

```typescript
// src/mdx-components.tsx
import { DownloadButtons } from './components/download-buttons'

export function getMDXComponents(): MDXComponents {
  return {
    ...defaultMdxComponents,
    DownloadButtons,  // 新增
    // ... 其他组件
  }
}
```

### Phase 5: 样式适配

#### 5.1 保持现有 globals.css 结构

参考项目的 OKLch 色彩系统和 Tailwind v4 配置可直接复用。

#### 5.2 添加 MoryFlow 品牌色（可选）

```css
/* src/styles/globals.css */
:root {
  --radius: 0.5rem;  /* MoryFlow 使用圆角 */
  /* 可根据 MoryFlow 品牌调整 */
}
```

### Phase 6: 首页改造

#### 6.1 英文首页（src/routes/index.tsx）

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { DownloadButtons } from '@/components/download-buttons'

export const Route = createFileRoute('/')({
  component: HomePage,
  head: () => ({
    meta: [
      { title: 'MoryFlow Docs - Your AI Note Companion' },
      { name: 'description', content: 'Official documentation for MoryFlow, an AI-powered note-taking application.' },
    ],
  }),
})

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold">MoryFlow</h1>
        <p className="text-xl text-muted-foreground">
          Your Thoughtful AI Note Companion
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/docs" className="px-6 py-3 bg-primary text-primary-foreground rounded-md">
            Get Started
          </a>
          <a href="/docs/features" className="px-6 py-3 border border-border rounded-md">
            Explore Features
          </a>
        </div>
        <div className="pt-8">
          <DownloadButtons locale="en" />
        </div>
      </div>
    </div>
  )
}
```

### Phase 7: 清理和验证

```bash
# 1. 删除旧项目
rm -rf apps/docs-site

# 2. 更新根 package.json 的 workspaces（如有必要）

# 3. 安装依赖
cd apps/docs && pnpm install

# 4. 运行开发服务器验证
pnpm dev

# 5. 构建测试
pnpm build

# 6. 类型检查
pnpm typecheck
```

---

## 三、迁移脚本

为简化内容迁移，创建以下脚本：

### scripts/migrate-docs.ts

```typescript
import * as fs from 'fs'
import * as path from 'path'

const SOURCE_DIR = 'apps/docs-site/docs'
const TARGET_DIR = 'apps/docs/content/docs'

// 语言映射
const LANG_MAP = {
  'zh': '.zh',
  'en': ''  // 英文不加后缀
}

// 目录映射（Rspress 多层 → Fumadocs 扁平化）
const DIR_MAP = {
  'getting-started/index.md': 'getting-started.mdx',
  'getting-started/installation.md': 'getting-started/installation.mdx',
  'getting-started/first-note.md': 'getting-started/first-note.mdx',
  'getting-started/first-chat.md': 'getting-started/first-chat.mdx',
  // ... 其他映射
}

function migrateFile(srcPath: string, lang: string) {
  const content = fs.readFileSync(srcPath, 'utf-8')

  // 转换 frontmatter
  const converted = convertFrontmatter(content)

  // 计算目标路径
  const relativePath = path.relative(`${SOURCE_DIR}/${lang}`, srcPath)
  const targetPath = getTargetPath(relativePath, lang)

  // 写入文件
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.writeFileSync(targetPath, converted)

  console.log(`Migrated: ${srcPath} → ${targetPath}`)
}

function convertFrontmatter(content: string): string {
  // 移除 pageType: doc，添加 description（如果没有）
  return content
    .replace(/^---\n([\s\S]*?)---/, (match, yaml) => {
      const lines = yaml.trim().split('\n')
      const filtered = lines.filter((line: string) => !line.startsWith('pageType:'))

      // 如果没有 description，从内容生成
      if (!filtered.some((l: string) => l.startsWith('description:'))) {
        const firstParagraph = content.split('---')[2]?.trim().split('\n')[0] || ''
        filtered.push(`description: "${firstParagraph.slice(0, 150)}"`)
      }

      return `---\n${filtered.join('\n')}\n---`
    })
}

function getTargetPath(relativePath: string, lang: string): string {
  const langSuffix = LANG_MAP[lang as keyof typeof LANG_MAP]
  const baseName = relativePath.replace('.md', '')
  return path.join(TARGET_DIR, `${baseName}${langSuffix}.mdx`)
}

// 执行迁移
['zh', 'en'].forEach(lang => {
  const langDir = path.join(SOURCE_DIR, lang)
  // 递归处理所有 .md 文件
  // ...
})
```

---

## 四、验收标准

### 功能验收

- [ ] 所有现有页面在新站点可正常访问
- [ ] 中英文切换正常工作
- [ ] 搜索功能支持中英文
- [ ] DownloadButtons 组件正常下载
- [ ] 侧边栏导航结构与原站一致
- [ ] 深色/浅色主题切换正常

### 性能验收

- [ ] 首页 LCP < 2s
- [ ] 文档页 TTI < 3s
- [ ] Lighthouse Performance > 90

### SEO 验收

- [ ] sitemap.xml 正常生成
- [ ] 所有页面有正确的 title 和 description
- [ ] Open Graph 和 Twitter Card 正常

---

## 五、时间线

不提供时间估算，按以下优先级执行：

1. **P0 - 核心架构**：复制参考项目、配置调整
2. **P0 - 内容迁移**：全部文档内容迁移
3. **P1 - 组件改造**：DownloadButtons 等组件
4. **P1 - 首页设计**：首页布局和内容
5. **P2 - 样式优化**：品牌色、细节调整
6. **P2 - 清理验证**：删除旧项目、完整测试

---

## 六、风险和注意事项

### 风险

1. **内容格式差异**：Rspress 和 Fumadocs 的 MDX 语法可能有细微差异
2. **导航结构**：`_meta.json` 和 `meta.json` 格式不同，需手动转换
3. **自定义组件**：DownloadButtons 需要适配 Fumadocs 的 SSR 环境

### 注意事项

1. **保留 Git 历史**：使用 `git mv` 而非 `rm + cp`（如需保留历史）
2. **图片资源**：检查 `public/` 目录的资源引用路径
3. **外部链接**：验证所有外部链接仍然有效
4. **搜索索引**：确保中文分词器正确配置

---

## 七、审阅确认

请确认以下事项后开始迁移：

- [x] 同意使用 Fumadocs + TanStack React Start 架构
- [x] 同意删除 apps/docs-site 目录
- [x] 确认域名：docs.moryflow.com
- [x] 确认品牌色和样式调整需求

---

## 八、迁移执行记录

迁移已于 2025-01-04 完成：

| 步骤 | 状态 | 说明 |
|------|------|------|
| Phase 1: 复制架构 | ✅ | 从 aiget/apps/docs 复制到 apps/docs |
| Phase 2: 配置调整 | ✅ | package.json、vite.config、layout.shared |
| Phase 3: 内容迁移 | ✅ | 54 个 MDX 文件（中英双语） |
| Phase 4: 组件迁移 | ✅ | DownloadButtons 组件 |
| Phase 5: 首页改造 | ✅ | 中英文首页 |
| Phase 6: 删除旧项目 | ✅ | 已删除 apps/docs-site |
| Phase 7: 验证测试 | ✅ | 开发服务器正常运行 |

### 后续待办

1. 添加实际的截图图片资源
2. 部署到 docs.moryflow.com
3. 配置 CI/CD 自动构建

---

**文档创建时间**：2025-01-04
**文档状态**：✅ 已完成
