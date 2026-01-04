# v0 iOS App 优化参考方案

> 参考 [How we built the v0 iOS app](https://vercel.com/blog/how-we-built-the-v0-ios-app)，结合当前项目 `apps/mobile` 的实际情况，提出的优化建议。

## 当前项目技术栈

| 类别 | 当前使用 |
|------|----------|
| 框架 | React Native 0.81.5 + Expo SDK 54 |
| 动画 | `react-native-reanimated` 4.1.3 |
| 玻璃效果 | `expo-glass-effect` 0.1.4 + `expo-blur` |
| 原生菜单 | `zeego` 3.0.6 + `@expo/ui` |
| 底部弹窗 | `@gorhom/bottom-sheet` |
| 键盘处理 | 内置 `KeyboardAvoidingView` |
| 列表 | 原生 `ScrollView` |

---

## 优化建议

### 1. 🔥 键盘处理升级 (高优先级) ✅ 已完成

**问题**: 当前使用 `KeyboardAvoidingView`，体验不够原生流畅。

**Expo 官方最佳实践**: 使用 `useKeyboardHandler` + 动画占位 View。

**优化点**:
- [x] 安装 `react-native-keyboard-controller` (v1.20.1)
- [x] 在根 layout 中添加 `KeyboardProvider`
- [x] 使用 `useKeyboardHandler` 监听键盘高度变化
- [x] 使用 `Animated.View` 作为键盘占位，高度随键盘动画
- [x] ScrollView 添加 `keyboardDismissMode="interactive"` 支持交互式关闭

**实施说明**:
- 采用 **Expo 官方推荐方案**（参考: https://docs.expo.dev/guides/keyboard-handling/）
- 使用 `useKeyboardHandler` + `useSharedValue` 监听键盘高度
- 在输入框后面放置一个 `Animated.View`，其高度等于键盘高度
- 当键盘弹起时，动画 View 的高度增加，自然把输入框"推"到键盘上方
- 键盘关闭时，动画 View 高度减为 0，输入框回到底部
- 在 `app/_layout.tsx` 中添加了 `KeyboardProvider`
- **修复键盘动画问题**（2025-12-13）：
  - 监听完整的键盘生命周期：`onStart`、`onMove`、`onInteractive`（交互式拖动）、`onEnd`
  - 使用 `Math.max(event.height, 0)` 确保高度非负
  - 输入框容器使用绝对定位（`position: absolute, bottom: 0`），确保键盘收起时能正确下降
  - **关键修复**：将底部边距从 ChatInputBar 内部移到外部容器统一管理
    - ChatInputBar 添加 `disableBottomPadding` prop
    - 底部边距作为独立 View 放在输入框和键盘占位之间
    - 容器结构：`ChatInputBar` → `底部安全区域 View` → `键盘占位 Animated.View`

**代码参考**:
```tsx
// 之前实现
<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

// 当前实现 (Expo 官方最佳实践 + 修复版)
import { useKeyboardHandler } from 'react-native-keyboard-controller'
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'

// 监听键盘高度
const keyboardHeight = useSharedValue(0)

// 监听完整的键盘生命周期（包括交互式拖动）
useKeyboardHandler(
  {
    onStart: (event) => {
      'worklet'
      keyboardHeight.value = Math.max(event.height, 0)
    },
    onMove: (event) => {
      'worklet'
      keyboardHeight.value = Math.max(event.height, 0)
    },
    onInteractive: (event) => {
      'worklet'
      keyboardHeight.value = Math.max(event.height, 0)
    },
    onEnd: (event) => {
      'worklet'
      keyboardHeight.value = Math.max(event.height, 0)
    },
  },
  []
)

// 动画样式
const keyboardSpacerStyle = useAnimatedStyle(() => {
  return {
    height: keyboardHeight.value,  // 直接使用，已确保非负
  }
}, [])

// JSX
<View style={{ flex: 1 }}>
  <ScrollView>
    {/* 消息列表 */}
  </ScrollView>

  {/* 输入框容器：绝对定位在底部 */}
  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
    {/* 输入框（禁用内部底部边距） */}
    <ChatInputBar disableBottomPadding={true} />

    {/* 底部安全区域占位 */}
    <View style={{ height: bottomPadding }} />

    {/* 键盘占位：高度等于键盘高度，把整个容器推上去 */}
    <Animated.View style={keyboardSpacerStyle} />
  </View>
</View>
```

**为什么不用 KeyboardStickyView？**
- `KeyboardStickyView` 适用于 **sticky footer** 场景（固定在屏幕底部的元素）
- 聊天界面需要的是**输入框随键盘移动**，而不是固定在键盘上方
- 使用动画占位 View 是更灵活、更符合 React Native 设计模式的方案

---

### 2. 🏗️ 可组合的 Chat 架构 (高优先级) ✅ 已完成

**问题**: 当前 `ChatScreen` 是单一大组件，难以维护和扩展。

**v0 方案**: 使用多 Context Provider 和可插拔 hooks 的组合模式。

**优化点**:
- [x] 创建 `ChatProvider` 组合多个上下文：
  ```tsx
  <ChatProvider>
    <KeyboardStateProvider>
      <ComposerHeightProvider>
        <MessageListProvider>
          {children}
        </MessageListProvider>
      </ComposerHeightProvider>
    </KeyboardStateProvider>
  </ChatProvider>
  ```
- [x] 将消息列表逻辑抽取为独立 hooks：
  - `useAutoScroll` - 自动滚动（监听消息变化和内容变化）
  - `useScrollOnComposerChange` - Composer 高度变化时滚动
  - `useKeyboardState` - 键盘状态管理
  - `useComposerHeight` - 输入框高度管理
  - `useMessageList` - 消息列表状态和滚动
- [x] 使用 Reanimated 的 `useSharedValue` 替代 `useState` 管理动画状态

**实施说明**:
- **目录结构**:
  ```
  components/chat/
  ├── contexts/
  │   ├── ChatProvider.tsx           # 组合所有 provider
  │   ├── KeyboardStateContext.tsx   # 键盘状态
  │   ├── ComposerHeightContext.tsx  # 输入框高度
  │   └── MessageListContext.tsx     # 消息列表
  ├── hooks/
  │   ├── useAutoScroll.ts           # 自动滚动
  │   └── useScrollOnComposerChange.ts # Composer 高度变化滚动
  └── ChatScreen.tsx                  # 重构后的主组件
  ```

- **Context 设计**:
  - `KeyboardStateContext` - 封装 `useKeyboardHandler`，提供 `keyboardHeight` SharedValue
  - `ComposerHeightContext` - 管理输入框高度，用于自动滚动和布局调整
  - `MessageListContext` - 管理 ScrollView ref、最后消息索引、自动滚动状态

- **Hooks 设计**:
  - `useAutoScroll` - 监听消息数量和内容变化，自动滚动到底部
  - `useScrollOnComposerChange` - 使用 `useAnimatedReaction` 监听输入框高度变化并滚动

- **组件重构**:
  - ChatScreen 分为 `ChatScreen`（带 Provider）和 `ChatScreenContent`（使用 Context）
  - 移除冗余的键盘处理代码，全部通过 Context 管理
  - 自动滚动逻辑通过独立 hooks 实现，代码更清晰

**优势**:
- ✅ 职责分离，每个 Context 管理一个关注点
- ✅ 易于测试，hooks 可以单独测试
- ✅ 易于扩展，新功能可以通过新的 Context/Hook 添加
- ✅ 性能优化，使用 SharedValue 避免不必要的重渲染
- ✅ 为后续优化（虚拟列表、消息动画）打下基础

---

### 3. 📜 高性能虚拟列表 (高优先级) 🚧 进行中

> **详细文档**: [legendlist-virtual-list-implementation.md](./legendlist-virtual-list-implementation.md)

**问题**: 当前使用 `ScrollView` 渲染所有消息，大量消息时性能下降。

**v0 方案**: 使用 `LegendList` 高性能虚拟列表。

**当前进展** (2024-12):
- [x] 安装 `@legendapp/list@^3.0.0-beta.9`
- [x] 创建 `ChatMessageList` 组件封装 LegendList
- [x] 创建 `ScrollToBottomButton` 滚动按钮组件
- [x] 实现 inverted 方案（scaleY: -1 + 数据反转）解决初始滚动问题
- [x] 首次进入显示最新消息 ✅
- [x] 无限滚动到黑屏问题 ✅
- [x] 思考中指示器（ListHeaderComponent）
- [x] Sheet 模式延迟加载历史消息（避免阻塞抽屉动画）
- [x] **发送后留白效果** ✅ (2024-12-14)
- [ ] 用户往上滑动后发送消息滚动到底部 ❌ (LegendList 已知问题，等待官方修复)
- [ ] 向上无限滑动问题 ❌ (待排查)

**发送后留白效果实现** (2024-12-14):

目标：用户发送消息后，用户消息显示在顶部（Header 下方），AI 占位消息占据剩余空间并显示"思考中..."。

实现方案：
1. **临时 AI 占位消息**：在 `ChatScreen` 中，当用户发送消息后（`isLoading && lastMessage.role === 'user'`），插入一条临时 AI 消息（id: `TEMP_AI_MESSAGE_ID`）
2. **动态 minHeight 计算**：在 `ChatMessageList` 中，使用 `useAnimatedReaction` 监听用户消息高度、输入框高度、键盘高度，计算 AI 消息的 `minHeight = 可视区域 - 用户消息高度 - margins`
3. **只对最新 AI 消息应用 minHeight**：通过 `MessageListContext` 中的 `lastAssistantMessageId` 判断，确保历史 AI 消息不受影响
4. **SharedValue 同步**：在 `MessageBubble` 中使用 `useSharedValue` + `useLayoutEffect` 同步 `needsMinHeight` 状态到 worklet，使用 `useAnimatedStyle` 返回动态 minHeight

核心代码结构：
```tsx
// MessageListContext - 新增状态
placeholderMinHeight: SharedValue<number>  // AI 占位消息最小高度
lastAssistantMessageId: string | null      // 最新 AI 消息 ID

// ChatScreen - 插入临时 AI 占位消息
const displayMessages = useMemo(() => {
  if (isLoading && lastMessage?.role === 'user') {
    return [...messages, { id: TEMP_AI_MESSAGE_ID, role: 'assistant', parts: [] }]
  }
  return messages
}, [messages, isLoading])

// ChatMessageList - 计算 minHeight
useAnimatedReaction(
  () => ({ userMsgHeight, composer, keyboard }),
  (current) => {
    const visibleArea = screenHeight - headerPadding - inputPadding
    const minHeight = visibleArea - current.userMsgHeight - 32
    runOnJS(setPlaceholderMinHeight)(Math.max(0, minHeight))
  }
)

// MessageBubble - 应用 minHeight（只对最新 AI 消息）
const needsMinHeight = message.id === lastAssistantMessageId
const needsMinHeightValue = useSharedValue(needsMinHeight)

useLayoutEffect(() => {
  needsMinHeightValue.value = needsMinHeight
}, [needsMinHeight])

const minHeightStyle = useAnimatedStyle(() => {
  if (!needsMinHeightValue.value) return { minHeight: 0 }
  return { minHeight: placeholderMinHeight.value }
})
```

**已知限制**:
- LegendList 的 `scrollToIndex` 在 `scaleY: -1` 模式下只能滚动一点点
- 这是 LegendList 的已知问题：[Issue #83](https://github.com/LegendApp/legend-list/issues/83)
- **临时方案**: 用户可点击滚动按钮手动回到底部
- **向上无限滑动问题**: 用户可以向上滑动超出第一条消息，即使设置了 `bounces={false}` 和 `overScrollMode="never"` 也无法解决，待后续排查

**⚠️ 已知风险/Hack**:

1. **SHEET_EXTRA_TOP = 80**: Sheet 模式下需要额外的顶部空间来确保用户消息不被 Header 遮挡。这个值是经验值，理论上应该通过测量 Sheet Header 的实际高度来动态计算。当前写死 80px 是一个 hack 方案，如果 Sheet Header 样式发生变化，可能需要调整此值。

**原计划方案** (因 LegendList bug 暂未采用):
- [ ] 使用 `AnimatedLegendList` + `alignItemsAtEnd` + `maintainScrollAtEnd`
- [ ] 实现 `contentInset` 动态调整

---

### 4. ✨ 消息动画优化 (中优先级) ✅ 已完成

**问题**: 当前消息无入场动画，缺乏视觉反馈。

**v0 方案**: 新消息淡入+滑动动画，使用 Reanimated 共享值。

**实施说明**:
- [x] 创建 `MessageAnimationContext` 管理消息动画状态：
  - `shouldAnimate(messageId)` - 检查消息是否需要动画
  - `markAnimated(messageId)` - 标记消息已完成动画
  - `markMessagesAsAnimated(messageIds[])` - 批量标记（用于历史消息）
  - `lastUserMessageAnimated` SharedValue - 用于助手消息等待
- [x] 用户消息入场动画（300ms）：
  - translateX: 30 → 0（从右向左滑入）
  - opacity: 0 → 1（淡入）
  - 使用 `Easing.out(Easing.cubic)` 缓动
- [x] 助手消息入场动画（350ms）：
  - opacity: 0 → 1（淡入）
  - 等待用户消息动画完成后开始
  - 流式加载指示器也有淡入效果
- [x] 历史消息跳过动画：
  - `useStoredMessages` 加载历史消息时调用 `markMessagesAsAnimated`
  - 历史消息直接显示，只有新发送的消息才有动画
- [x] 思考中指示器：
  - 用户发送消息后立即显示 "思考中..."（无需等待 AI 响应）
  - 使用 `ListHeaderComponent` 在 inverted 列表底部显示
- [x] 性能优化：
  - Sheet 模式延迟 100ms 加载历史消息，避免阻塞抽屉动画
  - `useStoredMessages` 返回 `isLoadingHistory` 状态
  - Context value 使用 `useMemo` 稳定化，避免不必要的重渲染

**代码参考**:
```tsx
// MessageAnimationContext 管理动画状态
const { shouldAnimate, markAnimated, lastUserMessageAnimated } = useMessageAnimation()

// 用户消息动画
const opacity = useSharedValue(shouldAnimate(message.id) ? 0 : 1)
const translateX = useSharedValue(shouldAnimate(message.id) ? 30 : 0)

useEffect(() => {
  if (shouldAnimate(message.id)) {
    setLastUserMessageAnimated(false)
    opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    translateX.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(markAnimated)(message.id)
        runOnJS(setLastUserMessageAnimated)(true)
      }
    })
  }
}, [message.id])

// 助手消息动画 - 等待用户消息动画完成
useEffect(() => {
  if (needsAnimation && lastUserMessageAnimated.value) {
    opacity.value = withTiming(1, { duration: 350 })
  }
}, [needsAnimation])
```

---

### 5. 🌊 流式内容淡入效果 (中优先级) ⏸️ 暂停

**问题**: AI 消息流式显示时没有视觉过渡。

**v0 方案**: 使用池化管理的交错淡入动画。

**优化点**:
- [ ] 实现 `<FadeInStaggeredIfStreaming />` 组件
- [ ] 实现 `<TextFadeInStaggeredIfStreaming />` 用于文字淡入
- [ ] 使用池化策略限制同时动画的元素数量
- [ ] 文字按词拆分，批量淡入（每次 4 个词）

**尝试过的方案及问题记录** (2024-12):

1. **方案 A: 整体淡入**
   - 实现：每次 content 更新时对整个内容应用 FadeIn 动画
   - 问题：文字一闪一闪，每次更新都重新触发动画

2. **方案 B: 首次渲染淡入**
   - 实现：只在首次渲染时淡入，后续更新不触发动画
   - 问题：看不出效果，因为首次渲染时内容很少

3. **方案 C: 词级别淡入（池化管理）**
   - 实现：
     - 创建 `StreamingContext` 传递流式状态
     - 创建 `useTextFadePool` 池化管理（最多 4 个同时动画）
     - 创建 `FadeInWord` 单词淡入组件
     - 使用 `react-native-markdown-display` 的 `rules` prop 自定义 text 渲染
   - 问题：先出现黑色空白区域，等全部消息回复后白色文字才慢慢显示

4. **方案 D: Reanimated entering 动画**
   - 实现：
     - 使用 `entering={FadeIn.duration(300)}` 动画
     - 通过 `renderedLengthRef` 追踪已渲染内容长度
     - 只对 `wordPosition >= previousRenderedLength` 的新词应用动画
   - 问题：没有淡入效果

**根本原因分析**:
- `react-native-markdown-display` 每次 content 变化时会完全重新渲染整个组件树
- 即使 key 相同，所有子组件都会重新挂载
- 这导致：
  1. 无法通过 key 稳定性来区分新旧词
  2. `entering` 动画每次都会执行（因为是新挂载）
  3. 池化逻辑的状态在重新渲染时被重置

**可能的解决方向**:
- 使用不同的 Markdown 渲染库（如 `react-native-marked`）
- 自己实现简单的 Markdown 解析器，手动控制渲染
- 使用 CSS 动画而非 Reanimated（参考 flowtoken 库的实现）
- 放弃 Markdown 支持，直接操作文本

**参考资料**:
- [v0 iOS app 博客](https://vercel.com/blog/how-we-built-the-v0-ios-app) - 使用 MDX 组件 + word-by-word fade
- [flowtoken](https://github.com/Portkey-AI/flowtoken) - 使用 CSS 动画 + diff 模式追踪增量内容

---

### 6. 🎨 浮动 Composer 增强 (中优先级) ✅ 已完成

**问题**: 当前 Composer 使用 `position: absolute`，但缺少高度变化时的滚动同步。

**v0 方案**: Composer 高度变化时自动滚动列表。

**实施说明** (2024-12):
- [x] 在 `ChatInputBar` 中使用 `onLayout` 测量高度，调用 `setComposerHeight` 更新 Context
- [x] 在 `ChatMessageList` 中使用 `useAnimatedReaction` 监听 `composerHeight` 和 `keyboardHeight` 变化
- [x] 动态计算 `topPadding`（inverted 模式下的视觉底部边距）：`inputBarHeight + bottomSafeArea + keyboardHeight + 16`
- [x] 高度增加时（输入框或键盘），如果用户在底部（`isAtEnd`），自动滚动保持位置

**代码参考**:
```tsx
// ChatInputBar - 测量高度
const { setComposerHeight } = useComposerHeight()

const handleLayout = useCallback((event: LayoutChangeEvent) => {
  const { height } = event.nativeEvent.layout
  setComposerHeight(height)
}, [setComposerHeight])

// ChatMessageList - 响应高度变化
const { composerHeight } = useComposerHeight()
const { keyboardHeight } = useKeyboardState()

const [inputBarHeight, setInputBarHeight] = useState(DEFAULT_INPUT_BAR_HEIGHT)
const [currentKeyboardHeight, setCurrentKeyboardHeight] = useState(0)

// 滚动到底部的辅助函数
const scrollToBottomIfNeeded = useCallback(() => {
  if (isAtEnd.value) {
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: 0, animated: true })
    })
  }
}, [isAtEnd])

// 监听 composerHeight 和 keyboardHeight 变化
useAnimatedReaction(
  () => composerHeight.value,
  (height, prevHeight) => {
    if (height > 0 && height !== prevHeight) {
      runOnJS(setInputBarHeight)(height)
      if (height > (prevHeight ?? 0)) runOnJS(scrollToBottomIfNeeded)()
    }
  },
  []
)

useAnimatedReaction(
  () => keyboardHeight.value,
  (height, prevHeight) => {
    if (height !== prevHeight) {
      runOnJS(setCurrentKeyboardHeight)(height)
      if (height > (prevHeight ?? 0)) runOnJS(scrollToBottomIfNeeded)()
    }
  },
  []
)

// 动态 padding（包含键盘高度）
const topPadding = inputBarHeight + bottomSafeArea + currentKeyboardHeight + 16
```

**后续优化**:
- [ ] 当前已使用 Liquid Glass，可继续优化 `LiquidGlassContainerView` 的视图融合效果

---

### 7. 📋 图片粘贴支持 (低优先级) 补充：暂时不做！

**问题**: 当前 TextInput 不支持粘贴图片/文件。

**v0 方案**: 使用 Expo Module 监听 `UIPasteboard` 粘贴事件。

**优化点**:
- [ ] 创建 `TextInputWrapper` 组件包装 TextInput
- [ ] 实现原生粘贴监听：
  ```tsx
  <TextInputWrapper onPaste={pasted => ...}>
    <TextInput />
  </TextInputWrapper>
  ```
- [ ] 长文本自动转为 `.txt` 文件附件

---

### 8. 🔧 样式优化 (低优先级)补充：成本太大，暂不考虑

**问题**: 当前使用 NativeWind/TailwindCSS，render 时有上下文访问开销。

**v0 方案**: 使用 `react-native-unistyles` 避免重渲染。

**优化点**:
- [ ] 评估迁移到 `react-native-unistyles` 的可行性
- [ ] 核心路径组件优先考虑使用 StyleSheet.create

---

### 9. 🍎 原生组件整合 (已部分实现)

**当前状态**: 已使用 `zeego` 和 `@expo/ui` 实现原生菜单。

**进一步优化**:
- [ ] Liquid Glass 菜单（zeego 配合 Xcode 26 自动支持）
- [ ] 使用 `presentationStyle="formSheet"` 原生底部弹窗替代 JS 实现
- [ ] 注意 iOS 26 的 Modal/Alert 渲染问题，必要时添加补丁

---

### 10. 📡 API 层优化 (建议)

**v0 方案**: 使用 OpenAPI + Hey API + TanStack Query 生成类型安全的 API 客户端。

**优化点**:
- [ ] 将业务逻辑尽量迁移到服务端
- [ ] 使用 OpenAPI spec 生成客户端代码
- [ ] 使用 TanStack Query 管理数据获取和缓存

---

## 优先级排序

| 优先级 | 模块 | 影响程度 | 工作量 | 状态 |
|--------|------|----------|--------|------|
| P0 | 键盘处理升级 | 用户体验显著提升 | 中等 | ✅ |
| P0 | 可组合 Chat 架构 | 代码可维护性 | 较大 | ✅ |
| P0 | 虚拟列表 | 性能优化 | 中等 | 🚧 |
| P1 | 消息动画 | 视觉体验 | 中等 | ✅ |
| P1 | 流式内容淡入 | 视觉体验 | 中等 | ⏸️ 暂停 |
| P1 | 浮动 Composer 增强 | 交互体验 | 较小 | ✅ |
| P2 | 图片粘贴 | 功能完善 | 中等 | 暂不做 |
| P2 | 样式优化 | 性能优化 | 较大 | 暂不做 |
| P3 | 原生组件深度整合 | 体验优化 | 持续 | - |

---

## 依赖库清单

```bash
# 已安装的依赖
pnpm add react-native-keyboard-controller  # ✅ 已安装
pnpm add @legendapp/list                   # ✅ 已安装 (^3.0.0-beta.9)

# 可选依赖
pnpm add react-native-unistyles
```

---

## 参考资料

- [How we built the v0 iOS app](https://vercel.com/blog/how-we-built-the-v0-ios-app)
- [LegendList](https://legendapp.com/open-source/list/)
- [react-native-keyboard-controller](https://kirillzyusko.github.io/react-native-keyboard-controller/)
- [react-native-unistyles](https://github.com/jpudysz/react-native-unistyles)
- [@callstack/liquid-glass](https://github.com/callstack/liquid-glass)
