# nativewind v5 style + className 冲突 Bug

## 问题描述

设置页面（Modal 呈现）在暗黑模式下，文字/图标颜色不正确。

## 根本原因

### nativewind v5 已知 Bug（Issue #233）

**问题**：在 nativewind v5 中，当组件同时设置 `style` 和 `className` 时，`className` 会被**完全忽略**。

**Issue 链接**：https://github.com/nativewind/react-native-css/issues/233

**当前项目版本**：
- `nativewind: 5.0.0-preview.2`
- `react-native-css: ^3.0.1`

**修复状态**：标签显示 "ready for release" - 修复已在 nightly 版本中，但尚未发布到 npm

### 为什么设置页面受影响

1. Modal 是独立的原生视图层，`.dark:root` CSS 选择器不生效
2. 尝试用 `vars()` 注入 CSS 变量：`<View style={[{ flex: 1 }, themeVars[colorScheme]]}>`
3. 由于 style + className 冲突 bug，子组件的 className 颜色类（如 `text-foreground`）失效

## 解决方案

### 方案 A：升级 nativewind 到 nightly 版本（推荐）

```bash
pnpm add nativewind@nightly react-native-css@nightly
```

升级后，现有的 `vars()` 注入方案应该可以正常工作。

### 方案 B：完全使用 style 属性

在设置页面中，所有颜色相关的样式改用 `style` 属性 + `useThemeColors()`。

注意：由于 bug 是 "同一组件上 style 和 className 不能共存"，需要完全避免混用。

## 相关文件

- `app/(settings)/_layout.tsx`
- `app/(settings)/index.tsx`
- `app/(settings)/appearance.tsx`
- `lib/theme-vars.ts`

## 状态

⏸️ 暂不处理，等待 nativewind 发布修复版本

## 更新日志

- 2025-12-15：发现问题根因，记录 bug
