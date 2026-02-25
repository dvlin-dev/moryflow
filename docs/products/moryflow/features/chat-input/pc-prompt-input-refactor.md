---
title: Moryflow PC 输入框重构方案（Agent/Model/MCP + 主操作合并）
date: 2026-01-27
scope: apps/moryflow/pc
status: proposal
---

<!--
[INPUT]: PC 端 Chat 输入框结构与交互诉求（Agent/Model/MCP、@ 上移、主操作合并）
[OUTPUT]: 可落地的 UI/交互重构方案与改造清单
[POS]: Moryflow PC 输入框改造方案（供评审）

[PROTOCOL]: 本文件变更需同步更新 docs/products/moryflow/index.md、docs/index.md、docs/CLAUDE.md。
-->

# Moryflow PC 输入框重构方案

## 背景

当前输入框底部控件过密，视觉重心分散，操作路径冗余（模式切换、模型切换、MCP、语音/发送、上下文入口混在同一层）。希望参考图 2 的结构，建立更清晰的“左侧能力控制 + 右侧主操作”分区。

## 目标

- 维持现有功能（模式切换/模型切换/MCP/上下文/语音/发送/附件），减少视觉拥挤。
- 对齐图 2 的操作层级：模式切换采用“图标胶囊 + 下拉”形态。
- 主操作区清晰：语音与发送合并为同一位置，@ 入口移动至发送左侧。
- @ 引用默认展示最近操作过的 3 个文件，搜索覆盖整个工作区。
- 上传文件入口与已上传文件展示与引用文件一致化（同一行、小胶囊、统一样式）。

## 设计方向（保持既有语言）

- 继续沿用现有 Notion/Arc 风格（浅灰、圆角、克制阴影）。
- 组件使用现有 `@moryflow/ui` 输入组与按钮风格，避免引入新视觉语言。

## 目标布局（结构示意）

```
[Context tags row]  (仅当存在上下文文件时展示)
┌──────────────────────────────────────────────┐
│                  Textarea                    │
└──────────────────────────────────────────────┘
Left:  [Mode pill ▼]  [Model ▼]  [MCP icon]
Right: [Attach icon] [@ icon] [Primary action]
```

说明：

- 左侧保持“会话级能力开关”聚合，数量固定为 3。
- 右侧聚合“消息级动作”，@ 固定在主操作按钮左侧。

## 交互细节

### 1) 模式切换（Agent/Full Access）

- 采用“图标胶囊 + 下拉”按钮（类似图 2）。
- 交互从“toggle”改为“dropdown select”：
  - 选择 Agent 直接切换。
  - 选择 Full Access 直接切换（不再弹出确认对话框）。
- 可视态：
  - Full Access：强调色描边/文字（保持现有橙色系提示）。
  - Agent：默认状态。

### 2) 模型切换 & MCP

- 模型切换保持现有 `ModelSelector` 行为与样式。
- MCP 保持现有 `McpSelector` 视觉与交互。

### 3) @ 上下文入口

- `@` 仅保留图标，不显示文字。
- 从输入框上方移动到右侧主操作区，固定在主操作按钮左侧。
- 上方仅保留 `ContextFileTags`（有内容时显示），避免顶部出现额外按钮。
- `FileContextAdder` 增加 `iconOnly`/`size`/`className` 控制，保证在右侧与主操作按钮协调。

### 4) 附件入口（保留功能，降噪位置）

- 将附件入口从左侧工具区移到右侧动作区（放在 `@` 左侧）。
- 视觉使用 `InputGroupButton` 的 `icon-sm` 尺寸与中性样式，避免抢占主操作焦点。
- 入口图标改为“加号”，避免与附件概念混淆。

### 5) 主操作按钮（语音/发送合并）

主操作按钮显示逻辑（优先级由高到低）：

1. **生成中**：显示 Stop（中断）。
2. **语音录制中**：显示 Stop（结束录音）。
3. **输入有文本**：显示 Send（提交）。
4. **输入为空**：显示 Mic（开始录音）。

说明：

- 保持录音波形与时长提示（位于左侧区域），但主操作按钮始终占位不抖动。
- 发送与语音按钮在同一位置，样式统一（圆形、尺寸一致）。

### 6) 上下文进度（隐藏展示）

- `TokenUsageIndicator` 保留计算逻辑，但不在 UI 中显示。
- 如需保留可访问性，可使用 `sr-only` 包裹而非直接删除。

### 7) @ 引用文件行为（补充）

- 默认展示：最近操作过的 3 个文件（无需打开状态）。
- 搜索范围：工作区全量文件，不局限于“已打开文件/已加载树”。
- 已引用文件不在默认列表中重复出现。
- 当工作区无文件时保持空状态提示。

“最近操作”的定义：

- 仅“打开/聚焦”（active file 切换、tab 聚焦）。
- MRU 以 vault 维度持久化，最多保留 3 个。
- 无 MRU 记录时，回退为 `mtime` 最近的 3 个文件（从全量树读取）。

默认列表与搜索：

- 默认列表仅展示 MRU 3 个文件，分组标题为 “Recent”。
- 输入框有搜索词时，展示全量搜索结果，分组标题为 “All files”。
- 搜索结果继续展示相对路径，便于区分同名文件。

### 8) 上传文件入口与展示（补充）

- 上传入口图标：改为“加号”。
- 已上传文件展示位置：与引用文件同一行（同一个胶囊容器行）。
- 引用文件与上传文件统一为“小胶囊”样式：
  - 固定高度与宽度（避免长度不一导致视觉锯齿）。
  - 文件名超长时使用省略号。
  - Hover 时右侧显示关闭 icon，交互与引用文件一致。
- 统一图标与文案对齐规则（左侧 icon、右侧关闭，文本居中/截断）。

推荐尺寸与样式（对齐 Notion 风格）：

- 胶囊尺寸：`h-7 w-36`（28px 高，144px 宽），圆角 `rounded-full`。
- 文字：`text-xs font-medium truncate`，左右内边距对齐 icon 与关闭按钮。
- 左侧 icon：`size-3.5`；右侧关闭按钮：容器 `size-5`、icon `size-3.5`。
- 背景/描边：`border border-border-muted bg-muted/50`，hover `bg-muted`。

## Notion 风格交互规范（执行级）

- 输入框容器：
  - 圆角与阴影保持现状（不新增强烈发光/高饱和提示）。
  - 多行文本区域保持 `min-h-16`，顶部与底部间距均匀（避免视觉拥挤）。
- 工具区排列：
  - 左侧能力区（Mode/Model/MCP）与右侧动作区（Attach/@/Primary）之间保持稳定间距。
  - 所有按钮高度对齐，避免错位造成“碎片感”。
- 小胶囊行：
  - 引用文件与上传文件在同一行渲染，行内 gap 统一为 6~8px。
  - 超长文件名仅在胶囊内部截断，行不换行（允许横向滚动或换行由容器决定）。
- Hover 反馈：
  - 仅做轻微背景变深与关闭 icon 显示，避免强烈色彩与跳动。
  - 关闭按钮只在 hover 时出现，保持视觉干净。
- 弹层（@ 选择）：
  - 默认 Recent 展示 3 条，输入后立即切换 All files。
  - 支持方向键选择、Enter 确认、Esc 关闭，符合 Notion 式命令面板体验。

## 状态管理与实现策略（最佳实践）

### 文本状态

引入 `PromptInputProvider` 管理文本与附件，避免手动读写 DOM：

- 使用 `usePromptInputController().textInput.value` 判断输入是否为空。
- `handleTranscribed` 直接调用 `textInput.setInput(...)`，减少对 `textareaRef` 的依赖。
- `textareaRef` 仅用于 focus 与滚动控制。

### 组件拆分

为降低复杂度，建议拆分：

- `ModeSelector`：封装模式下拉 + 确认逻辑。
- `PrimaryActionButton`：封装语音/发送/停止的优先级判断与样式。
- `FooterActions`：封装左右分区布局，减少 `ChatPromptInput` 内 JSX 复杂度。
- `FileChip`：统一渲染“引用文件/上传文件”的胶囊（含 icon/文本/关闭按钮）。
- `FileChipRow`：统一容器行（包含 `FileContextAdder` + 文件胶囊列表）。

### 数据源与缓存策略（补充）

- 全量文件列表：使用 `vault.readTree` 获取完整树并扁平化，避免依赖 `getTreeCache` 的局部树。
- 最近文件列表：独立维护 MRU（per vault），避免单纯使用文件 `mtime` 代替“最近操作”。
- 刷新策略：
  - 弹层打开时优先刷新全量列表（防止过期）。
  - 监听 `onVaultFsEvent` 做轻量刷新或失效标记。
  - MRU 更新发生在“文件打开/聚焦”事件上。
  - MRU 持久化使用 workspace store（electron-store），key 为 vaultPath。

MRU 数据结构与规则（执行级）：

- 结构：`recentFiles: Record<string, string[]>`（value 为 file paths）。
- 写入规则：
  - 新 path 追加到最前（去重），保留前 3 个。
  - 文件被删除时从 MRU 过滤（由 `useVaultTreeState` 监听 `file-removed` 事件触发）。
- 读出规则：
  - 仅返回当前 vault 对应的 3 个 path。
  - path 不存在于全量文件列表时跳过。

IPC 与数据流（执行级）：

- 新增 workspace IPC：
  - `workspace:getRecentFiles(vaultPath)` → `string[]`
  - `workspace:recordRecentFile(vaultPath, filePath)` → `void`
  - `workspace:removeRecentFile(vaultPath, filePath)` → `void`
- 触发入口（只做打开/聚焦）：
  - `useDocumentState.loadDocument` 成功后触发记录。
  - `handleSelectTab` 切换 tab 时触发记录（通过 `loadDocument` 统一）。
  - 特殊 tab（AI/Sites）不写入 MRU。
  - `useVaultTreeState` 监听 `file-removed` 事件时触发移除。

## 改造清单（文件级）

### 业务侧

- `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/index.tsx`
  - 重排结构：左侧仅 Mode/Model/MCP，右侧仅 Attach/@/PrimaryAction。
  - 接入 `PromptInputProvider` 与 `usePromptInputController`。
  - 语音/发送按钮合并，新增 `PrimaryActionButton`。
  - 上方仅显示 `ContextFileTags`（按需渲染）。
  - Token usage 仅保留计算（`sr-only` 隐藏展示）。
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/file-context-adder/index.tsx`
  - 增加 `iconOnly` 与尺寸/类名控制，保证在右侧与按钮一致。
  - 增加 `recentFiles` 展示逻辑（默认列表）与全量搜索过滤。
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/context-file-tags/index.tsx`
  - 抽象为通用 `FileChip`（引用/上传复用），保证胶囊样式一致。
- `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-workspace-files.ts`
  - 改为获取全量树（`vault.readTree`），输出全量文件列表。
- `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-recent-files.ts`（新增）
  - 读取 MRU（per vault），无 MRU 时回退 `mtime` 最近文件。
- `apps/moryflow/pc/src/renderer/workspace/*`
  - 在文件打开/切换的入口处调用 `recordRecentFile`（记录 MRU）。
- `apps/moryflow/pc/src/main/workspace-settings.ts`
  - 新增 `recentFiles` 存储字段与读写函数。
- `apps/moryflow/pc/src/main/app/ipc-handlers.ts`
  - 新增 recentFiles IPC handlers。
- `apps/moryflow/pc/src/preload/index.ts`
  - 暴露 recentFiles IPC 到 renderer。
- `apps/moryflow/pc/src/shared/ipc/desktop-api.ts`
  - 补齐 workspace.recentFiles API 类型定义。

### UI 组件层（如需）

- `packages/ui/src/ai/prompt-input/*`
  - 若需要统一主操作按钮样式，可考虑添加 `PromptInputPrimaryAction` 组件（可选）。

## 测试建议

- 单元测试（Vitest + Testing Library）：
  - `PrimaryActionButton`：空文本 → Mic；有文本 → Send；录音/生成中 → Stop。
  - `ModeSelector`：切换 Agent/Full Access 不出现确认对话框。
  - `@` 入口：点击后能打开 `FileContextAdder`。
  - `FileContextAdder`：无输入时展示 3 个 MRU；输入后搜索全量列表。
  - `FileChip`：超长名称省略；Hover 显示关闭按钮；点击删除触发。
  - MRU：record 去重 + 保持 3 个 + 删除文件时移除。
- 手动验证（PC）：
  - 录音中波形显示与按钮状态切换。
  - 发送/停止在不同状态下无布局抖动。
  - MRU 与搜索范围符合预期（打开关闭文件后 MRU 更新）。

## 验收标准（执行级）

- 默认仅显示 Recent 3 个文件，且来自“打开/聚焦”行为。
- 输入搜索时，结果覆盖工作区全量文件。
- 上传文件与引用文件同一行，胶囊尺寸与 hover/关闭交互一致。
- Full Access 切换不再弹出确认。
- 视觉符合 Notion：浅色系、克制 hover、无强烈视觉噪声。

## 执行清单（按文件逐条修改）

1. `apps/moryflow/pc/src/main/workspace-settings.ts`
   - 新增 `recentFiles: Record<string, string[]>` 默认值。
   - 新增 `getRecentFiles / recordRecentFile / removeRecentFile` 方法。
   - 规则：去重、插入头部、保留 3 个、删除无效路径。

2. `apps/moryflow/pc/src/main/app/ipc-handlers.ts`
   - 新增 IPC handler：
     - `workspace:getRecentFiles`
     - `workspace:recordRecentFile`
     - `workspace:removeRecentFile`

3. `apps/moryflow/pc/src/preload/index.ts`
   - 暴露 `workspace.getRecentFiles / recordRecentFile / removeRecentFile`。

4. `apps/moryflow/pc/src/shared/ipc/desktop-api.ts`
   - 补齐 `workspace` API 类型定义与注释。

5. `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-recent-files.ts`（新增）
   - 负责：
     - 读取 recentFiles（vault 维度）。
     - 过滤不存在于全量列表的 path，并在无 MRU 时回退到 `mtime`。

6. `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-workspace-files.ts`
   - 改用 `vault.readTree` 获取全量树并扁平化。
   - 输出全量文件列表（用于搜索）。

7. `apps/moryflow/pc/src/renderer/workspace/hooks/use-document-state.ts`
   - 在 `loadDocument` 成功后调用 `recordRecentFile`（排除 AI/Sites）。
   - 在 `handleSelectTab` 切换时调用 `recordRecentFile`。

8. `apps/moryflow/pc/src/renderer/workspace/hooks/use-vault-tree.ts`
   - 监听 `file-removed` 事件时调用 `removeRecentFile`，避免 MRU 残留。

9. `apps/moryflow/pc/src/renderer/components/chat-pane/components/context-file-tags/index.tsx`
   - 抽象 `FileChip` 组件（引用/上传复用）。
   - 按推荐尺寸统一样式与 hover 关闭行为。

10. `apps/moryflow/pc/src/renderer/components/chat-pane/components/file-context-adder/index.tsx`

- 默认展示 recentFiles（Recent 分组）。
- 搜索时展示全量文件（All files 分组）。
- `@` 按钮保留 icon-only 形态。

11. `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/index.tsx`
    - 上传入口改为加号 icon，放在 @ 左侧。
    - 引用文件与上传文件合并到同一行胶囊容器。
    - Token usage 隐藏展示（使用 `sr-only` 包裹）。
    - Full Access 切换无确认对话框。

12. Tests
    - 新增 MRU 逻辑单测（main/workspace-settings 或 renderer hook）。
    - 更新 `FileContextAdder` 展示逻辑测试。
    - `FileChip` hover/ellipsis 行为测试（如有现成测试基线）。

## 风险与注意点

- `PromptInputProvider` 接入后 `PromptInputTextarea` 为受控，需要确保 IME 与回车提交逻辑不受影响。
- `@` 按钮移动后要保证 `ContextFileTags` 不被遮挡，避免输入框高度跳变过大。
- 右侧动作区需在窄宽度下保持对齐（不溢出、不换行）。
