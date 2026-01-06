# 设计文档

## 概述

本设计文档描述了将 PC 端 Tiptap 富文本编辑器迁移到 React Native 移动端的技术方案。采用 WebView 方案，通过 `react-native-webview` 加载打包好的 Tiptap 编辑器，并通过 Bridge 层实现 React Native 与 WebView 之间的双向通信。

### 设计目标

1. **最大化代码复用**：复用 PC 端 90% 以上的 Tiptap 代码
2. **一致的用户体验**：移动端编辑体验与 PC 端保持一致
3. **良好的性能**：加载时间 < 2s，输入延迟 < 100ms
4. **可维护性**：清晰的架构，易于调试和扩展

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Native App                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  EditorScreen    │  │  EditorToolbar   │  │  ImagePicker  │  │
│  │  (页面容器)       │  │  (原生工具栏)     │  │  (图片选择)    │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘  │
│           │                     │                     │          │
│  ┌────────▼─────────────────────▼─────────────────────▼───────┐  │
│  │                    EditorBridge                             │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │  │
│  │  │ 命令发送器   │  │ 事件监听器   │  │ 状态同步器          │  │  │
│  │  │ sendCommand │  │ onMessage   │  │ syncState           │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │  │
│  └────────────────────────────┬────────────────────────────────┘  │
│                               │                                   │
│  ┌────────────────────────────▼────────────────────────────────┐  │
│  │                    WebView Container                         │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │                 Tiptap Editor Bundle                    │  │  │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │  │
│  │  │  │ Editor Core  │  │ Extensions   │  │ Bridge Client│  │  │  │
│  │  │  │ (编辑器核心)  │  │ (扩展插件)    │  │ (桥接客户端) │  │  │  │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 通信架构

```
React Native                          WebView (Tiptap)
     │                                      │
     │  ──── postMessage (命令) ────────►   │
     │       { type: 'command',             │
     │         action: 'toggleBold' }       │
     │                                      │
     │  ◄──── onMessage (事件) ────────     │
     │       { type: 'event',               │
     │         event: 'contentChange',      │
     │         data: { html, markdown } }   │
     │                                      │
     │  ◄──── onMessage (状态) ────────     │
     │       { type: 'state',               │
     │         data: { isBold, isItalic }}  │
     │                                      │
```

## 组件与接口

### 1. EditorWebView 组件

React Native 端的 WebView 容器组件。

```typescript
// lib/editor/EditorWebView.tsx

interface EditorWebViewProps {
  /** 初始 Markdown 内容 */
  initialContent: string
  /** 内容变化回调 */
  onContentChange: (markdown: string) => void
  /** 编辑器就绪回调 */
  onReady: () => void
  /** 编辑器状态变化回调 */
  onStateChange: (state: EditorState) => void
  /** 是否只读 */
  readOnly?: boolean
  /** 占位符文本 */
  placeholder?: string
}

interface EditorState {
  /** 是否加粗 */
  isBold: boolean
  /** 是否斜体 */
  isItalic: boolean
  /** 是否下划线 */
  isUnderline: boolean
  /** 当前标题级别 (0 表示非标题) */
  headingLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** 是否在列表中 */
  isInList: boolean
  /** 列表类型 */
  listType: 'bullet' | 'ordered' | 'task' | null
  /** 是否在代码块中 */
  isInCodeBlock: boolean
  /** 是否可撤销 */
  canUndo: boolean
  /** 是否可重做 */
  canRedo: boolean
}
```

### 2. EditorBridge 桥接层

负责 React Native 与 WebView 之间的通信。

```typescript
// lib/editor/EditorBridge.ts

/** 发送到 WebView 的命令类型 */
type EditorCommand =
  | { type: 'setContent'; markdown: string }
  | { type: 'getContent' }
  | { type: 'toggleBold' }
  | { type: 'toggleItalic' }
  | { type: 'toggleUnderline' }
  | { type: 'toggleStrike' }
  | { type: 'setHeading'; level: 0 | 1 | 2 | 3 | 4 | 5 | 6 }
  | { type: 'toggleBulletList' }
  | { type: 'toggleOrderedList' }
  | { type: 'toggleTaskList' }
  | { type: 'toggleCodeBlock' }
  | { type: 'toggleBlockquote' }
  | { type: 'insertImage'; src: string; alt?: string }
  | { type: 'insertTable'; rows: number; cols: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'focus' }
  | { type: 'blur' }

/** 从 WebView 接收的消息类型 */
type EditorMessage =
  | { type: 'ready' }
  | { type: 'contentChange'; html: string; markdown: string }
  | { type: 'stateChange'; state: EditorState }
  | { type: 'selectionChange'; hasSelection: boolean; selectedText: string }
  | { type: 'focus' }
  | { type: 'blur' }
  | { type: 'error'; message: string; stack?: string }
  | { type: 'requestImage' }

class EditorBridge {
  private webViewRef: RefObject<WebView>
  private messageHandlers: Map<string, (data: any) => void>

  constructor(webViewRef: RefObject<WebView>) {
    this.webViewRef = webViewRef
    this.messageHandlers = new Map()
  }

  /** 发送命令到 WebView */
  sendCommand(command: EditorCommand): void {
    const message = JSON.stringify(command)
    this.webViewRef.current?.injectJavaScript(
      `window.editorBridge.handleCommand(${message}); true;`
    )
  }

  /** 注册消息处理器 */
  onMessage(type: string, handler: (data: any) => void): () => void {
    this.messageHandlers.set(type, handler)
    return () => this.messageHandlers.delete(type)
  }

  /** 处理来自 WebView 的消息 */
  handleMessage(event: WebViewMessageEvent): void {
    const message = JSON.parse(event.nativeEvent.data) as EditorMessage
    const handler = this.messageHandlers.get(message.type)
    handler?.(message)
  }
}
```

### 3. WebView 端 Bridge Client

WebView 内部的桥接客户端，处理来自 React Native 的命令。

```typescript
// editor-bundle/bridge-client.ts

class BridgeClient {
  private editor: Editor

  constructor(editor: Editor) {
    this.editor = editor
    this.setupEventListeners()
  }

  /** 处理来自 RN 的命令 */
  handleCommand(command: EditorCommand): void {
    switch (command.type) {
      case 'setContent':
        this.editor.commands.setContent(markdownToHtml(command.markdown))
        break
      case 'getContent':
        this.sendMessage({
          type: 'contentChange',
          html: this.editor.getHTML(),
          markdown: htmlToMarkdown(this.editor.getHTML()),
        })
        break
      case 'toggleBold':
        this.editor.chain().focus().toggleBold().run()
        break
      case 'toggleItalic':
        this.editor.chain().focus().toggleItalic().run()
        break
      // ... 其他命令处理
      case 'insertImage':
        this.editor.chain().focus().setImage({ src: command.src, alt: command.alt }).run()
        break
      case 'insertTable':
        this.editor.chain().focus().insertTable({ 
          rows: command.rows, 
          cols: command.cols 
        }).run()
        break
    }
  }

  /** 发送消息到 RN */
  private sendMessage(message: EditorMessage): void {
    window.ReactNativeWebView?.postMessage(JSON.stringify(message))
  }

  /** 设置编辑器事件监听 */
  private setupEventListeners(): void {
    // 内容变化
    this.editor.on('update', () => {
      this.sendMessage({
        type: 'contentChange',
        html: this.editor.getHTML(),
        markdown: htmlToMarkdown(this.editor.getHTML()),
      })
    })

    // 选区/状态变化
    this.editor.on('selectionUpdate', () => {
      this.sendMessage({
        type: 'stateChange',
        state: this.getEditorState(),
      })
    })

    // 焦点变化
    this.editor.on('focus', () => this.sendMessage({ type: 'focus' }))
    this.editor.on('blur', () => this.sendMessage({ type: 'blur' }))
  }

  /** 获取当前编辑器状态 */
  private getEditorState(): EditorState {
    return {
      isBold: this.editor.isActive('bold'),
      isItalic: this.editor.isActive('italic'),
      isUnderline: this.editor.isActive('underline'),
      headingLevel: this.getHeadingLevel(),
      isInList: this.editor.isActive('bulletList') || this.editor.isActive('orderedList'),
      listType: this.getListType(),
      isInCodeBlock: this.editor.isActive('codeBlock'),
      canUndo: this.editor.can().undo(),
      canRedo: this.editor.can().redo(),
    }
  }
}

// 挂载到全局
window.editorBridge = new BridgeClient(editor)
```

### 4. 移动端工具栏组件

```typescript
// components/editor/EditorToolbar.tsx

interface EditorToolbarProps {
  state: EditorState
  onCommand: (command: EditorCommand) => void
  visible: boolean
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ state, onCommand, visible }) => {
  if (!visible) return null

  return (
    <View style={styles.toolbar}>
      <ToolbarButton
        icon="bold"
        active={state.isBold}
        onPress={() => onCommand({ type: 'toggleBold' })}
      />
      <ToolbarButton
        icon="italic"
        active={state.isItalic}
        onPress={() => onCommand({ type: 'toggleItalic' })}
      />
      <ToolbarButton
        icon="underline"
        active={state.isUnderline}
        onPress={() => onCommand({ type: 'toggleUnderline' })}
      />
      <ToolbarDivider />
      <HeadingDropdown
        level={state.headingLevel}
        onSelect={(level) => onCommand({ type: 'setHeading', level })}
      />
      <ToolbarDivider />
      <ToolbarButton
        icon="list-bullet"
        active={state.listType === 'bullet'}
        onPress={() => onCommand({ type: 'toggleBulletList' })}
      />
      <ToolbarButton
        icon="list-ordered"
        active={state.listType === 'ordered'}
        onPress={() => onCommand({ type: 'toggleOrderedList' })}
      />
      <ToolbarButton
        icon="checkbox"
        active={state.listType === 'task'}
        onPress={() => onCommand({ type: 'toggleTaskList' })}
      />
      <ToolbarDivider />
      <ToolbarButton
        icon="image"
        onPress={() => onCommand({ type: 'requestImage' } as any)}
      />
      <ToolbarButton
        icon="table"
        onPress={() => onCommand({ type: 'insertTable', rows: 3, cols: 3 })}
      />
    </View>
  )
}
```

## 数据模型

### 编辑器内容格式

```typescript
/** 编辑器内部使用 HTML 格式 */
type EditorHTML = string

/** 存储使用 Markdown 格式 */
type StorageMarkdown = string

/** 内容转换函数 */
interface ContentConverter {
  /** Markdown 转 HTML（用于加载） */
  markdownToHtml(markdown: StorageMarkdown): EditorHTML
  /** HTML 转 Markdown（用于保存） */
  htmlToMarkdown(html: EditorHTML): StorageMarkdown
}
```

### 笔记数据结构

```typescript
interface Note {
  id: string
  title: string
  /** Markdown 格式的内容 */
  content: string
  createdAt: number
  updatedAt: number
  /** 所属文件夹路径 */
  folderPath: string
}
```

## 错误处理

### 错误类型

```typescript
enum EditorErrorType {
  /** WebView 加载失败 */
  LOAD_FAILED = 'LOAD_FAILED',
  /** 通信超时 */
  COMMUNICATION_TIMEOUT = 'COMMUNICATION_TIMEOUT',
  /** 内容解析失败 */
  PARSE_ERROR = 'PARSE_ERROR',
  /** 图片上传失败 */
  IMAGE_UPLOAD_FAILED = 'IMAGE_UPLOAD_FAILED',
}

interface EditorError {
  type: EditorErrorType
  message: string
  details?: unknown
}
```

### 错误处理策略

1. **WebView 加载失败**：显示重试按钮，提供降级到纯文本编辑器的选项
2. **通信超时**：自动重试 3 次，失败后提示用户
3. **内容解析失败**：保留原始内容，显示警告
4. **图片上传失败**：显示错误提示，允许重试



## 正确性属性

*属性是系统在所有有效执行中应保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规格与机器可验证正确性保证之间的桥梁。*

基于验收标准的预分析，以下是可通过属性测试验证的正确性属性：

### 属性 1：格式化命令正确性

*对于任意* 文本内容和任意格式类型（加粗、斜体、下划线），应用格式命令后，内容应包含相应的格式标记，且原始文本内容保持不变。

**验证：需求 1.2, 7.2**

### 属性 2：Markdown 往返一致性

*对于任意* 有效的 Markdown 内容，经过 `markdownToHtml` 转换为 HTML 后，再经过 `htmlToMarkdown` 转换回 Markdown，应产生语义等价的内容。

**验证：需求 6.4, 6.5**

### 属性 3：内容持久化往返

*对于任意* 编辑器内容，保存到本地存储后重新加载，应恢复完全相同的内容。

**验证：需求 6.3**

### 属性 4：图片插入正确性

*对于任意* 有效的图片 URL，执行插入图片命令后，编辑器内容应包含该图片元素，且图片 src 属性与输入 URL 一致。

**验证：需求 4.2**

### 属性 5：表格创建正确性

*对于任意* 正整数行数 rows 和列数 cols，执行插入表格命令后，编辑器内容应包含一个具有 rows 行和 cols 列的表格结构。

**验证：需求 5.1**

### 属性 6：表格行列操作正确性

*对于任意* 现有表格，添加行后表格行数应增加 1，添加列后表格列数应增加 1；删除行后表格行数应减少 1，删除列后表格列数应减少 1。

**验证：需求 5.3, 5.4**

### 属性 7：Bridge 命令执行正确性

*对于任意* 有效的 EditorCommand，通过 Bridge 发送后，WebView 端应执行相应操作，且 RN 端应收到状态更新消息。

**验证：需求 9.2, 9.3**

### 属性 8：Bridge 消息协议一致性

*对于任意* 从 WebView 发送的消息，消息格式应符合 EditorMessage 类型定义，包含必需的 type 字段和相应的数据字段。

**验证：需求 8.4**

### 属性 9：错误传播正确性

*对于任意* WebView 内部错误，Bridge 应向 RN 端发送包含错误类型和消息的 error 类型消息。

**验证：需求 9.4**

## 测试策略

### 单元测试

1. **内容转换测试**
   - 测试 `markdownToHtml` 对各种 Markdown 语法的转换
   - 测试 `htmlToMarkdown` 对各种 HTML 结构的转换
   - 测试边界情况（空内容、特殊字符、嵌套结构）

2. **Bridge 消息测试**
   - 测试命令序列化/反序列化
   - 测试消息格式验证
   - 测试错误消息生成

3. **状态计算测试**
   - 测试 `getEditorState` 在各种编辑器状态下的输出
   - 测试状态变化检测逻辑

### 属性测试

使用 `fast-check` 库进行属性测试，每个属性运行至少 100 次迭代。

```typescript
// 属性测试示例

import fc from 'fast-check'

// 属性 2：Markdown 往返一致性
describe('Markdown 往返一致性', () => {
  it('**Feature: mobile-editor-migration, Property 2: Markdown 往返一致性**', () => {
    fc.assert(
      fc.property(
        fc.string(), // 生成任意字符串作为 Markdown
        (markdown) => {
          const html = markdownToHtml(markdown)
          const roundTripped = htmlToMarkdown(html)
          // 验证语义等价（忽略空白差异）
          return normalizeMarkdown(roundTripped) === normalizeMarkdown(markdown)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// 属性 5：表格创建正确性
describe('表格创建正确性', () => {
  it('**Feature: mobile-editor-migration, Property 5: 表格创建正确性**', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // 行数
        fc.integer({ min: 1, max: 10 }), // 列数
        (rows, cols) => {
          const editor = createTestEditor()
          editor.commands.insertTable({ rows, cols })
          const html = editor.getHTML()
          const rowCount = (html.match(/<tr>/g) || []).length
          const colCount = (html.match(/<td>/g) || []).length / rowCount
          return rowCount === rows && colCount === cols
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### 集成测试

1. **WebView 加载测试**
   - 验证 WebView 正确加载编辑器 bundle
   - 验证 ready 事件正确发送

2. **端到端通信测试**
   - 验证 RN → WebView 命令执行
   - 验证 WebView → RN 事件传递

3. **内容保存/恢复测试**
   - 验证内容正确保存到本地存储
   - 验证重新打开后内容正确恢复

### 测试工具

- **单元测试**：Jest
- **属性测试**：fast-check
- **集成测试**：Detox（React Native E2E 测试框架）
- **WebView 测试**：Jest + jsdom（模拟 WebView 环境）

## 实现注意事项

### 性能优化

1. **Bundle 优化**
   - 使用 Tree Shaking 移除未使用的 Tiptap 扩展
   - 代码分割，按需加载高级功能
   - 压缩和 Gzip 减小 bundle 大小

2. **通信优化**
   - 批量发送状态更新，避免频繁通信
   - 使用防抖处理内容变化事件
   - 大内容使用增量更新

3. **渲染优化**
   - WebView 预加载
   - 骨架屏显示加载状态
   - 长文档虚拟滚动

### 键盘处理

1. **iOS**
   - 使用 `InputAccessoryView` 放置工具栏
   - 监听键盘高度变化调整布局

2. **Android**
   - 使用 `windowSoftInputMode="adjustResize"`
   - 手动计算工具栏位置

### 图片处理

1. **图片选择**
   - 使用 `expo-image-picker` 选择/拍照
   - 压缩图片减小存储大小

2. **图片存储**
   - 图片保存到本地文件系统
   - 使用相对路径引用

### 离线支持

1. **Bundle 缓存**
   - 首次加载后缓存编辑器 bundle
   - 版本更新时自动更新缓存

2. **内容缓存**
   - 所有内容本地存储
   - 支持完全离线编辑

