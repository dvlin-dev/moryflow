---
title: Moryflow PC TurnAnchor 滚动问题调研与进度跟踪
date: 2026-02-05
scope: ui
status: active
---

<!--
[INPUT]: Chat Pane 滚动异常反馈 + TurnAnchor(top) 交互目标 + assistant-ui 基线实现
[OUTPUT]: 问题清单、复现条件、调研结论与推荐方案（待审核）
[POS]: Moryflow PC 消息列表滚动问题的跟踪与可执行修复路径

[PROTOCOL]: 本文为调研与进度跟踪文档；每次结论更新需补充“更新日志”与“核对日期”。
-->

# Moryflow PC TurnAnchor 滚动问题调研与进度跟踪

## 目标（必须满足）

1. **用户消息顶住顶部**：发送后自动滚动到“用户消息顶住顶部”的稳定位置。
2. **AI 回复不下坠**：AI 流式返回过程中，用户消息不会再次下坠或抖动。
3. **滚动曲线自然**：用户主动触发时为 smooth，自动保持时为 instant；不出现随机闪现/抖动。
4. **按钮稳定**：ScrollToBottom 仅在用户上滚超过一屏后显示，位置固定在输入框上方。
5. **对齐基线**：结构与交互完全对齐 `@assistant-ui`（thread/message/viewport）。

## 执行规范（必须遵守）

- **修改位置**：只在 `~/code/me/moryflow` 的 `docs/turn-anchor-adoption` 分支修改。
- **禁止路径**：不得在 `/Users/zhangbaolin/.codex/worktrees/deb4/moryflow` 内修改或提交。

## 现象清单（进度跟踪）

| 编号 | 问题                                            | 复现条件                      | 当前状态 | 备注                               |
| ---- | ----------------------------------------------- | ----------------------------- | -------- | ---------------------------------- |
| P0-1 | 用户消息先滚到顶部，AI 回复后下坠（约 20~30px） | 新会话前 1~3 条消息最容易出现 | 待回归   | 消息多时缓解，消息少时复现         |
| P0-2 | 用户消息滚到顶部时出现闪烁/抖动                 | 发送消息后 + AI 流式返回      | 仍存在   | 消息少时更明显                     |
| P0-3 | 无法向上滚动（上滚立即拉回）                    | AI 流式期间                   | 待回归   | AutoScroll 意图未清理              |
| P1-1 | 消息被 header 遮挡                              | 首条消息或 header 高度变动时  | 待确认   | 严格对齐 assistant-ui 后需重新回归 |
| P1-2 | ScrollToBottom 按钮时机/位置异常                | 上滚时偶发                    | 待确认   | 需验证距离阈值与显示策略           |
| P2-1 | loading 形态不一致                              | AI 返回前                     | 已修复   | 统一 loading icon                  |
| P2-2 | 刷新后最后一条消息丢失                          | 刷新页面                      | 已修复   | 需要持续回归                       |

> 核对日期：2026-02-05

## 复现步骤（稳定可复现）

1. 新建会话，发送 1 条消息。
2. 观察用户消息是否顶住顶部。
3. 等待 AI 回复开始流式输出，观察用户消息是否出现下坠或抖动。
4. 连续发送 2~3 条消息，重复以上观察。

## 基线对齐（assistant-ui 参考）

**参考路径**：`/Users/zhangbaolin/code/me/my-app/node_modules/@assistant-ui/react`。

- `primitives/thread/ThreadViewport.tsx` + `useThreadViewportAutoScroll.tsx`
- `primitives/thread/ThreadViewportSlack.tsx`
- `primitives/message/MessageRoot.tsx`
- `utils/hooks/useOnResizeContent.ts`

当前项目与基线的关键差异：

1. **占位消息**：MessageList 内插入 “thinking placeholder”，assistant-ui 不插入占位。
2. **滚动触发**：MessageList 仍会基于 status/messages 触发滚动，assistant-ui 统一在 Viewport AutoScroll 中处理。
3. **Slack 稳定性**：Slack min-height 的写入时序与 userMessage 高度就绪时机可能不一致。
4. **topInset 生效时机**：header 高度变化时，topInset 写入可能晚于首帧滚动。

## 初步定位（高概率原因）

1. **占位消息替换导致 layout shift**
   - thinking placeholder 在 AI 回复到来时被真实 assistant message 替换。
   - DOM 重建触发布局重排，导致 scroll anchor 失效，引发下坠/抖动。

2. **锚点注册时机偏后**
   - 仅在最后一条是 assistant 时注册 userMessage 高度。
   - 首轮 runStart 时 userMessage 高度仍为 0，Slack 先用 0 计算。
   - AI 回复出现后 userMessage 才注册，Slack 重新计算导致回落。

3. **topInset 写入延迟**
   - header 高度通过 ResizeObserver 异步更新。
   - topInset 在滚动之后才生效，导致位置再偏移。

4. **非基线样式影响滚动稳定性**
   - `overflow-anchor` 与 `scrollbar-gutter` 不在 assistant-ui 基线内。
   - 这些样式可能改变浏览器滚动/布局修正策略，导致短内容场景回落。

## 调研计划（下一步）

1. **验证占位消息影响**
   - 暂停 MessageList 中的 thinking placeholder 注入，改为依赖实际 assistant message + loading icon。
   - 对比“下坠/抖动”是否消失。

2. **验证锚点提前注册**
   - 首条用户消息出现后 userMessage 高度即写入。
   - AI 回复插入时，Slack min-height 不再发生突变。

3. **验证 topInset 先行**
   - topInset 改为 layout effect 写入（已做），需要确认首帧滚动在 topInset 之后。

4. **回归非基线样式**
   - 移除 `overflow-anchor` 与 `scrollbar-gutter` 后对齐 assistant-ui。
   - 观察短内容场景是否仍出现“先到顶再回落”。

## 当前结论（2026-02-04）

- 消息较多时整体稳定，**消息较少时仍出现“先到顶 → AI 流式开始后下坠/抖动（下坠距离接近先前滚动的整段距离）”**。
- 已进入严格对齐 assistant-ui 阶段：移除 `topInset`、`overflow-anchor`、`scrollbar-gutter` 等非基线行为；Slack 与 AutoScroll 逻辑回归基线。
- 修复方向：以 assistant-ui 作为唯一基线完成回归，runStart 由列表层识别“新 assistant 消息”触发，避免短回复漏滚动。
- 最新问题：**出现“无法向上滚动”**（用户尝试上滚时无效/被立即拉回）。
- 最新进展：AutoScroll 在用户上滚时清理滚动意图，恢复手动上滚；短内容下坠需回归确认。
- 关键决策：为彻底消除滚动漂移与维护成本，**不接入 assistant-ui 依赖，改为参考其源码在 `@moryflow/ui` 内复刻**（见 `docs/architecture/ui-message-list-turn-anchor-adoption.md`），保留现有 UI 但对齐结构/职责。
- 最新修复：runStart 改为 smooth + 保持滚动意图（直到用户上滚）；ConversationContent 顶部 padding 提升，等待短内容回归验证。
- 最新修复：runStart 等待 footer inset 就绪，ChatPaneHeader 高度写入 CSS 变量，追加 TurnAnchor 调试日志。
- 最新修复：Slack 计算扣除顶部 padding + 用户消息高度忽略 0 值回调，目标修复 header 遮挡与首屏下坠。

## 推荐解决方案（待审核）

> 目标：完全对齐 assistant-ui 行为，消除“先到顶后下坠/抖动”。

### 方案 A（优先）

1. **移除 thinking placeholder**
   - MessageList 不再插入伪 assistant message。
   - loading icon 由 `ChatMessage` 在 assistant message 的 `parts` 为空时展示。
   - 这保证 DOM 结构稳定，避免替换导致 scroll anchor 失效。

2. **滚动触发完全迁移到 Viewport AutoScroll**
   - MessageList 内不再根据 status/messages 触发滚动。
   - Viewport AutoScroll 只响应三类事件：初始化、会话切换、run start。

3. **提前注册锚点 userMessage**
   - 当最后一条消息是 user 时，立即注册 userMessage 高度。
   - assistant 出现后继续保持注册，避免 Slack 计算突变。

4. **移除非基线样式**
   - 移除 `overflow-anchor` 与 `scrollbar-gutter`，避免与浏览器默认滚动策略冲突。
   - 仅保留 assistant-ui 基线内的滚动/Slack 行为。

### 方案 B（兜底）

- 保留 placeholder，但把 placeholder 与真实 assistant message 合并为同一 DOM（固定 key），避免替换造成 layout shift。
- 增加 “anchor ready” 状态（viewport/inset/userMessage 高度全部就绪后再触发滚动）。

## 验收标准

- 首条消息、前 3 条消息、长会话下全部表现一致。
- AI 回复期间用户消息不再下坠、抖动或闪烁。
- ScrollToBottom 仅在用户上滚超过一屏时出现，位置固定在输入框上方。
- 与 assistant-ui 的滚动体验一致。

## 更新日志

- 2026-02-03：建立问题清单与复现步骤，整理初步定位与修复方案（待审核）。
- 2026-02-03：锚点 userMessage 提前注册，避免 AI 回复插入后 Slack 回落（待验证）。
- 2026-02-03：补充 scroll anchoring/scrollbar gutter 风险与验证项（待验证）。
- 2026-02-04：新增执行规范，明确只允许在 `~/code/me/moryflow` 分支内改动。
- 2026-02-04：记录“消息少时仍下坠/抖动，消息多时正常”的最新观察结论。
- 2026-02-04：补充“下坠距离接近整段滚动距离”的根因分析与修复方向（runStart 触发时机 + 滚动意图结算）。
- 2026-02-04：移除 topInset/overflow-anchor/scrollbar-gutter，进入严格 assistant-ui 基线回归。
- 2026-02-04：runStart 触发迁移到 MessageRoot（assistant 渲染后），ScrollButton 恢复 smooth 动画。
- 2026-02-04：runStart 触发改为列表层识别新 assistant 消息，避免短回复漏滚动。
- 2026-02-04：runStart 触发增加视口/锚点高度就绪检查，Viewport 开启 scroll-smooth，Content 增加顶部 padding。
- 2026-02-04：新增回归问题：出现“无法向上滚动”，需优先定位滚动被强制保持在底部的原因。
- 2026-02-04：AutoScroll 增加“用户上滚清理滚动意图”，恢复手动上滚并补回归单测。
- 2026-02-04：撤销 assistant-ui 直连改造，改为在 `@moryflow/ui` 内复刻 assistant-ui 结构与交互。
- 2026-02-04：runStart 平滑滚动 + 保持滚动意图（直到用户上滚）；ConversationContent 顶部 padding 提升，待回归。
- 2026-02-05：Slack 计算扣除顶部 padding + 用户消息高度忽略 0 值回调，修复 header 遮挡与首屏下坠问题。
- 2026-02-04：runStart 等待 footer inset + Header 高度 CSS 变量 + TurnAnchor 调试日志开关。
