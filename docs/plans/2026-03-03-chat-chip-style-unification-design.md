# Chat 胶囊样式统一改造方案（设计稿）

## 执行进度（2026-03-03）

- [x] 采用方案 B（统一胶囊基元），并确认 `max-w-56` + 技能胶囊纳入同款。
- [x] 输入区 `FileChip` 完成自适应宽度改造（移除固定 `w-36`，改为 `w-auto + max-w-56`）。
- [x] 输入区 `FileChip` 完成左侧 icon 同位切换关闭按钮（hover/focus-within 切换，不再右侧新增关闭入口）。
- [x] 用户消息区引用胶囊改为复用 `FileChip` readonly 样式（技能/选区/file-ref 一致）。
- [x] 保持非 file-ref 附件（如 image）继续走 `MessageMetaAttachments`，避免破坏原图片预览行为。
- [x] 复用收敛：新增 `ChipHintBadge`，输入区与消息区统一复用 `contentTruncated` 提示胶囊样式，去除重复 class。
- [x] 新增回归测试：
  - `context-file-tags/index.test.tsx`
  - `components/message/index.test.tsx`
  - `hooks/use-chat-pane-controller.test.tsx`（本轮继续保留验证发送时序 + metadata）
- [x] 校验通过：
  - `pnpm --filter @moryflow/pc exec vitest run ...`（受影响测试 6/6）
  - `pnpm --filter @moryflow/pc test:unit`（95 files / 325 tests passed）
  - `pnpm --filter @moryflow/pc typecheck`
  - `pnpm --filter @moryflow/types typecheck`
  - `pnpm --filter @moryflow/pc test:e2e -- tests/chat-chips.spec.ts`（新增 E2E 1/1 passed）

**目标**

- 输入框上方胶囊支持自适应宽度（当前固定 `w-36` 改为内容驱动 + 最大宽度限制）。
- 胶囊 hover 时不再右侧出现关闭按钮导致视觉重心变化；改为左侧 icon 位「同位替换」为关闭按钮，避免布局抖动。
- 用户消息下方的引用胶囊（文件引用、选中文本引用、选中技能）与输入框胶囊样式完全一致，仅去掉关闭交互。

**现状问题（代码事实）**

- 输入框胶囊当前固定宽度：`w-36`，见 `context-file-tags/index.tsx`。
- 关闭按钮当前在最右侧独立出现：hover 时 `opacity` 从 0 到 100，位置与左侧 icon 不同。
- 用户消息下方胶囊为另一套样式：
  - 文件引用走 `MessageMetaAttachments`（`packages/ui/src/ai/message/meta-attachments.tsx`）
  - 技能/选区在 `message/index.tsx` 内部单独写样式
- 结果是输入区与消息区视觉不一致，后续维护成本高。

## 方案对比

### 方案 A：最小 CSS 修补（不抽组件）

- 仅在 `FileChip` 改宽度与 hover 逻辑。
- 在 `message/index.tsx` 手工复制一套同款 class。

优点

- 改动小、见效快。

缺点

- 样式重复，后续极易再次漂移。
- 消息侧与输入侧仍是两套实现，不满足“同一事实源”。

### 方案 B：抽离统一胶囊基元（推荐）

- 提炼 `ChatMetaChip` 作为共享展示基元，统一结构与样式。
- 输入框使用 `variant="removable"`；消息使用 `variant="readonly"`。
- 所有文件/技能/选区胶囊都走同一组件，消息区只关闭删除能力。

优点

- 满足你的三条需求且可持续演进。
- 样式单一事实源，维护成本最低。

缺点

- 中等重构量，需要同步改几个消费点与测试。

### 方案 C：上提到 `packages/ui` 做通用组件

- 把胶囊组件做成 UI 包通用能力，PC 引用。

优点

- 最标准化，未来多端复用潜力大。

缺点

- 这次需求偏 PC chat 局部，当前上提成本偏高、评审半径更大。

## 推荐方案（B）

### 1) 统一组件设计

新增共享展示基元（建议放在 `apps/moryflow/pc/src/renderer/components/chat-pane/components/context-file-tags/` 下）：

- `ChatMetaChip`
- 核心 props：
  - `icon: LucideIcon`
  - `label: string`
  - `tooltip?: string`
  - `variant: 'readonly' | 'removable'`
  - `removeLabel?: string`
  - `onRemove?: () => void`
  - `maxWidthClass?: string`（默认最大宽度，比如 `max-w-56`）

### 2) 宽度策略（对应需求 1.1）

把固定 `w-36` 改为：

- `inline-flex w-auto max-w-56 min-w-0`
- 文本 `truncate`

效果

- 短文本更紧凑（自适应）
- 长文本不超出（受最大宽度限制）

### 3) Icon 同位替换策略（对应需求 1.2）

把左侧 icon 位改成固定槽位，hover 时同位切换：

- 默认：显示类型 icon
- hover（仅 removable）：隐藏类型 icon，显示 `X` 按钮
- 技术实现：同一 `size` 容器内两层绝对定位元素切换 `opacity`

效果

- 删除入口与类型 icon 完全同位
- 胶囊整体宽度与布局不变，无抖动

### 4) 消息区复用（对应需求 2）

- `message/index.tsx` 不再手写技能/选区胶囊样式，改用 `ChatMetaChip variant="readonly"`。
- 文件引用展示层建议从 `MessageMetaAttachments` 迁移为 `ChatMetaChip` 列表（file-ref 类型）。
- 图片附件保持现有图片预览样式（非胶囊语义，不纳入本次统一）。

### 5) 改造范围

- `apps/moryflow/pc/src/renderer/components/chat-pane/components/context-file-tags/index.tsx`
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/index.tsx`
- `packages/ui/src/ai/message/meta-attachments.tsx`（若完全迁移 file-ref 渲染，可降级或删除引用路径）
- 对应测试文件：
  - `components/message/index.test.tsx`
  - `components/chat-prompt-input/...` 相关回归测试（确认输入侧仍可删除）

## 验收标准

- 输入框胶囊宽度随内容变化，不再固定宽度；超长文本仍截断。
- 输入框胶囊 hover 后，左侧 icon 同位变成关闭按钮；hover 前后胶囊宽度与文本位置稳定。
- 用户消息下方的“文件引用 / 选中文本引用 / 技能”胶囊与输入框样式一致。
- 消息区胶囊不可删除（无关闭交互）。
- 图片附件展示行为不变。

## 测试策略

- 单元测试
  - `ChatMetaChip`：
    - `readonly` 不渲染删除交互
    - `removable` hover 切换图标/关闭按钮
  - `message/index.test.tsx`：用户消息同时渲染文件 + 选区 + 技能胶囊
- 交互回归
  - 输入框 hover 删除入口可用
  - 发送后输入框选区胶囊立即消失（既有行为不回退）

## 风险与规避

- 风险：消息附件渲染与 UI 包现有 `MessageMetaAttachments` 语义冲突。
- 规避：本次只迁移 file-ref 到统一胶囊；image 保持原 UI，避免破坏图片消息体验。

## 待你确认

- 最大宽度建议值：`max-w-56`（约 224px）是否接受？
- 技能胶囊是否也纳入“完全同款样式”统一（当前方案默认纳入）。
