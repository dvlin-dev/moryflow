# FlatList 首次渲染滚动 Hack

## 问题描述

AI Chat 页面打开时，消息列表应该直接显示在底部（最新消息），但实际上会出现多次滚动抖动。

## 根本原因

### 1. FlatList 渐进式渲染

FlatList 使用 `initialNumToRender: 15` 进行渐进式渲染，每渲染一批消息就触发 `onContentSizeChange`，导致内容高度逐步增加：

```
height: 1402 → 2182 → 2962 → 3742 → 3982 → 4448
```

### 2. opacity: 0 时 scrollToEnd 不可靠

为了避免用户看到滚动过程，使用 `opacity: 0` 隐藏 FlatList。但测试发现：
- 在 `opacity: 0` 状态下调用 `scrollToEnd` 不一定生效
- 需要在高度稳定后再次调用 `scrollToEnd`，然后用 `requestAnimationFrame` 等待一帧后再显示

## 当前方案（Hack）

**文件**：`components/chat/hooks/useScrollController.ts`

```typescript
// 初始加载阶段：持续滚动到底部，直到高度稳定
if (isInitialLoadRef.current && height > 0) {
  listRef.current?.scrollToEnd({ animated: false })

  // Debounce：高度稳定 100ms 后设置 isReady
  if (readyTimerRef.current) {
    clearTimeout(readyTimerRef.current)
  }
  readyTimerRef.current = setTimeout(() => {
    // 最终滚动：确保在显示前滚动到正确位置
    listRef.current?.scrollToEnd({ animated: false })
    requestAnimationFrame(() => {
      isInitialLoadRef.current = false
      setIsReady(true)
    })
  }, 100)
  return
}
```

**问题点**：
1. 使用 `setTimeout` 100ms debounce 检测高度稳定 - 不够精确
2. 在 timeout 回调中再次调用 `scrollToEnd` - 本质是 workaround
3. 用 `requestAnimationFrame` 等待滚动生效 - 时机不确定

## 理想方案

### 方案 A：使用 FlashList

[Shopify FlashList](https://shopify.github.io/flash-list/) 可能有更好的初始渲染控制。

### 方案 B：预计算内容高度

如果能预先知道所有消息的高度，可以使用 `getItemLayout` 让 FlatList 一次性渲染到正确位置。

### 方案 C：使用 ScrollView + 手动虚拟化

对于消息数量不多的场景，可以考虑使用 ScrollView，避免 FlatList 的渐进式渲染问题。

### 方案 D：其他隐藏方式

测试其他隐藏方式是否能让 `scrollToEnd` 正常工作：
- `position: 'absolute', left: -9999` - 移出屏幕
- 遮罩层覆盖
- `pointerEvents: 'none'` + 遮罩

## 相关文件

- `components/chat/hooks/useScrollController.ts` - 滚动控制逻辑
- `components/chat/components/ChatMessageList.tsx` - 消息列表组件

## 状态

⚠️ 临时方案，待优化

## 更新日志

- 2025-12-15：实现临时方案，记录问题
