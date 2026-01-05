# 编辑器设计

> WebView + TipTap 的富文本编辑器

## 概述

Mobile 端编辑器基于 WebView 嵌入 TipTap 编辑器，支持 Markdown 和所见即所得（WYSIWYG）两种模式。

---

## 架构

```
┌──────────────────────────────────────────────┐
│  EditorWithToolbar                           │
│  ├─ EditorWebView (TipTap)                   │
│  │   ├─ Markdown ↔ HTML 转换                │
│  │   └─ 光标/选区状态同步                    │
│  └─ EditorToolbar                            │
│      └─ 格式化按钮（粗体、斜体、标题等）     │
└──────────────────────────────────────────────┘
```

---

## 模块结构

```
lib/editor/
├── index.ts              # 公共 API
├── types.ts              # 类型定义
├── state.ts              # 编辑器状态管理
└── bridge.ts             # JS ↔ Native 通信

components/editor/
├── EditorWithToolbar.tsx # 完整编辑器组件
├── EditorWebView.tsx     # WebView 封装
├── EditorToolbar.tsx     # 工具栏
└── toolbar-config.ts     # 工具栏配置
```

---

## 核心组件

### EditorWithToolbar

完整的编辑器组件，包含 WebView 和工具栏：

```tsx
import { EditorWithToolbar } from '@/components/editor'

<EditorWithToolbar
  initialContent={markdown}
  onContentChange={handleChange}
  placeholder="开始编辑..."
  readOnly={false}
/>
```

### EditorBridge

JS 和 Native 之间的通信桥梁：

```typescript
interface EditorBridge {
  // 发送命令到编辑器
  sendCommand(command: EditorCommand): void
  
  // 插入图片
  insertImage(src: string): void
  
  // 获取当前内容
  getContent(): Promise<string>
}
```

### EditorState

编辑器状态，用于工具栏按钮状态：

```typescript
interface EditorState {
  isBold: boolean
  isItalic: boolean
  isStrikethrough: boolean
  heading: 0 | 1 | 2 | 3  // 0 = 无标题
  isBulletList: boolean
  isOrderedList: boolean
  isTaskList: boolean
  isBlockquote: boolean
  isCodeBlock: boolean
}
```

---

## 工具栏命令

```typescript
type EditorCommand =
  | { type: 'toggleBold' }
  | { type: 'toggleItalic' }
  | { type: 'toggleStrikethrough' }
  | { type: 'setHeading'; level: 0 | 1 | 2 | 3 }
  | { type: 'toggleBulletList' }
  | { type: 'toggleOrderedList' }
  | { type: 'toggleTaskList' }
  | { type: 'toggleBlockquote' }
  | { type: 'toggleCodeBlock' }
  | { type: 'insertImage'; src: string }
  | { type: 'insertLink'; url: string; text?: string }
```

---

## 键盘适配

工具栏跟随键盘显示/隐藏，使用 `useKeyboardHeight` hook：

```typescript
const { keyboardHeight, animatedHeight } = useKeyboardHeight()

// 工具栏固定在键盘上方
<Animated.View style={{ bottom: animatedHeight }}>
  <EditorToolbar />
</Animated.View>
```

---

## 详细设计

完整的 WYSIWYG 设计方案请参考原始文档：
- `docs/mobile/wysiwyg-design.md`（已归档）
