# UI 组件迁移 Code Review 文档

## 概述

本次迁移包含两个主要任务：
1. **UI 组件抽离**：将 `apps/pc` 中的纯 UI 组件迁移到 `packages/ui`，形成可复用的 `@moryflow/ui` 包
2. **Tailwind v4 升级**：将 `apps/pc` 从 Tailwind CSS v3.4.17 升级到 v4.1.18

### 代码规范要求

> **核心原则**：不搞兼容，无用代码直接删除，保证最佳实践

| 原则 | 要求 |
|------|------|
| **禁止兼容** | 不保留向后兼容代码、不留废弃注释、不用 `_unused` 变量 |
| **最佳实践** | 遵循 SOLID 原则、TypeScript 严格模式、ESLint 规范 |
| **模块化** | 组件职责单一、依赖清晰、可独立测试 |
| **单一职责** | 每个组件/函数只做一件事，UI 组件不含业务逻辑 |

### 变更统计

| 类型 | 数量 |
|------|------|
| 总变更文件 | 348 个 |
| 新增文件 (packages/ui) | 161 个 |
| 修改文件 (apps/pc) | 184 个 |
| 代码行 | +2539 / -1413 |

### 查看变更

```bash
# 查看本次变更的所有文件
git diff --name-only --staged

# 查看具体变更内容
git diff --staged

# 按目录分类查看
git diff --staged --name-only | grep "^packages/ui"
git diff --staged --name-only | grep "^apps/pc"
```

---

## 一、Review 检查清单

### 1.1 最佳实践检查

#### 禁止兼容代码
- [ ] 没有向后兼容的 shim 或 polyfill
- [ ] 没有 `// deprecated`、`// removed`、`// TODO: remove` 等注释
- [ ] 没有 `_unused`、`_legacy` 等废弃变量
- [ ] 没有注释掉的代码块

#### 单一职责原则 (SRP)
- [ ] `packages/ui` 中的组件只包含纯 UI 逻辑，不含业务逻辑
- [ ] 每个组件文件只导出一个主要组件
- [ ] 工具函数职责单一（`cn`、`tiptap-utils` 等）

#### 模块化检查
- [ ] `packages/ui` 可独立构建，不依赖 `apps/pc`
- [ ] 导出结构清晰：`components/`、`icons/`、`animate/`、`hooks/`、`lib/`
- [ ] 无循环依赖

#### 无用代码检查
- [ ] 无未使用的导入语句
- [ ] 无空文件或仅包含注释的文件
- [ ] 无冗余的类型定义

### 1.2 验证命令

```bash
# 1. 安装依赖
pnpm install

# 2. 类型检查
pnpm -C packages/ui typecheck
pnpm -C apps/pc typecheck

# 3. 启动应用验证
pnpm -C apps/pc dev

# 4. 检查遗漏的旧导入路径
grep -r "@/components/ui/" apps/pc/src/renderer --include="*.tsx" --include="*.ts" | grep -v sidebar
grep -r "@pc/components/tiptap-icons/" apps/pc/src/renderer --include="*.tsx" --include="*.ts"
grep -r "@/components/animate-ui/" apps/pc/src/renderer --include="*.tsx" --include="*.ts"

# 5. 检查 packages/ui 是否有对 apps/pc 的依赖（应该没有）
grep -r "@pc/" packages/ui/src --include="*.tsx" --include="*.ts"
grep -r "apps/pc" packages/ui/src --include="*.tsx" --include="*.ts"
```

---

## 二、UI 组件迁移详情

### 2.1 迁移范围

**已迁移到 `packages/ui/src/`**：

| 目录 | 内容 | 数量 |
|------|------|------|
| `components/` | Radix UI 封装组件 | 53 个 |
| `icons/` | TipTap 编辑器图标 | 97 个 |
| `animate/` | Motion 动画组件 | 若干 |
| `hooks/` | 通用 Hooks | 1 个 |
| `lib/` | 工具函数 | 3 个 |

**保留在 `apps/pc/`（业务耦合）**：
- `tiptap-ui-primitive/` - 依赖 PC 端 hooks
- `tiptap-ui-utils/` - 依赖编辑器特定功能
- `ui/sidebar/` - PC 端专用侧边栏

### 2.2 导入路径变更规则

```typescript
// UI 组件
- import { Button } from '@/components/ui/button'
+ import { Button } from '@moryflow/ui/components/button'

// 图标
- import { SunIcon } from '@pc/components/tiptap-icons/sun-icon'
+ import { SunIcon } from '@moryflow/ui/icons/sun-icon'

// 动画组件
- import { Files } from '@/components/animate-ui/primitives/base/files'
+ import { Files } from '@moryflow/ui/animate/primitives/base/files'

// 工具函数
- import { cn } from '@/lib/utils'
+ import { cn } from '@moryflow/ui/lib/utils'
```

### 2.3 重点文件 Review

#### packages/ui/package.json
```bash
git diff --staged packages/ui/package.json
```
- [ ] `peerDependencies` 是否只包含 react、react-dom
- [ ] `dependencies` 是否包含所有必需的 Radix UI 包
- [ ] 不应包含 `next-themes`（已移除）

#### packages/ui/src/components/sonner.tsx
**重要变更**：移除了 `next-themes` 依赖，改为 props 传入 theme

```typescript
// 之前（依赖 next-themes）
const { theme = "system" } = useTheme()

// 之后（通过 props 传入）
const Toaster = ({ theme = "system", ...props }: ToasterProps) => { ... }
```

- [ ] 检查调用方是否正确传入 theme prop

#### packages/ui/src/lib/utils.ts
- [ ] `cn` 函数是否正确导出
- [ ] 是否有多余的工具函数

---

## 三、Tailwind v4 升级详情

### 3.1 核心变更对比

| 变更项 | v3 | v4 |
|--------|----|----|
| CSS 入口 | `@tailwind base/components/utilities` | `@import 'tailwindcss'` |
| 配置方式 | `tailwind.config.ts` (JS) | `@theme` 块 (CSS) |
| PostCSS 插件 | `tailwindcss` | `@tailwindcss/postcss` |
| 内容扫描 | `content: [...]` | `@source '...'` |
| 暗色模式 | `darkMode: ['class']` | `@custom-variant dark` |

### 3.2 关键配置文件

#### apps/pc/postcss.config.cjs
```javascript
// 只应包含这一个插件
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  }
}
```
- [ ] 确认只有 `@tailwindcss/postcss` 插件
- [ ] 确认没有 `autoprefixer`（v4 内置）

#### apps/pc/src/renderer/global.css
```bash
git diff --staged apps/pc/src/renderer/global.css
```
- [ ] 检查 `@import 'tailwindcss'` 是否在顶部
- [ ] 检查 `@source` 是否包含 `../../packages/ui/src/**/*.{ts,tsx}`
- [ ] 检查 `@theme` 块中的 CSS 变量定义
- [ ] 确认没有重复的 `@custom-variant dark` 声明

#### apps/pc/tailwind.config.ts
- [ ] **确认已删除**：配置已完全迁移到 CSS

### 3.3 自动重命名的工具类

升级工具自动处理了以下重命名：
- `shadow-sm` → `shadow-xs`
- `rounded-sm` → `rounded-xs`
- `outline-none` → `outline-hidden`
- `ring` → `ring-3`
- `blur` → `blur-xs`

---

## 四、配置文件变更

### 4.1 apps/pc/electron.vite.config.ts

**新增 dedupe 配置**（解决 React 多实例问题）：
```typescript
resolve: {
  alias: { ... },
  dedupe: ['react', 'react-dom']  // 新增
}
```
- [ ] 确认 dedupe 配置存在
- [ ] 确认 alias 配置完整

### 4.2 apps/pc/tsconfig.json

**新增路径别名**：
```json
{
  "compilerOptions": {
    "paths": {
      "@moryflow/ui/*": ["../../packages/ui/src/*"]
    }
  }
}
```
- [ ] 确认路径映射正确

### 4.3 apps/pc/package.json

**依赖变更**：
```diff
+ "@moryflow/ui": "workspace:*"
+ "@tailwindcss/postcss": "^4.1.18"
- "autoprefixer": "^10.x.x"
- "tailwindcss": "^3.4.17"
+ "tailwindcss": "^4.1.18"
```
- [ ] 确认 workspace 依赖正确
- [ ] 确认 Tailwind 版本为 4.x

---

## 五、运行时验证

### 5.1 功能验证

启动应用后检查：
- [ ] 应用正常启动，无控制台错误
- [ ] UI 组件样式正确渲染
- [ ] 暗色模式切换正常
- [ ] Toast 通知正常显示
- [ ] 编辑器图标正常显示
- [ ] 动画效果正常

### 5.2 常见问题排查

| 问题 | 可能原因 | 检查方法 |
|------|----------|----------|
| React hooks 报错 | React 多实例 | 检查 dedupe 配置 |
| 样式不生效 | `@source` 路径缺失 | 检查 global.css |
| 组件找不到 | 导入路径未替换 | 运行 grep 检查 |
| 类型错误 | 路径别名未配置 | 检查 tsconfig.json |

---

## 六、已知问题与决策

### 6.1 保留在 PC 端的组件

`ui/sidebar/` 目录保留在 PC 端，原因：
- 依赖 PC 特定的 hooks（useSidebar）
- 依赖 PC 端上下文（SidebarProvider）
- 与 PC 端布局深度耦合

### 6.2 sonner.tsx API 变更

移除 `next-themes` 依赖是**破坏性变更**：
- 之前：自动获取 theme
- 之后：需要调用方显式传入 theme

调用方需要更新：
```typescript
// 确保传入正确的 theme
<Toaster theme={currentTheme} />
```

### 6.3 修复的类型错误

升级过程中修复的问题：

| 文件 | 问题 | 修复 |
|------|------|------|
| `pagination.tsx` | `outline-solid` 不存在 | 改为 `outline` |
| `subscription-dialog.tsx` | `outline-solid` 不存在 | 改为 `outline` |
| `credit-packs-dialog.tsx` | `outline-solid` 不存在 | 改为 `outline` |
| `toolbar.tsx` | `blur-sm` 事件名错误 | 改为 `blur` |
| `floating-element.tsx` | `blur-sm` 事件名错误 | 改为 `blur` |

**注**：`blur-sm` 是 Tailwind v4 升级工具的误操作，将 DOM 事件名 `blur` 错误地重命名了。

### 6.4 @types/react 版本统一

在根 `package.json` 添加 pnpm overrides 强制统一 React 类型版本：

```json
{
  "pnpm": {
    "overrides": {
      "@types/react": "19.1.17",
      "@types/react-dom": "19.1.9"
    }
  }
}
```

---

## 七、回滚方案

如果发现严重问题需要回滚：

```bash
# 如果已提交
git reset --hard HEAD~1

# 如果未提交
git checkout .

# 重新安装依赖
pnpm install
```

---

## 八、后续优化建议

1. **拆分 packages/ui**：考虑将 icons 拆为独立包以减小体积
2. **添加 Storybook**：为 packages/ui 添加组件文档
3. **统一主题管理**：考虑在 packages/ui 中提供 ThemeProvider
