# Mobile 设计系统

## 需求

基于 AI Chat 页面的视觉风格，建立统一的设计系统：
- 统一明暗模式适配
- 复用 Notion/Arc 风格
- 将 style 写法迁移到 className

## 技术方案

### 设计原则

- **黑白灰为主**：彩色仅用于状态和强调
- **圆润边角**：禁止生硬直角
- **留白即设计**：避免拥挤
- **阴影微妙克制**：不使用重阴影
- **动效自然**：300ms 左右的流畅过渡

### 颜色 Token 扩展

```css
/* global.css */
@variant light {
  --color-page-background: #f8f8f8;
  --color-surface-primary: #ffffff;
  --color-surface-secondary: #f5f5f5;
  --color-surface-hover: rgba(0, 0, 0, 0.03);
  --color-glass-background: rgba(255, 255, 255, 0.8);
}

@variant dark {
  --color-page-background: rgb(10, 10, 12);  /* 深邃黑 */
  --color-surface-primary: #1c1c1e;
  --color-surface-secondary: #2c2c2e;
  --color-surface-hover: rgba(255, 255, 255, 0.05);
  --color-glass-background: rgba(28, 28, 30, 0.8);
}
```

### 圆角规范

| 场景 | className |
|------|-----------|
| 标签、徽章 | `rounded` |
| 按钮、输入框 | `rounded-lg` |
| 卡片 | `rounded-xl` |
| 大卡片、模态框 | `rounded-2xl` |
| Sheet | `rounded-[20px]` |
| 消息气泡 | `rounded-3xl` |

### 迁移规则

```tsx
// Before
<View style={{ flex: 1, backgroundColor: colors.background }}>
// After
<View className="flex-1 bg-page-background">

// Before
<View style={{ paddingHorizontal: 16 }}>
// After
<View className="px-4">

// Before (三元判断主题)
<View className={isDark ? 'bg-black' : 'bg-white'}>
// After (使用 dark: 变体)
<View className="bg-white dark:bg-black">
```

### 保留 style 的情况

1. 动态值（insets、keyboardHeight）
2. Animated.View 动画样式
3. 第三方组件（GlassView、BlurView）
4. 精确像素值

### 图标颜色

图标必须使用 `useThemeColors()`：

```tsx
const colors = useThemeColors()
<SettingsIcon size={20} color={colors.icon} />
```

## 代码索引

| 模块 | 路径 |
|------|------|
| CSS Token | `apps/mobile/global.css` |
| TS Token | `apps/mobile/lib/tokens/base.ts` |
| 主题 Hook | `apps/mobile/lib/theme.ts` |
| 设置组件 | `apps/mobile/components/settings/` |
| 首页 | `apps/mobile/app/(tabs)/index.tsx` |
| 设置页 | `apps/mobile/app/(settings)/` |
