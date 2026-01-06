# Settings iOS 原生风格

## 需求

将 Mobile 设置页面改造为 iOS 原生风格：
- 使用液态玻璃效果
- 遵循 iOS HIG 设计规范
- 模块化、单一职责

## 技术方案

### 目录结构

```
components/settings/
├── index.ts
├── const.ts           # 类型定义 + 样式常量
└── components/
    ├── settings-group.tsx     # 分组容器
    ├── settings-row.tsx       # 设置项行
    ├── settings-separator.tsx # 分隔线
    └── section-header.tsx     # 分区标题
```

### 核心样式常量

```typescript
const SETTINGS_STYLES = {
  rowPaddingHorizontal: 16,
  rowPaddingVertical: 12,
  iconSize: 28,
  cardBorderRadius: 10,  // iOS 标准
  separatorHeight: 0.5,
  separatorIndent: 52,   // 与文字对齐
}

const SETTINGS_COLORS = {
  cardBackground: { light: '#fff', dark: 'rgb(28,28,30)' },
  pageBackground: { light: 'rgb(242,242,247)', dark: '#000' },
  separator: { light: 'rgba(60,60,67,0.12)', dark: 'rgba(84,84,88,0.65)' },
}
```

### 组件设计

**SettingsRow**：
- 左侧图标：28x28 圆角方块
- 中间：标题 + 可选副标题
- 右侧：自定义内容或箭头
- variant='destructive' 时使用 error 色

**SettingsGroup**：
- 可选分区标题（大写灰色小字）
- 圆角白色/深灰卡片

**SettingsSeparator**：
- 0.5px 高度，默认左侧缩进 52px

### 玻璃效果

```typescript
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
// iOS 26+ 支持，降级到 BlurView 或普通 View
```

## 代码索引

| 模块 | 路径 |
|------|------|
| 设置组件 | `apps/mobile/components/settings/` |
| 设置主页 | `apps/mobile/app/(settings)/index.tsx` |
| 外观设置 | `apps/mobile/app/(settings)/appearance.tsx` |
| 云同步设置 | `apps/mobile/app/(settings)/cloud-sync.tsx` |
| 玻璃效果文档 | `apps/mobile/docs/glass.md` |
