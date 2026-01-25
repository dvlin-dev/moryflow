# Mobile App

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Moryflow 移动端应用，基于 Expo + React Native 构建。

## 职责

- 提供移动端用户界面
- 本地笔记编辑与管理
- AI 对话交互
- 云同步客户端

## 约束

- 使用 **uniwind**（非 nativewind）作为样式系统，禁止使用 `StyleSheet.create`
- 所有颜色必须支持 light/dark 模式，使用 `useThemeColors()` 获取主题色
- 第三方组件（如 `GlassView`、`BlurView`）必须使用 `style` 属性，不支持 `className`
- 状态管理使用 Zustand
- 聊天消息扩展字段统一使用 `metadata.chat`

## 技术栈

| 技术         | 用途      |
| ------------ | --------- |
| Expo         | 开发框架  |
| React Native | 跨平台 UI |
| Expo Router  | 页面路由  |
| uniwind      | 样式系统  |
| Zustand      | 状态管理  |

## 成员清单

| 文件/目录            | 类型 | 说明                                         |
| -------------------- | ---- | -------------------------------------------- |
| `app/`               | 目录 | 页面路由（Expo Router）                      |
| `app/(auth)/`        | 目录 | 认证相关页面（登录、注册、邮箱验证）         |
| `app/(editor)/`      | 目录 | 编辑器页面                                   |
| `app/(settings)/`    | 目录 | 设置页面                                     |
| `app/(tabs)/`        | 目录 | Tab 页面组（主页、搜索；含快速创建草稿动作） |
| `components/`        | 目录 | UI 组件                                      |
| `components/ui/`     | 目录 | 通用 UI 组件（Button、Input 等）             |
| `components/chat/`   | 目录 | 聊天相关组件                                 |
| `components/editor/` | 目录 | 编辑器组件                                   |
| `components/vault/`  | 目录 | 知识库组件                                   |
| `lib/`               | 目录 | 业务逻辑与工具                               |
| `lib/agent-runtime/` | 目录 | Agent 运行时                                 |
| `lib/chat/`          | 目录 | 聊天逻辑                                     |
| `lib/hooks/`         | 目录 | 自定义 Hooks                                 |
| `lib/stores/`        | 目录 | Zustand 状态管理                             |
| `lib/vault/`         | 目录 | 知识库逻辑                                   |
| `lib/membership/`    | 目录 | 会员与订阅逻辑                               |

## 常见修改场景

| 场景         | 涉及文件                          | 注意事项                        |
| ------------ | --------------------------------- | ------------------------------- |
| 新增页面     | `app/`                            | 遵循 Expo Router 文件路由规范   |
| 修改 UI 组件 | `components/`                     | 使用 uniwind + useThemeColors() |
| 新增业务逻辑 | `lib/`                            | 纯函数优先，复用现有 hooks      |
| 修改聊天功能 | `lib/chat/`, `components/chat/`   | 注意与 Agent 运行时的交互       |
| 修改知识库   | `lib/vault/`, `components/vault/` | 注意文件系统权限                |

## 近期变更

- Agent Runtime 增加用户级 JSONC 配置、Agent Markdown 与 Hook（Mobile 读取 Paths.document/.moryflow）
- Chat 会话模式切换补齐审计与会话 mode 归一化
- AI 工具输出新增统一截断与完整输出弹层（Mobile）
- 云同步 UI 精简（状态卡 + 主开关 + Advanced），同步入口统一到 Workspace Sheet
- 图标库统一为 Hugeicons（Mobile 端唯一出口在 `components/ui/icons.ts`）
- Agent Runtime 切换为 `@openai/agents-core`，新增 RN shim 与 streams polyfill
- RN shim 移除 `any` 类型，遵循移动端 lint 规则
- Polyfills 改为同步加载，补齐 streams 兜底
- 会员常量导出收敛，移除未使用的等级比较/优先级常量
- 动态路由跳转统一使用对象形式 `{ pathname, params }`，避免 `any` 断言
- Tab 导航改为真实 Tabs；「快速创建草稿」为动作按钮，不再是路由页重定向
- 编辑器标题在暗黑模式下的颜色适配统一由 `TitleInput` 处理
- 日志输出统一走 `createLogger()`，减少直接 `console.*` 调用
- ESLint 补充 React 版本检测配置，移除 lint 警告提示
- ChatInputBar 移除附件占位回调，避免空实现代码
- Auth 交互改为 access 内存 + refresh 安全存储，移除 pre-register 与忘记密码入口
- Auth：接入 `@better-auth/expo`，移动端 Cookie/Session 由 SecureStore 管理
- Auth Session refresh 增加网络失败清理，避免初始化阶段因网络异常中断
- Auth Session 单元测试补齐（vitest）

## 依赖关系

```
apps/mobile/
├── 依赖 → packages/api（API 客户端）
├── 依赖 → packages/i18n（国际化）
├── 依赖 → packages/types（共享类型）
└── 依赖 → packages/agents-* + @openai/agents-core（Agent 框架）
```

## 样式规范

> 详细设计系统：→ `docs/products/moryflow/features/mobile-design-system/proposal.md`

### 核心原则

1. **优先使用 className**：布局、间距、圆角、颜色都使用 uniwind className
2. **颜色使用语义化 Token**：`bg-page-background`、`text-foreground`、`text-muted-foreground`
3. **只在必要时使用 style**：动态值、Animated、第三方组件

### 正确示例

```tsx
// ✅ 完全使用 className（推荐）
<View className="flex-1 bg-page-background">
  <Text className="text-foreground text-base font-medium">标题</Text>
  <Text className="text-muted-foreground text-sm">描述</Text>
</View>

// ✅ 卡片/容器
<View className="bg-surface-primary rounded-md border border-border/50 p-4">
  {children}
</View>

// ✅ 交互状态
<Pressable className="px-4 py-3 active:bg-surface-pressed">

// ✅ 动态值必须使用 style
<View style={{ paddingTop: insets.top }}>
<Animated.View style={animatedStyle}>

// ✅ 第三方组件使用 style（不支持 className）
<GlassView style={{ width: 48, height: 48, borderRadius: 24 }}>
<BlurView intensity={50} style={{ overflow: 'hidden' }}>
```

### 错误示例

```tsx
// ❌ 使用 style 写布局（应使用 className）
<View style={{ flex: 1, paddingHorizontal: 16 }}>

// ❌ 使用 useThemeColors() 获取颜色（应使用 className）
<View style={{ backgroundColor: colors.background }}>
<Text style={{ color: colors.textPrimary }}>

// ❌ 硬编码颜色（不支持暗黑模式）
<View className="bg-white">
<Text style={{ color: '#007AFF' }}>

// ❌ 第三方组件使用 className（不生效）
<GlassView className="w-12 h-12 rounded-full">
```

### 颜色 Token 速查

| 用途     | className                             |
| -------- | ------------------------------------- |
| 页面背景 | `bg-page-background`                  |
| 卡片背景 | `bg-surface-primary`                  |
| 次级容器 | `bg-surface-secondary`                |
| 浮层     | `bg-surface-elevated`                 |
| 主要文字 | `text-foreground`                     |
| 次级文字 | `text-muted-foreground`               |
| 边框     | `border-border`                       |
| 点击态   | `active:bg-surface-pressed`           |
| 危险操作 | `text-destructive` / `bg-destructive` |
| 信息     | `text-info` / `bg-info`               |
| 警告     | `text-warning` / `bg-warning`         |

### 图标颜色

图标必须使用 `useThemeColors()`：

```tsx
const colors = useThemeColors()
<SettingsIcon color={colors.icon} />
<AlertIcon color={colors.destructive} />
```
