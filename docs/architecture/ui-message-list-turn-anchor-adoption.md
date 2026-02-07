---
title: Moryflow PC 消息列表交互复用改造方案（TurnAnchor 机制）
date: 2026-02-07
scope: ui
status: active
---

<!--
[INPUT]: Moryflow PC 现有消息列表实现 + @anyhunt/ui 组件库封装现状 + assistant-ui 行为基线
[OUTPUT]: 记录当前落地状态、当前分支目标、未来需求与未完成事项
[POS]: TurnAnchor 交互复用与滚动行为的最新现状/交接入口

[PROTOCOL]: 本文为当前阶段的最终状态说明；后续变更需同步更新 docs/architecture/CLAUDE.md 与 docs/CLAUDE.md。
-->

# Moryflow PC 消息列表交互复用改造方案（TurnAnchor 机制）

## 当前现状（已落地）

- 交互基线：TurnAnchor 固定为 `top`，用户消息固定顶住可视区域顶部，助手在下方展开。
- 结构对齐：Conversation/Viewport/Slack/AutoScroll 与 assistant-ui v0.12.6 对齐，组件职责已拆分到 `@anyhunt/ui`。
- 滚动稳定性：
  - runStart/initialize/threadSwitch 事件驱动自动滚动。
  - runStart 触发时机：ChatStatus 进入 running（`submitted`/`streaming`）即触发，确保 user submit 立即对齐。
  - runStart 支持滚动锁，避免 Slack/min-height 更新后下坠。
  - TurnAnchor=top：runStart smooth 到底后立刻释放 scrollBehavior，避免 streaming 期间被 resize.behavior 持续追底。
  - runStart 在测量未就绪时延后滚动，避免短列表抖动。
  - 用户上滚时立即取消 runStart 自动滚动，避免手动滚动抖动。
  - AI 跟随：assistant 尾部不可见才 instant 跟随；上滑超过 10px 取消；ScrollButton/滚到底部恢复。
  - Viewport 使用 `scrollbar-gutter: stable`，避免滚动条引发换行抖动。
- 可视区遮挡：
  - ConversationContent 顶部 padding 使用 CSS 变量（Header 高度透传）。
  - Slack 计算扣除顶部 padding，避免用户消息被 header 遮挡。
- 滚动按钮：
  - ScrollButton 基于 `distanceFromBottom` 阈值显示（默认 200px）。

## 当前分支目标（docs/turn-anchor-adoption）

- 将 Moryflow PC 与 Anyhunt Console 统一到 `@anyhunt/ui` 的 TurnAnchor 交互层。
- 复刻 assistant-ui 的 primitives 与职责划分，减少自研分叉。
- 解决“短列表下坠/抖动/遮挡/按钮误显”的交互问题。
- 已落地 AI 跟随行为最小可行实现（tail 门控 + 10px 取消/恢复）。

## 未来需求（需求方口径）

- AI 回复仅在“尾部不可见”时才自动跟随；尾部仍可见时不滚动。
- 跟随触发应尽量贴近 footer/input（误差 <= 1px）：避免“尾部仍有明显空隙就开始滚动”的提前滚动观感。
- 用户上滑超过 10px 本轮不再跟随，尊重阅读位置。
- 保留 runStart 的平滑滚动动画（不回退为 instant）。
- 交互与逻辑保持模块化、单一职责；不做历史兼容，无用逻辑直接删除。
- 调试日志当前默认开启（按需求方要求）；稳定后如需可再回收为默认静默。

## 协作行为准则（需求方已确认）

- 为了最佳实践与可维护性，允许对 TurnAnchor 相关模块进行破坏性重构（不考虑历史兼容）。
- 优先模块化与单一职责；无用代码可以直接删除。
- 变更必须同步更新相关文档（CLAUDE.md 与本文件），并补齐单元测试。

## 未完成 / 待验证

- 验证 AI 跟随“触发时机与延迟”是否符合预期（尾部不可见即触发）。
- 验证 runStart 平滑滚动与 AI 跟随的时序不会互相打架（避免先下坠再上滚）。
- 已知问题：runStart smooth 过程中仍偶现 `scrollHeight` 固定 `-20px` shrink（疑似 gap/padding-bottom 口径在某一帧取到 0），会带来轻微闪烁/提前滚动观感。
- 若仍有延迟/抖动：补充尾部可见性对 footer/inset 遮挡的修正判定。
- 验证取消/恢复门槛是否符合预期（上滑 >10px 取消；ScrollButton/滚到底部恢复）。

### 临时日志采样（默认开启）

为便于定位“无操作抖动 / 发送消息瞬间回弹 / 提前滚动”等边界问题，AutoScroll 当前默认输出控制台日志（不需要设置开关）。

输出格式：`[aui:auto-scroll <seq> t=<ms>] <event> <data?>`

> 说明：该日志用于排查阶段；稳定后可回收为默认静默，避免长期刷屏。

### 修复进展（2026-02-06）

- 修复“无操作抖动/提前跟随”的两个核心根因：
  - tail 可见性判定改为优先使用 `footerRect.top` 作为可视区底边界，并将 tail 判定口径放宽为 `tailRect.top <= visibleBottom`（满足“尾部完全可见就不滚动”的预期）。
  - 忽略 layout shrink（`scrollHeight` 下降/`clientHeight` 上升）导致的 `scrollTop` 回退，避免误判为“用户上滚”从而触发 cancel/abort。
  - tail sentinel 放置在 TurnTail slack spacer 之前：tail 可见性只代表“实际内容尾部”，不会因为 slack 空白区而提前触发跟随。
- 修复 initialize/threadSwitch 与 runStart 的 scroll 竞争：initialize/threadSwitch 的 rAF 回调在检测到已存在滚动行为时直接跳过，避免覆盖 runStart smooth。
- 已补齐回归单测（`packages/ui/test/conversation-viewport.test.tsx`）：边界可见性、layout shrink 回退不 cancel、initialize 不覆盖 runStart。
- 追加修复“user submit 间隙全量跌落”：引入稳定 TurnTail Slack 宿主（列表尾部固定容器），避免 slack 断档导致 scrollTop clamp。

### 修复进展（2026-02-07）

- 修复“最后一条 user 未贴顶 / runStart 触发过晚”：`thread.runStart` 改为基于 `status` 进入 running 触发（不再依赖“新 assistant 消息出现”）。
- 修复“runStart 无动画 / 贴顶对齐不稳定”：TurnAnchor=top 的 runStart 恢复 `behavior='auto'` 的 smooth 对齐（依赖 `scroll-smooth`），并沿用“到达 bottom 后立刻释放 scrollBehavior”策略。
- runStart defer align：测量未就绪时仅标记 pending，待 ResizeObserver 就绪后再启动 smooth runStart，避免“先下坠再上滚”。
- 修复“runStart 贴顶偏移/无动画（短列表）”：TurnTail slack 计算额外扣除 `ConversationContent` 的 `row-gap` 与 `padding-bottom`，避免短列表产生额外 overflow 让 runStart 先滚掉顶部 padding。
- 修复“固定 20px 回弹/闪烁”：将 `ConversationContent` 的 `gap/padding-bottom` 改为 CSS 变量单一数据源（默认 `4px/16px`），TurnTail slack 计算只读取变量（优先 inline style），避免 computedStyle 在渲染初期短暂取到 0 导致 `scrollHeight` 先大后小，从而触发 scrollTop clamp 回弹。

> 说明：AI 跟随仍保持 instant（`resize.follow`），runStart 保持 smooth（`event.runStart.pending` / `event.runStart.deferAlign`），两者通过 `scrollingToBottomBehaviorRef` 做时序隔离。

### 线上反馈（已定位，待验证）

> 说明：本段记录“现象/定位/修复点”；修复已落地，仍需手动验证。
> 若仍复现，请继续使用下方临时日志采样。

- 问题 1：无操作抖动
  - 现象：用户刚发送消息（streaming 之前），未进行任何滚动操作，视口会自己轻微跳动（先向下/再回弹）。
  - 预期：除 runStart smooth 外不应出现额外 scrollTop 变化。
  - 定位：`resize.follow` 在“已到底部（distanceFromBottom=0）”的情况下仍被误触发，导致 programmatic `scrollToBottom('instant')` 与后续布局收缩回弹叠加。
  - 修复：修正 tail 可见性判定口径（以 `footerRect.top` 为准，见下文定义），并过滤 layout shrink 导致的 `scrollTop` 回退（不视为用户上滚）。
- 问题 2：尾部完全可见但仍跟随滚动
  - 现象：assistant 尾部肉眼可见（未被 footer 遮挡），仍触发跟随滚动。
  - 预期：仅当 tail sentinel 不可见时才触发 `scrollToBottom('instant')`。
  - 定位：tail 可见性边界过严（sub-pixel / 1px sentinel 边界）+ 仅基于 inset 推导可视区底边界，导致“尾部仍可见”被判成不可见。
  - 修复：可视区底边界改为优先使用 `footerRect.top`，tail 判定放宽为 `tailRect.top <= visibleBottom`（含 epsilon）。

- 问题 3：user submit 间隙全量跌落（scrollTop clamp）
  - 现象：发送用户消息后一瞬间，视口会先跳到顶部（历史消息“跌落下来”），随后再滚回到当前轮。
  - 预期：user submit 不应引发一次 “scrollTop→0” 的回退；只保留 runStart smooth。
  - 定位：
    - 旧实现将 TurnAnchor=top 的 slack(min-height) “挂在某条 message root 上”（仅最后一条 assistant 且上一条是 user）。
    - 当用户提交新消息后：上一轮 assistant 不再满足条件 → slack 样式被清空；而新一轮尚未创建 assistant → slack 在一次 React commit 内出现断档。
    - slack 断档会让 `scrollHeight` 在某一帧瞬时收缩到 `clientHeight` 附近，浏览器把 `scrollTop` clamp 到 0；随后 auto-scroll 又把它拉回，形成“全量跌落 + 再滚回”的可见抖动。
  - 修复：
    - 引入 `ConversationViewportTurnTail` 作为**唯一** slack 宿主（始终渲染在列表尾部），避免宿主切换。
    - 当最后一条是 assistant（且位于最后一条 user 之后）时，将该 assistant message 渲染到 TurnTail 内，使 min-height 与内容合并计算（避免双倍叠加）。
    - 当最后一条是 user（assistant 尚未创建）时，TurnTail 仍保持 min-height，占位稳定 scrollHeight，避免 clamp。
    - TurnTail 内置 `data-slot="conversation-tail"` sentinel，slack 通过 min-height 产生在 sentinel 之后，不干扰尾部可见性判定。

### 排查方案（临时日志，不改行为）

- 落点：`packages/ui/src/ai/assistant-ui/primitives/thread/useThreadViewportAutoScroll.tsx`
- 手段：临时加入 `console.log`（前缀 `[aui:auto-scroll seq t=...]`），用于定位“是谁在改 scrollTop”。
- 采样点：
  - `thread.runStart`（含 rAF 回调）
  - 每次 `scrollToBottom`（标注 reason：`event.runStart.raf` / `resize.behavior` / `resize.follow` / `event.scrollToBottom`…）
  - `handleScroll`（仅在 runStart/跟随期间输出 delta 与关键状态）
  - `follow.check`（仅在判定 tail 不可见、即将触发跟随时输出：viewport/tail/footer rect + inset + visibleBottom）
- 复现方式（Moryflow PC）：打开 DevTools Console → 发送消息 → 在 streaming 前后观察日志；无需手动滚动。
- 输出物：复制所有 `[aui:auto-scroll` 开头的日志给维护者。
- 清理：问题定位并修复后，必须删除这些临时日志，恢复默认静默。

## AI 跟随实现方案（已落地，待验证）

> 目标：在 TurnAnchor=`top` 模式下，实现“仅在 assistant 尾部不可见时才滚动跟随；用户上滑 >10px 取消本轮跟随”，且不破坏现有 runStart smooth 时序。

### 设计原则

- 最小复杂度：只增加 1 个可解释的门控（tail 可见性）与 1 个取消条件（用户上滑阈值）。
- 单一职责：runStart 仍由既有事件驱动负责；AI 跟随仅负责“流式内容增长时的尾部可见性维持”。
- 不做历史兼容：不保留旧逻辑分支。
- 调试日志当前默认开启（按需求方要求）；稳定后如需可回收为默认静默。

### 核心定义

- **assistant 尾部**：当前线程的“内容尾部 sentinel”（默认放在最后一条消息之后，用于代表 assistant 输出的末端）。
- **尾部可见**：tail sentinel 在 Viewport 的“消息可视区域”内（含边界）。
  - `visibleBottom`（消息可视区底边界）优先使用 `footerRect.top`（避免 inset 推导误差）；若 footer 不可用，则使用 `viewportRect.bottom - insetBottomPx`。
  - 判定口径：`tailRect.top <= visibleBottom + ε`（ε≈0.5px，用于消除 sub-pixel 误差；避免边界误触发跟随）。
- **取消跟随阈值**：用户主动上滑导致 `scrollTop` 相对本轮达到的最大值回退超过 `10px`。

### 方案概览（实现路径）

1. **增加 tail sentinel**（无样式/不影响布局）
   - 落点：`packages/ui/src/ai/message-list.tsx`
   - 在 `ConversationContent`（消息列表内容）末尾追加一个仅用于测量/判定的元素，例如：
     - `data-slot="conversation-tail"`
     - `aria-hidden`
     - 高度建议 1px（避免 0 高度导致不可测）

2. **新增尾部可见性判定工具函数**（可单测）
   - 落点建议：`packages/ui/src/ai/conversation-viewport/`（或 `assistant-ui/utils/`）
   - 输入：`viewportEl`、`tailEl`、`insetBottomPx`
   - 输出：`isTailVisible: boolean`
   - 只使用 `getBoundingClientRect()`，避免引入 `IntersectionObserver` 及其额外 polyfill/mock 成本。

3. **在 auto-scroll 内加入“tail 可见性门控”的跟随逻辑**
   - 落点：`packages/ui/src/ai/assistant-ui/primitives/thread/useThreadViewportAutoScroll.tsx`
   - 新增 3 个 refs（仅在 hook 内部，不进 store）：
     - `followEnabledRef`：是否允许本轮跟随（runStart 时置 true）
     - `followCanceledRef`：是否已被用户取消（上滑超过阈值置 true）
     - `maxScrollTopRef`：本轮到达过的最大 `scrollTop`（用于 10px 阈值）
   - 状态迁移：
     - `thread.runStart`：`followEnabledRef=true`、`followCanceledRef=false`、`maxScrollTopRef=div.scrollTop`
     - `scroll`：若用户上滑且 `maxScrollTopRef - div.scrollTop > 10` → `followCanceledRef=true`
   - 跟随触发（内容变化时）：
     - 仅在以下条件同时成立时触发 `scrollToBottom('instant')`：
       - `turnAnchor === 'top'`
       - `followEnabledRef === true && followCanceledRef === false`
       - tail **不可见**
       - **不处于 runStart smooth 过程**（`scrollingToBottomBehaviorRef.current === null`，避免时序打架）
     - 若测量未就绪（`height.viewport <= 0 || height.userMessage <= 0`）则直接跳过（复用既有 runStart defer 思路）。

4. **取消与本轮恢复（用户态）**

- 取消：用户上滑超过 10px → `followCanceledRef=true`（本轮不再自动跟随）。
- 恢复：用户点击 ScrollButton 或手动滚到底部（`isAtBottom=true`）→ `followCanceledRef=false`（本轮恢复跟随）。

5. **与 runStart 的时序隔离（避免打架）**

- runStart 仍保持现有 `scrollToBottom('auto')`（依赖 `scroll-smooth` 实现平滑动画）。
- AI 跟随默认使用 `instant`：
  - 目的：避免每个 token 都触发 smooth 动画导致拖影/延迟；并减少与 runStart smooth 的交错。
- 当用户在 runStart 动画期间主动上滑：沿用现有“立刻取消 runStart 自动滚动”逻辑，同时应将本轮 `followCanceledRef=true`，避免后续被又拉回去。

### 单测与验证清单

- 单测（Vitest + Testing Library，优先放在 `packages/ui/test/`）：
  - tail 可见：Resize/Mutation 触发时 **不** 调用 `scrollTo`。
  - tail 不可见：触发时调用一次 `scrollTo({ top: scrollHeight, behavior: 'instant' })`。
  - 用户上滑 `9px`：不取消跟随；上滑 `11px`：取消跟随。
  - runStart 期间：不触发 tail 跟随（仅 runStart smooth 生效）。
- 手动验证（Moryflow PC + Anyhunt Console）：
  - 流式输出时：尾部可见不滚；尾部不可见才跟随。
  - 上滑超过 10px 后：本轮不再跟随；ScrollButton 行为不受影响。

### 已确认决策（2026-02-06）

1. 取消跟随允许“本轮恢复”：点击 ScrollButton / 滚到底部后恢复。
2. tail sentinel 放置：优先放在 `MessageList` 内容末尾（最佳实践：列表级 sentinel，避免 message 组件侵入）。
3. 取消跟随阈值：用户上滑超过 `10px`。

## 验证记录

- 2026-02-06：落地 TurnAnchor=top AI 跟随（tail 可见性门控 + 上滑 10px 取消 + ScrollButton/滚到底部恢复）并补齐单测；`pnpm lint / pnpm typecheck / pnpm test:unit` 全部通过；`better-sqlite3` rebuild 仍有上游编译 warning（沿用现状）。
- 2026-02-07：runStart 触发改为 status→running（`submitted`/`streaming`）并恢复 TurnAnchor=top runStart smooth；`pnpm lint / pnpm typecheck / pnpm test:unit` 全部通过。

## 关键实现入口

- `packages/ui/src/ai/assistant-ui/primitives/thread/useThreadViewportAutoScroll.tsx`
- `packages/ui/src/ai/conversation-viewport/viewport.tsx`
- `packages/ui/src/ai/conversation-viewport/turn-tail.tsx`
- `packages/ui/src/ai/message/root.tsx`
- `packages/ui/src/ai/message-list.tsx`
- `packages/ui/src/ai/message-list.tsx`
- `packages/ui/src/ai/conversation.tsx`
- `apps/moryflow/pc/src/renderer/components/chat-pane/index.tsx`
