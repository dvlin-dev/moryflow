# Components

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Mobile 端 UI 组件库，提供可复用的界面组件。

## 职责

- 通用 UI 组件（按钮、输入框、对话框等）
- 业务组件（聊天、编辑器、知识库等）
- 认证相关表单组件

## 约束

- 使用 **uniwind**（非 nativewind）作为样式系统
- 禁止使用 `StyleSheet.create`
- 所有颜色必须支持 light/dark 模式，使用 `useThemeColors()` 获取主题色
- 第三方组件（如 `GlassView`、`BlurView`）必须使用 `style` 属性，不支持 `className`

## 成员清单

| 文件/目录      | 类型 | 说明                                     |
| -------------- | ---- | ---------------------------------------- |
| `ui/`          | 目录 | 通用 UI 组件（Button、Input、Dialog 等） |
| `chat/`        | 目录 | 聊天相关组件                             |
| `editor/`      | 目录 | 编辑器组件                               |
| `vault/`       | 目录 | 知识库组件                               |
| `ai-elements/` | 目录 | AI 相关 UI 元素                          |
| `membership/`  | 目录 | 会员相关组件                             |
| `navigation/`  | 目录 | 导航组件                                 |
| `settings/`    | 目录 | 设置相关组件（LanguageSelector 等）      |
| `auth/`        | 目录 | 认证相关组件（登录、注册、验证等）       |
| `user/`        | 目录 | 用户相关组件（头像等）                   |
| `cloud-sync/`  | 目录 | 云同步相关组件                           |

## 样式规范

**正确示例**：

```tsx
// ✅ 原生组件使用 className + style（颜色）
const colors = useThemeColors()
<View className="flex-1 justify-center" style={{ backgroundColor: colors.background }}>
  <Text style={{ color: colors.textPrimary }}>内容</Text>
</View>

// ✅ 第三方组件使用 style
<GlassView style={{ width: 48, height: 48, borderRadius: 24 }}>
  {children}
</GlassView>
```

**错误示例**：

```tsx
// ❌ 第三方组件使用 className（不生效）
<GlassView className="w-12 h-12 rounded-full">

// ❌ 硬编码颜色（不支持暗黑模式）
<View className="bg-white">
```

## 常见修改场景

| 场景          | 涉及文件    | 注意事项                 |
| ------------- | ----------- | ------------------------ |
| 新增通用组件  | `ui/`       | 遵循 uniwind 样式规范    |
| 修改聊天界面  | `chat/`     | 注意与 lib/chat 的配合   |
| 修改编辑器    | `editor/`   | 注意与 lib/editor 的配合 |
| 修改知识库 UI | `vault/`    | 注意与 lib/vault 的配合  |
| 修改认证表单  | `auth/`     | 使用 react-hook-form     |
| 修改设置相关  | `settings/` | 注意语言选择等设置组件   |
| 修改用户相关  | `user/`     | 用户头像等组件           |

## 近期变更

- Mobile 图标库切换为 Hugeicons，新增 `ui/icons.ts` 统一出口与 `ui/icon.tsx` 封装
- iOS 原生 ContextMenu 组件使用显式类型定义，避免 `any` 与类型漂移
- `LiquidGlassTabBar` 以 Tabs 状态为唯一数据源渲染/导航，「快速创建草稿」为独立动作按钮
- `EditorWebView` 注入主题相关样式，确保内容 placeholder 在暗黑模式下可见
- `MessageBubble` 补齐动画 useEffect 依赖，消除 hooks lint 警告
- Auth 表单统一改为 RHF + zod/v3，并新增 `ui/form.tsx`

## 依赖关系

```
components/
├── 依赖 → lib/hooks（自定义 Hooks）
├── 依赖 → lib/stores（状态管理）
├── 样式 → uniwind + useThemeColors()
└── 被依赖 ← app/（页面组件）
```
