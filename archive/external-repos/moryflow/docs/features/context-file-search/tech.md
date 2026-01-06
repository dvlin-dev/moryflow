# Add Context 工作区文件搜索

## 需求

用户通过 `@` 搜索工作区文件，选择后作为上下文引用：
- 文件路径拼接到消息文本
- AI 通过工具自行读取内容
- 引用的文件在消息气泡下方展示

## 技术方案

### 附件类型

```typescript
type MessageAttachment =
  | { type: 'file-ref', path: string, name: string }   // 文件引用
  | { type: 'file-embed', content: string }            // 文件嵌入（预留）
  | { type: 'image', url: string }                     // 图片（预留）
```

### 数据流

```
用户输入 → useWorkspaceFiles → 模糊搜索 → contextFiles[]
  ↓
createFileRefAttachment → attachments[]
  ↓
buildAIRequest → { text: "...\n\n[Referenced files: ...]", metadata }
  ↓
消息渲染 → cleanFileRefMarker(text) + <MessageAttachments />
```

### 核心函数

| 函数 | 端 | 说明 |
|------|-----|------|
| `buildAIRequest(content, attachments)` | PC | 返回 `{ text, files }` |
| `buildAIRequestText(content, attachments)` | Mobile | 返回 `string` |
| `cleanFileRefMarker(text)` | 共用 | 移除 `[Referenced files: ...]` 标记 |

### 附件处理

| 类型 | 处理方式 |
|------|---------|
| `file-ref` | 拼接到文本末尾 |
| `file-embed` | 转为 FileUIPart（TODO） |
| `image` | 转为 FileUIPart（TODO） |

## 代码索引

| 模块 | 路径 |
|------|------|
| 附件类型 | `apps/pc/src/renderer/components/chat-pane/types/attachment.ts` |
| 消息元数据 | `apps/pc/src/renderer/components/chat-pane/types/message.ts` |
| 附件格式化 | `apps/pc/src/renderer/components/chat-pane/utils/attachment-formatter.ts` |
| 文件搜索选择器 | `apps/pc/src/renderer/components/chat-pane/components/file-context-adder/` |
| Mobile 附件类型 | `apps/mobile/components/chat/ChatInputBar/types/attachment.ts` |
| Mobile 文件选择 | `apps/mobile/components/chat/ChatInputBar/components/FilePanel.tsx` |
