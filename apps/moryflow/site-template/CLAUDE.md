# Site Template

> SSG 模板工程，用于生成用户发布站点的 HTML 模板

## 目录结构

```
apps/moryflow/site-template/
├── src/
│   ├── components/       # 共享组件（开发预览用）
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Navigation.tsx
│   │   ├── TableOfContents.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── MobileNav.tsx
│   ├── styles/           # CSS 源文件
│   │   ├── app.css          # 主样式 + CSS 变量
│   │   └── prose.css        # Markdown 排版
│   ├── templates/        # HTML 模板源文件（手动维护）
│   │   ├── page.html        # 页面模板
│   │   ├── sidebar.html     # 侧边栏模板
│   │   ├── index-page.html  # 目录页模板
│   │   ├── index-page.css   # 目录页额外样式
│   │   ├── 404.html         # 404 页面模板
│   │   ├── 404.css          # 404 页面额外样式
│   │   └── fragments/       # 模板片段（sync 时注入）
│   │       ├── theme-toggle-button.html
│   │       └── brand-footer-link.html
│   ├── build.ts          # SSG 构建脚本
│   └── main.tsx          # 开发预览入口
├── scripts/
│   └── sync.ts           # 同步脚本
├── dist/                 # 构建产物
│   ├── styles.css
│   └── styles.min.css    # ← 同步到 PC 端
└── index.html            # 开发入口
```

## 构建与同步流程

### 完整流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                apps/moryflow/site-template/                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  src/styles/              pnpm build         dist/              │
│  ├── app.css        ─────────────────→   styles.min.css         │
│  └── prose.css                                 │                │
│                                                │                │
│  src/templates/           pnpm sync           │                │
│  ├── page.html      ──────────────────────────┼────────────┐   │
│  ├── sidebar.html   ──────────────────────────┼────────────┤   │
│  ├── index-page.html ─────────────────────────┼────────────┤   │
│  ├── index-page.css  ─────────────────────────┼────────────┤   │
│  ├── 404.html       ──────────────────────────┼────────────┤   │
│  └── 404.css        ──────────────────────────┼────────────┤   │
│                                                │            │   │
│  src/templates/fragments/   pnpm sync         │            │   │
│  ├── theme-toggle-button ──────────────────────┼────────────┤   │
│  └── brand-footer-link ────────────────────────┼────────────┤   │
│                                                │            │   │
│  scripts/sync.ts                               │            │   │
│  ├── THEME_* / MENU 脚本（硬编码） ─────────────┼────────────┤   │
│  └── 片段注入 + 默认占位符落地 ─────────────────┼────────────┤   │
│                                                │            │   │
└────────────────────────────────────────────────┼────────────┼───┘
                                                 │            │
                                                 ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│        apps/moryflow/pc/src/main/site-publish/template/         │
├─────────────────────────────────────────────────────────────────┤
│  index.ts              ← 统一导出（自动生成）                    │
│  styles.ts             ← dist/styles.min.css                    │
│  scripts.ts            ← 主题脚本（硬编码在 sync.ts）            │
│  page.ts               ← src/templates/page.html                │
│  sidebar.ts            ← src/templates/sidebar.html             │
│  index-page.ts         ← src/templates/index-page.html          │
│  index-page-styles.ts  ← src/templates/index-page.css           │
│  404.ts                ← src/templates/404.html                 │
│  404-styles.ts         ← src/templates/404.css                  │
└─────────────────────────────────────────────────────────────────┘
```

### 命令说明

| 命令         | 作用                    | 输入                                                         | 输出                                      |
| ------------ | ----------------------- | ------------------------------------------------------------ | ----------------------------------------- |
| `pnpm build` | 构建样式 + 模板契约校验 | `src/build.ts` + `src/styles/*.css` + `src/templates/*.html` | `dist/styles.css` + `dist/styles.min.css` |
| `pnpm sync`  | 同步模板                | `dist/` + `src/templates/` + `src/templates/fragments/`      | `template/*.ts`                           |

### 开发流程

```bash
# 1. 修改样式后
pnpm build && pnpm sync

# 2. 只修改 HTML 模板后（建议先做契约校验）
pnpm build && pnpm sync

# 3. 开发预览
pnpm dev
```

## 文件对照表

| 源文件                           | 生成文件                 | 导出常量                                   |
| -------------------------------- | ------------------------ | ------------------------------------------ |
| `dist/styles.min.css`            | `styles.ts`              | `STYLES`                                   |
| sync.ts 硬编码                   | `scripts.ts`             | `THEME_INIT_SCRIPT`, `THEME_TOGGLE_SCRIPT` |
| `src/templates/fragments/*.html` | 注入到 `page/index` 模板 | `THEME_TOGGLE_BUTTON`、`BRAND_FOOTER_LINK` |
| `src/templates/page.html`        | `page.ts`                | `PAGE_TEMPLATE`                            |
| `src/templates/sidebar.html`     | `sidebar.ts`             | `SIDEBAR_TEMPLATE`                         |
| `src/templates/index-page.html`  | `index-page.ts`          | `INDEX_PAGE_TEMPLATE`                      |
| `src/templates/index-page.css`   | `index-page-styles.ts`   | `INDEX_PAGE_STYLES`                        |
| `src/templates/404.html`         | `404.ts`                 | `ERROR_404_TEMPLATE`                       |
| `src/templates/404.css`          | `404-styles.ts`          | `ERROR_404_STYLES`                         |
| 自动生成                         | `index.ts`               | 统一导出所有常量                           |

## 模板占位符

模板中使用 `{{变量名}}` 作为占位符，在渲染时替换：

### 通用占位符

| 占位符                    | 说明           | 替换位置                        |
| ------------------------- | -------------- | ------------------------------- |
| `{{STYLES}}`              | 核心 CSS 样式  | `renderer/index.ts`             |
| `{{THEME_INIT_SCRIPT}}`   | 主题初始化脚本 | `renderer/index.ts`             |
| `{{THEME_TOGGLE_SCRIPT}}` | 主题切换脚本   | `renderer/index.ts`             |
| `{{MENU_TOGGLE_SCRIPT}}`  | 菜单切换脚本   | `renderer/index.ts`             |
| `{{THEME_TOGGLE_BUTTON}}` | 主题按钮片段   | `scripts/sync.ts`（导出前注入） |
| `{{BRAND_FOOTER_LINK}}`   | 品牌页脚片段   | `scripts/sync.ts`（导出前注入） |

### 页面占位符 (page.html)

| 占位符            | 说明           |
| ----------------- | -------------- |
| `{{lang}}`        | 语言代码       |
| `{{title}}`       | 页面标题       |
| `{{pageTitle}}`   | 页面标题（h1） |
| `{{siteTitle}}`   | 站点标题       |
| `{{description}}` | 页面描述       |
| `{{favicon}}`     | 网站图标       |
| `{{bodyClass}}`   | body class     |
| `{{layoutClass}}` | 布局 class     |
| `{{sidebar}}`     | 侧边栏 HTML    |
| `{{content}}`     | 页面内容       |

### 目录页占位符 (index-page.html)

| 占位符                  | 说明                                       |
| ----------------------- | ------------------------------------------ |
| `{{INDEX_PAGE_STYLES}}` | 目录页额外样式                             |
| `{{lang}}`              | 语言代码                                   |
| `{{siteTitle}}`         | 站点标题                                   |
| `{{description}}`       | 页面描述                                   |
| `{{favicon}}`           | 网站图标（sync 默认落地为 `/favicon.ico`） |
| `{{navItems}}`          | 导航列表 HTML                              |

### 404 页占位符 (404.html)

| 占位符                  | 说明                                       |
| ----------------------- | ------------------------------------------ |
| `{{ERROR_PAGE_STYLES}}` | 404 页额外样式                             |
| `{{lang}}`              | 语言代码                                   |
| `{{siteTitle}}`         | 站点标题                                   |
| `{{description}}`       | 页面描述                                   |
| `{{favicon}}`           | 网站图标（sync 默认落地为 `/favicon.ico`） |

## 技术栈

| 依赖        | 版本  | 说明                  |
| ----------- | ----- | --------------------- |
| vite        | ^7.3  | 构建工具              |
| react       | ^19.2 | UI 框架（仅开发预览） |
| typescript  | ^5.9  | 类型支持              |
| tailwindcss | ^4.1  | 样式框架              |

## 设计系统

遵循 Notion + Arc 设计规范：

- **色彩**：Light/Dark 双主题，CSS 变量控制
- **字体**：系统字体栈
- **间距**：4px 网格系统
- **圆角**：Arc 风格柔和圆润
- **动效**：微妙自然过渡

## PC 端使用位置

生成的模板在 PC 端的使用：

| 模板                  | 使用文件              | 用途               |
| --------------------- | --------------------- | ------------------ |
| `PAGE_TEMPLATE`       | `renderer/index.ts`   | 渲染 Markdown 页面 |
| `SIDEBAR_TEMPLATE`    | `renderer/sidebar.ts` | 渲染侧边栏         |
| `INDEX_PAGE_TEMPLATE` | `builder/pages.ts`    | 生成目录页         |
| `ERROR_404_TEMPLATE`  | `builder/pages.ts`    | 生成 404 页面      |
| `STYLES`              | 所有模板              | 核心 CSS           |
| `THEME_*_SCRIPT`      | 所有模板              | 主题切换           |

## 注意事项

1. **生成文件禁止手动编辑**：`template/*.ts` 都有 `AUTO-GENERATED` 注释
2. **样式修改需要 build**：修改 `src/styles/` 后必须先 `pnpm build`
3. **模板修改建议先 build 再 sync**：`build` 会执行模板契约校验，随后 `pnpm sync`
4. **主题脚本与片段注入在 sync.ts**：如需修改主题逻辑或模板片段替换，编辑 `scripts/sync.ts`
