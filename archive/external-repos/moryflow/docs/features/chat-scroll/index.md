# Chat 滚动策略

## 需求

Chat 消息列表的智能滚动行为：
- 用户发送消息后自动滚动到底部
- AI 流式输出时自动跟踪
- 用户手动滚动到顶部时不强制拉回
- 初始加载无闪烁

## 技术方案

### 核心架构

```
ChatMessageList
└── FlatList
    ├── onScroll → handleScroll
    ├── onContentSizeChange → handleContentSizeChange
    └── onLayout → handleLayout
        │
        └── useScrollController (Hook)
            ├── isAtEnd (SharedValue)
            ├── isInitialLoadRef
            ├── contentHeightRef
            └── scrollOffsetRef
```

### 核心策略：单一滚动触发点

**只在 `handleContentSizeChange` 中处理滚动**，避免多处触发互相干扰。

### 核心逻辑（伪代码）

```
handleContentSizeChange(height):
  # 初始加载阶段
  if isInitialLoad and height > 0:
    scrollToEnd(animated: false)
    debounce 100ms → setIsReady(true)
    return

  # 正常使用：内容高度增加且在底部时滚动
  if height > prevHeight and isAtEnd:
    maxOffset = height - layoutHeight
    scrollToOffset(maxOffset, animated: height - prevHeight < 500)

useEffect([messages]):
  if not isInitialLoad and hasNewUserMessage:
    isAtEnd = true  # 强制设置，确保后续滚动

handleScroll:
  atEnd = offsetY >= contentHeight - layoutHeight - threshold
  isAtEnd = atEnd
```

### 用户消息 vs AI 消息

| 场景 | 处理 |
|------|------|
| 用户发送消息 | 强制 isAtEnd = true |
| AI 回复 | 不改变 isAtEnd，尊重用户滚动位置 |

### 关键配置

```typescript
<FlatList
  onScroll={handleScroll}
  onContentSizeChange={handleContentSizeChange}
  scrollEventThrottle={16}
  style={{ opacity: isReady ? 1 : 0 }}  // 避免闪烁
  bounces={false}
/>
```

## 代码索引

| 模块 | 路径 |
|------|------|
| 滚动控制 Hook | `apps/mobile/components/chat/hooks/useScrollController.ts` |
| 消息列表组件 | `apps/mobile/components/chat/components/ChatMessageList.tsx` |
| 状态管理 Context | `apps/mobile/components/chat/contexts/MessageListContext.tsx` |
