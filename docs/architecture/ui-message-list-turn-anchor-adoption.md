---
title: Moryflow PC 消息列表交互复用改造方案（TurnAnchor 机制）
date: 2026-02-05
scope: ui
status: active
---

<!--
[INPUT]: Moryflow PC 现有消息列表实现 + @anyhunt/ui 组件库封装现状 + 参考项目 TurnAnchor 交互
[OUTPUT]: 在 @anyhunt/ui 内复刻 assistant-ui 的 TurnAnchor（固定为 top）交互机制与组件分层（不引入依赖），并记录执行清单
[POS]: 消息列表交互复用与组件库演进的执行结果与后续改造规范

[PROTOCOL]: 本文为最终落地文档；如继续调整需同步更新相关 CLAUDE.md 与 docs/CLAUDE.md 索引。
-->

# Moryflow PC 消息列表交互复用改造方案（TurnAnchor 机制）

## 结论（已落地）

- 统一交互：**用户消息固定顶住可视区域顶部**，助手回复在下方展开。
- TurnAnchor 机制 **默认固定为 `top`，不对外暴露配置参数**。
- 完全替换旧方案：移除 `useConversationLayout` 与 `use-stick-to-bottom`，不做历史兼容。
- PC 与 Console 共用同一套 `@anyhunt/ui` 交互层，滚动与布局行为一致。

> 2026-02-05 更新：当前已切换为 **assistant-ui 最新版全量移植** 路线，以下“修复方案/决策”仅保留历史记录；以文末“最新版 assistant-ui 全量移植”章节为最终实现准则。

## 最新决策（2026-02-05）

- **AutoScroll 触发条件改为“内容尾部不可见”**：仅当最后一条 assistant 消息的内容尾部离开视口时才滚动。
- **禁用 `scrollHeight` 作为自动滚动判断**：Slack 占位会抬高 `scrollHeight`，导致“内容仍可见但被强拉到底”的误判。
- **保持 smooth 行为不变**：滚动行为仍为平滑，但改为“需要时才滚”，避免首屏/短内容下坠。

## 本轮排查与执行计划（2026-02-05）

### 排查结论

- **下坠原因**：`thread.runStart` 的滚动在 Slack/min-height 与 ResizeObserver 更新之前完成，`scrollingToBottomBehaviorRef` 被提前清空，导致后续高度变化不再跟随，用户消息出现下坠。
- **无滚动动画**：Viewport 未开启 `scroll-behavior: smooth`，runStart 的 `behavior: auto` 直接变为瞬移。
- **对齐原则**：保持 assistant-ui v0.12.6 基线结构，只在“事件时序”与“平滑滚动”上做最小补齐。

### 执行计划（需逐步同步进度）

| 步骤 | 事项 | 状态 | 完成日期 |
| --- | --- | --- | --- |
| 1 | 在 `useThreadViewportAutoScroll` 增加 **runStart 滚动锁**：滚动完成后跳过一次清空 `scrollingToBottomBehaviorRef`，确保下一次 ResizeObserver 仍能触发对齐，避免 Slack 后置更新导致下坠 | 已完成 | 2026-02-05 |
| 2 | Viewport 增加 `scroll-smooth`（仅影响 `behavior: auto`），恢复“向上滚动动画” | 已完成 | 2026-02-05 |
| 3 | 运行 `pnpm lint` / `pnpm typecheck` / `pnpm test:unit` 并记录结果 | 已完成 | 2026-02-05 |
| 4 | 同步 `packages/ui/CLAUDE.md` / docs 索引，更新本节步骤状态 | 已完成 | 2026-02-05 |

> 执行记录（2026-02-05）：`pnpm lint` / `pnpm typecheck` / `pnpm test:unit` 全部通过；`better-sqlite3` 编译存在上游警告，`turbo` 仍提示 `outputs` 未配置（沿用现状）。

## 最新决策（2026-02-04）

- **不接入 assistant-ui 依赖**：删除直连方案与相关依赖/适配器，只保留“源码级参考”。
- **唯一基线不变**：继续以 assistant-ui 源码为交互基线，在 `@anyhunt/ui` 内复刻结构与职责。
- **runStart 触发下沉到列表层**：通过“新 assistant 消息出现”触发滚动，避免短回复漏滚动。
- **runStart 平滑滚动 + 保持滚动意图**：短内容场景持续锁定底部，避免首轮下坠。
- **runStart 等待 footer inset 就绪**：避免首轮 inset 延迟导致 Slack 回落。
- **ScrollToBottom 规则保留**：仍采用“上滚超过一屏才显示”，不改为 assistant-ui 默认策略。
- **ConversationContent 顶部 padding 由 Header 高度驱动**：通过 CSS 变量动态避让顶部 Header。
- **Slack 计算扣除顶部 padding**：确保用户消息顶到顶部时不被 Header 遮挡。
- **Anchor 高度忽略 0 值回调**：避免首屏高度测量抖动导致下坠。
- **TurnAnchor 调试日志开关**：提供本地开关打印 scroll/Slack 关键指标，便于回归定位。

## 当前问题与修复方案（2026-02-05）

### 现象（问题）

- 用户发送消息后，**第二条用户消息不滚动**，停在中间位置。
- 为了“强制提交期溢出”而绕开 `inset`/`clamp` 后，出现**滚动过头**：用户消息被滚出屏幕顶部。
- 日志显示 `scrollToBottom` 触发，但滚动结果不稳定（与 Slack 计算时机相互干扰）。
- 新对话前 1~2 条消息时，内容从“未溢出”到“刚溢出”会被**强拉到底**，视觉上像消息整体下跌。

### 期望（效果）

- **提交后立即 smooth 滚动**（带动画），用户消息固定在顶部锚点可见。
- AI 回复期间滚动行为保持一致（继续按 TurnAnchor 规则展开）。
- 不再出现“滚过头看不到用户消息”的情况。
- 当消息仍在屏幕内时**不强制滚动**，只有“尾部不可见”时才滚。

### 修复方案（最终版，回归 assistant-ui 基线 + 追加滚动门控）

1. **回退到 assistant-ui 的 Slack 公式**  
   - Slack **只作用于“最后一条 assistant 且上一条为 user”** 的消息。
   - `minHeight = max(0, viewport - inset - clampAdjustment)`，仅保留 userMessage 高度 clamp。
   - 删除提交期专用公式、topPadding/contentSpacing/overflow 修正等自研逻辑。
2. **锚点高度只测“用户消息气泡”**  
   - MessageRoot 内部改为优先测量 `MessageContent`（气泡）高度。
   - 避免 actions/attachments/编辑态等引发的高度变化，导致 Slack 回缩 → 用户消息下跌。
3. **滚动条稳定宽度**  
   - Viewport 添加 `scrollbar-gutter: stable`，防止首轮出现滚动条导致文本换行、气泡高度变化。
4. **AutoScroll 保留 runStart/initialize/threadSwitch/userSubmit**  
   - `userSubmit` 仅负责“用户消息对齐顶部”，不进入尾部跟随。
   - runStart 使用 smooth（由滚动容器平滑行为提供），其他保持 instant。
5. **（兜底，必要时才启用）assistant 占位**  
   - 若 runStart 未及时产生 assistant 消息导致无法滚动，才引入最小化占位。
   - 默认不启用，避免过度设计。
6. **自动滚动改为“内容尾部可见性”**  
   - 在最后一条 assistant 消息内容末尾添加尾部锚点（零高度）。
   - 仅当尾部锚点离开视口时触发滚动；尾部仍可见时不滚动。
   - 避免 `scrollHeight` 被 Slack 占位抬高导致的误判下坠。
7. **用户消息对齐顶部（userSubmit）**  
   - 用户提交新消息时触发一次对齐：将最新 user 消息顶到可视区域顶部（考虑内容 padding）。
   - 解决“用户消息未上滚到顶部”的首屏/短内容场景问题。
   - 对齐后进入“pin until overflow”：尾部仍可见时不滚动；尾部溢出时才恢复自动跟随（instant）。
   - 用户手动滚动立即解除 pin，尊重阅读位置。

### 决策原因

- 现状偏离 assistant-ui 基线，新增提交期公式与事件后，滚动时机变复杂，易产生**过滚/卡顿**。
- 用户消息高度在 runStart 后变化（actions/attachments/滚动条宽度变化）会触发 Slack 回缩，导致**用户消息下跌**。
- 只测气泡高度 + 固定滚动条宽度属于最小差异修复，不引入新状态，仍保持 assistant-ui 的主策略不变。
- 保留“兜底占位”作为第二阶段手段，避免一步过度设计。
- `scrollHeight` 包含 Slack 占位高度，短内容刚溢出时会被误判为“需要滚动到底”，导致首屏大幅下坠。
- 使用“尾部可见性”作为滚动门控，符合“内容仍可见就不滚”的交互预期。
- userSubmit 后先对齐用户消息，再按“溢出才跟随”避免 AI 回复阶段强行拉到底。

## 复盘与二次改造计划（对齐 assistant-ui，2026-02-03）

### 改造原则（强制）

- **唯一基线**：以 `@assistant-ui` 源码实现为准（结构、职责、交互策略），但不引入依赖，仅在 `@anyhunt/ui` 内复刻。
- **零兼容**：不做历史兼容，旧的自研逻辑直接删除。
- **单一职责**：Viewport/Message/Slack/Footer/AutoScroll 严格按 assistant-ui 的职责边界拆分。
- **模块化**：以 primitives + hooks + store 组合，避免跨层耦合与隐式依赖。

### 已暴露的问题（需要修复）

- 用户消息发送后无法自动上滚，最新 1~3 条消息常被压在滚动条下方。
- 发送新消息后滚动存在跳变：Slack 瞬间归零 → 内容瞬移到顶部 → 再滚动回顶部。
- 消息数量变多后滚动动画消失，偶发抖动/闪烁。
- “滚动到底部”按钮位置不稳定：会随列表滚动出现在中间，而不是输入框上方。
- `isAtBottom` 状态切换过于频繁，按钮显隐会干扰滚动行为。

### 参考基线（assistant-ui 源码）

> 基于 `/Users/zhangbaolin/code/me/my-app/node_modules/@assistant-ui/react` 的 Thread/Message 原语实现。

- `primitives/thread/ThreadViewport.tsx` + `useThreadViewportAutoScroll.tsx`：滚动/自动滚动策略基线。
- `primitives/thread/ThreadViewportSlack.tsx`：Slack 注入与 min-height 计算方式。
- `primitives/message/MessageRoot.tsx`：锚点消息高度注册（不在 MessageList 层处理）。
- `utils/hooks/useSizeHandle.ts` + `useOnResizeContent.tsx`：高度测量与内容变化监听。
- `ThreadViewportFooter` + ScrollToBottom 按钮放在 sticky footer 中（绝对定位到输入框上方）。

### 二次改造目标

1. **稳定滚动**：不再出现“间距先消失再回滚”的闪烁与跳动。
2. **一致动画**：滚动策略明确，是否平滑由行为触发，避免随机出现/消失。
3. **按钮稳定**：ScrollToBottom 永远固定在输入框上方，不随消息滚动飘移。
4. **对齐最佳实践**：结构与职责对齐 assistant-ui，减少自研分叉带来的边界问题。

### 改造方案（对齐 assistant-ui 的结构与职责）

#### 1) Viewport Store 与自动滚动对齐

- 将 `useConversationViewportAutoScroll` 重写为 assistant-ui 风格：
  - 引入 `scrollingToBottomBehaviorRef`，避免按钮 disabled 状态切换打断滚动。
  - `handleScroll` 逻辑对齐：仅在必要时更新 `isAtBottom`，忽略“非底部向下滚动”导致的频繁切换。
  - 引入 `useOnResizeContent`（`ResizeObserver` + `MutationObserver`）监听内容变化，流式输出时保持锚定。
- `ConversationViewport` 添加 `scroll-smooth`，仅作用于 runStart 的 `auto` 滚动（初始化仍为 `instant`）。
- `ConversationContent` 补齐 `pt-4`，避免首条消息贴顶造成“被 Header 盖住”的观感。
- 把 `MessageList` 内部的滚动触发迁移为事件驱动：
  - **runStart**：由列表层识别“新 assistant 消息且前一条为 user”触发，避免短回复漏滚动。
  - `threadId` 变化 → 对齐 `threadListItem.switchedTo` 行为。
  - 首次加载消息 → 对齐 `thread.initialize` 行为。

#### 2) Anchor/Slack 迁移到 Message Root

- 参考 `MessageRoot.tsx`：把“锚点用户消息高度注册”从 `MessageList` 移入 Message Root 级别。
- 新增 `ConversationMessageContext`（由 `MessageList` 提供 `message/index/messages`）：
  - User 消息且满足“倒数第二条 + 最后一条是 assistant”时注册高度。
  - Assistant 最后一条消息负责 Slack min-height 注入（不再额外包裹 DOM）。
- `ConversationViewportSlack` 逻辑对齐：
  - 使用 CSS 长度（如 `10em/6em`）而不是固定 px，保持字体缩放一致。
  - `min-height` 直接写入元素样式并订阅 store 变化，避免 React re-render 造成 0 高度空帧。
  - 阻止嵌套 Slack（参考 `SlackNestingContext`）。

#### 3) 高度测量与 ref 管理对齐

- 将 `useSizeHandle` 改为 `useManagedRef` 风格，避免 `useState` 引起的卸载/重新注册。
- ResizeObserver 立即测一次高度，避免初始高度为 0 的闪烁窗口。

#### 4) ScrollToBottom 位置与策略对齐

- `ConversationScrollButton` 移入 `ConversationViewportFooter`，使用 `absolute -top-*` 定位在输入框上方。
- 按钮显隐基于稳定的 `isAtBottom`，避免滚动过程中抖动/闪现。

#### 5) API 保持与迁移策略

- **对外 API 不变**：`MessageList` 不新增 `turnAnchor/autoScroll` 参数，保持“固定 top”约束。
- 内部新增 Context/Hook 不暴露给业务层；业务层继续只负责 `renderMessage`。

### 改造落点（文件级清单）

- `packages/ui/src/ai/conversation-viewport/use-auto-scroll.ts`：对齐 assistant-ui 自动滚动策略。
- `packages/ui/src/ai/conversation-viewport/use-size-handle.ts`：替换为 `useManagedRef` 风格。
- `packages/ui/src/ai/conversation-viewport/slack.tsx`：改为订阅式 min-height 注入。
- `packages/ui/src/ai/message/base.tsx`（或新增 `message/root.tsx`）：承载 anchor/slack。
- `packages/ui/src/ai/message-list.tsx`：提供消息上下文，并在列表层触发 runStart（新 assistant 消息出现）。
- `packages/ui/src/ai/conversation.tsx`：ScrollButton 迁移到 Footer。
- `apps/moryflow/pc` / `apps/anyhunt/console`：无 API 变更，仅验证视觉与交互。

### 验收标准（新增）

- 发送新消息后，**无闪烁/跳变**，Slack 高度稳定。
- 滚动到底部动画 **可预测**（用户触发时 smooth，自动保持时 instant）。
- ScrollToBottom 永远出现在输入框上方，不随列表滚动。
- `isAtBottom` 不再抖动，按钮显隐稳定。

### 执行清单（2026-02-04）

| 步骤 | 事项 | 状态 | 完成日期 |
| --- | --- | --- | --- |
| 1 | 删除 assistant-ui 直连方案文档与索引引用 | 已完成 | 2026-02-04 |
| 2 | 移除 assistant-ui 依赖与 adapter 文件 | 已完成 | 2026-02-04 |
| 3 | 列表层触发 runStart + MessageRoot 清理 | 已完成 | 2026-02-04 |
| 4 | 更新 UI 单测（MessageList/MessageRoot） | 已完成 | 2026-02-04 |
| 5 | 更新 CLAUDE 与调研文档引用 | 已完成 | 2026-02-04 |
| 6 | 运行 `pnpm lint` / `pnpm typecheck` / `pnpm test:unit` | 已完成 | 2026-02-04 |
| 7 | runStart 平滑滚动 + 保持滚动意图 + 顶部 padding 提升 | 已完成 | 2026-02-04 |
| 8 | runStart 等待 footer inset + Header 高度变量 + 调试日志 | 已完成 | 2026-02-04 |

### 测试建议

- UI 单测：Slack min-height 计算 + 消息锚点注册条件。
- 交互回归：发送消息/流式输出/滚动历史/切换线程/输入区高度变化。
- Console 与 PC 双端对齐验证（同一交互体验）。
- 调试日志：`localStorage.setItem('anyhunt:turn-anchor-debug','1')` 或 `window.__ANYHUNT_TURN_ANCHOR_DEBUG__ = true`。

### 逐文件删除清单（强制）

> 目标：删除所有非 assistant-ui 风格的自研滚动/锚点/Slack 逻辑与冗余封装。

- `packages/ui/src/ai/message-list.tsx`
  - 删除：`AnchorUserMessage` wrapper、`ConversationViewportSlack` 包裹、基于 `status/threadId/messages` 的滚动 `useEffect`。
  - 删除：`showScrollButton` 在列表内的绝对定位按钮（迁移到 Footer）。
- `packages/ui/src/ai/message/root.tsx`
  - 删除：runStart 触发逻辑（改由列表层事件驱动）。
- `packages/ui/src/ai/conversation-viewport/use-auto-scroll.ts`
  - 删除：当前 `handleScroll` 简化逻辑与 `useEffect` 滚动触发。
  - 删除：依赖 `isAtBottom` 立即滚动的副作用（改为内容变化驱动）。
- `packages/ui/src/ai/conversation-viewport/use-size-handle.ts`
  - 删除：`useState` + `useEffect` 注册模式（改为 managed ref）。
- `packages/ui/src/ai/conversation-viewport/slack.tsx`
  - 删除：React render 时计算 `minHeight`（改为订阅 store 写 style）。
  - 删除：固定 px clamp（改为 CSS length + 解析）。
- `packages/ui/src/ai/conversation.tsx`
  - 删除：ScrollButton 在 viewport 内 absolute 定位逻辑（迁移到 Footer）。
- `packages/ui/src/ai/message/base.tsx`（或新增 `message/root.tsx` 后替换）
  - 删除：任何在 MessageList 层处理 anchor/slack 的逻辑依赖。

### 迁移步骤（对齐 assistant-ui）

1. **引入基础 Hooks（对齐 assistant-ui utils）**
   - 新增 `useManagedRef`、`useOnResizeContent`、`useOnScrollToBottom`（命名可调整但保持职责一致）。
   - `useSizeHandle` 切换为 managed ref 模式。

2. **改造 Viewport AutoScroll**
   - `useConversationViewportAutoScroll` 完整对齐 `useThreadViewportAutoScroll`：
    - 维护 `scrollingToBottomBehaviorRef`。
    - 引入 `ResizeObserver + MutationObserver` 的内容变化监听。
    - `handleScroll` 逻辑对齐：仅在允许的条件下更新 `isAtBottom`。
    - `runStart/initialize/threadSwitch` 由列表层事件驱动触发，Viewport 仅负责响应滚动。

3. **迁移 Anchor/Slack 到 Message Root**
   - 新增 `ConversationMessageContext`，由 `MessageList` 注入 `message/index/messages`。
   - `MessageRoot` 接管：
     - Anchor 用户消息高度注册（倒数第二条 + 最后一条是 assistant）。
     - Slack 只在最后一条 assistant 上启用（嵌套保护）。

4. **ScrollToBottom 放入 Footer**
   - `ConversationViewportFooter` 设 `relative`。
   - ScrollButton 改为 footer 内部 `absolute -top-*`，位置固定在输入框上方。

5. **移除旧逻辑与清理**
   - 删除 MessageList 内 `useEffect` 滚动触发。
   - 删除 Slack wrapper、Anchor wrapper。
   - 清理无用 import、类型与测试用例。

---

## 最新问题排查与计划（2026-02-05）

### 背景

- 用户反馈：**最新接入后用户消息不再上滚**，滚动体验明显变差。
- 此前实现基于 `@assistant-ui/react@0.10.50` 的局部移植，现已同步至 `@assistant-ui/react@0.12.6`。

### 目标

- 完全对齐 **最新版本** `@assistant-ui/react` 的 Thread/Message 行为。
- 确保用户消息提交后滚动行为恢复正常（可见、可预测、不卡住）。
- 若仍异常，提供可控日志开关用于精准定位。

### 执行计划（滚动排查 & 最新版同步）

| 步骤 | 事项 | 状态 | 备注 |
| --- | --- | --- | --- |
| 1 | 拉取 `@assistant-ui/react@latest` 源码并对照 Thread/Message 实现差异 | 已完成 | 已确认最新版本 `0.12.6` |
| 2 | 按最新版同步 `packages/ui/src/ai/assistant-ui/**` 与适配层（viewport/message-list/root） | 已完成 | 已对齐 v0.12.6 store/viewport/auto-scroll/Slack/size handle |
| 3 | 增加可控调试日志开关（仅在本地/显式开启时打印） | 已完成 | 追加 aui-event 触发日志（anyhunt:turn-anchor-debug） |
| 4 | 更新/补齐 UI 单测覆盖新的滚动行为 | 已完成 | 新增 viewport 高度注册与 aui-event 测试 |
| 5 | 执行 lint/typecheck/test:unit + PC/Console 手动回归 | 进行中 | lint/typecheck/test:unit 通过；手动回归待确认 |

6. **验证与收敛**
   - 通过 UI 单测与交互回归。
   - 若仍需微调，仅允许在 assistant-ui 基线范围内调整参数（如 clamp 值），禁止引入新机制。

### 具体改造顺序（可执行）

1. `packages/ui/src/ai/conversation-viewport/use-size-handle.ts`
2. `packages/ui/src/ai/conversation-viewport/use-auto-scroll.ts`
3. `packages/ui/src/ai/conversation-viewport/slack.tsx`
4. `packages/ui/src/ai/message`（新增 `MessageRoot` 或改造 `base.tsx`）
5. `packages/ui/src/ai/message-list.tsx`（注入 MessageContext，删除 wrapper）
6. `packages/ui/src/ai/conversation.tsx`（ScrollButton 迁移到 Footer）
7. `apps/moryflow/pc` + `apps/anyhunt/console` 仅验证（无 API 变更）
8. `packages/ui/test` 补齐/更新（锚点注册 + Slack min-height + auto-scroll）

> 说明：以下内容为 2026-02-02 已落地方案的原始记录，保留作为历史基线与对照。

## 背景（旧实现问题）

旧的 Moryflow PC 消息列表依赖 `useConversationLayout` 的 placeholder + minHeight 占位方案，并通过 `use-stick-to-bottom` 管理滚动。这导致：

- 交互逻辑分散在 UI/业务层多个位置，难以复用。
- 占位/滚动策略耦合 Message 渲染，单一职责被破坏。
- Console 无法无损复用，交互体验不一致。

## 设计目标（最佳实践）

1. **UI 纯粹**：滚动/布局逻辑集中在 `@anyhunt/ui`，业务层只负责内容渲染与行为注入。
2. **单一职责**：Message 组件保持纯内容渲染，测量/锚定由内部 wrapper 负责。
3. **模块化**：Viewport/Slack/Footer/ScrollButton 各司其职，可单独测试与维护。
4. **错误边界明确**：DOM 不存在、ResizeObserver 不可用时安全降级。
5. **不做历史兼容**：旧占位策略与依赖全部删除。

## 交互机制（TurnAnchor=top，固定默认）

### 机制核心

- **Anchor User Message**：在 MessageList 内部包裹“最后一条用户消息”（当最后一条是 assistant 时），测量其高度。
- **Slack 补位**：对最后一条 assistant message 注入 `min-height`，保证滚动到底部时用户消息顶住顶部。
- **Viewport Store**：统一维护 `viewport`、`inset`、`userMessage` 高度与 `isAtBottom` 状态。

### Slack 计算公式（逻辑说明）

```
minHeight = max(0, viewportHeight - insetHeight - clamp(userMessageHeight))
clamp: userMessageHeight <= 160 ? userMessageHeight : 96
```

> 这样在“滚动到底部”时，最后一条用户消息稳定位于顶部，assistant 内容在下方自然展开。

## 组件分层（职责清单）

- `ConversationViewport`：滚动容器 + Viewport Provider（不对外暴露 TurnAnchor 配置）。
- `ConversationViewportFooter`：测量底部输入区高度（inset）。
- `ConversationViewportSlack`：对最后一条 assistant message 注入补位高度。
- `useConversationViewportAutoScroll`：维护 `isAtBottom` 与滚动监听。
- `ConversationScrollButton`：基于 `isAtBottom` 的“滚动到底部”按钮。
- `MessageList`：内部 wrapper 负责 anchor/slack，业务层只提供 `renderMessage`。

## 使用方式（示例）

```tsx
<MessageList
  messages={messages}
  status={status}
  threadId={threadId}
  emptyState={{ title: t('waitingForYou'), description: t('startChatPrompt') }}
  footer={<ChatFooter />}
  renderMessage={({ message, index }) => (
    <ChatMessage message={message} messageIndex={index} status={status} />
  )}
/>
```

> 不再需要 `turnAnchor` 或 `autoScroll` 参数；交互行为固定为默认方案。

## 滚动策略（统一）

- **默认不强制跟随**：仅当 `isAtBottom=true` 时跟随新增内容。
- **发送新消息**：状态进入 `submitted` 时滚动到底部。
- **线程切换**：`threadId` 变化时滚动到底部。
- **窗口/底部输入区变化**：在 `isAtBottom=true` 时保持锚定。

## 错误边界与安全降级

- DOM ref 为空时不触发测量或滚动。
- `ResizeObserver` 不可用时仅做一次高度测量。
- 任何测量失败都回退为高度 0，不阻断渲染。
- 监听与 observer 在卸载时清理，避免内存泄漏。

## 落地清单（已完成）

- 新增 `ConversationViewport` 系列 primitives 与 Store（Zustand）。
- MessageList 内部完成 anchor/slack 逻辑，移除占位方案。
- PC/Console 均迁移到 MessageList + Viewport 交互体系。
- 删除 `useConversationLayout` 与 `use-stick-to-bottom` 依赖。
- 补齐 UI 单测：Slack minHeight 行为。

## 验收标准

- 新消息发送后，用户消息稳定停在可视区域顶部。
- 流式输出期间仅在 `isAtBottom=true` 时跟随更新。
- 手动滚动历史消息后，不被强制拉回底部。
- 输入区高度变化/窗口缩放时无明显跳动。

## 执行计划（已完成，可追踪）

1. [x] **设计与接口定稿**：明确 TurnAnchor 默认固定为 top，且不对外暴露配置。
2. [x] **UI Store 落地**：新增 Viewport Store（viewport/inset/userMessage/isAtBottom）。
3. [x] **基础 primitives 落地**：实现 Viewport/Footer/Slack/ScrollButton。
4. [x] **Message 接入高度注册**：MessageList 内部 wrapper 负责 anchor 测量。
5. [x] **MessageList 升级**：切换到 Viewport/Slack 机制并删除占位逻辑。
6. [x] **Moryflow PC 迁移**：ConversationSection 切换到新 MessageList + Footer 注入。
7. [x] **Console 迁移**：AgentMessageList 切换到新 MessageList 交互。
8. [x] **测试补齐**：新增 Slack minHeight 单测。
9. [x] **依赖清理**：移除 `use-stick-to-bottom`，引入 Zustand。
10. [x] **文档同步**：更新 CLAUDE.md 与架构说明。

## 最新版 assistant-ui 全量移植（进行中，2026-02-05）

### 任务背景

- 现有滚动修复多次调整仍出现下坠/抖动。
- 需要**完全对齐 assistant-ui 最新版**的 Thread/Message primitives，避免自研偏差。
- 本任务以“直接移植 + 适配层包装”为准，禁止继续叠加自研滚动补丁。

### 执行计划（逐步同步进度）

1. [x] **确认最新版 assistant-ui 版本**：`@assistant-ui/react@0.12.6`（npm，2026-02-05）。
2. [x] **拉取核心源码**：ThreadViewport/useThreadViewportAutoScroll + 相关 hooks（已拷贝至 `packages/ui/src/ai/assistant-ui/`）。
3. [x] **新增镜像目录**：在 `packages/ui/src/ai/assistant-ui/` 保留原样实现与来源注释。
4. [x] **替换现有 primitives**：ConversationViewport/MessageRoot/MessageList 对齐 assistant-ui v0.12.6（恢复 Slack/size handle/aui-event，API 形状不变）。
5. [x] **桥接样式与布局**：仅在 wrapper 层处理 padding/header/footer，不改核心滚动逻辑。
6. [x] **更新/移除单测**：以 assistant-ui 行为为准，删除自研滚动补丁相关断言。
7. [x] **同步文档与 CLAUDE**：记录移植范围、关键差异与后续约束。
8. [x] **全量校验**：运行 `pnpm lint` / `pnpm typecheck` / `pnpm test:unit`。
