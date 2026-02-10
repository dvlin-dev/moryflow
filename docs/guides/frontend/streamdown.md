---
title: Streamdown 使用指南（Markdown 渲染 + 流式 Token 动画）
date: 2026-02-10
scope: frontend, ui
status: active
---

<!--
[INPUT]: Streamdown（Markdown 渲染）在多端（PC/Console/UI 包）内的接入方式；流式输出的 token 动画（animated/isAnimating）机制
[OUTPUT]: 可复用的使用指南 + 本仓库现状说明 + 定位与排障清单
[POS]: 前端 UI 指南：统一“消息富文本渲染”与“流式动画”的接入方式，避免多端各自实现导致语义漂移

[PROTOCOL]: 本文件变更需同步更新 `docs/index.md` 与 `docs/CLAUDE.md`。
-->

# Streamdown 使用指南

## 目标

- 统一 Markdown 渲染：UI 包内部提供统一入口，应用侧只负责“何时渲染/何时开动画”。
- 流式动画可控：仅在 streaming 时启用，避免静态内容反复拆分 token。
- 方便定位：仓库内用 `STREAMDOWN_ANIM` 作为全局检索标记，快速找到动画链路的关键节点。

## Streamdown 是什么

`streamdown` 是一个面向“流式内容”的 Markdown 渲染组件：

- 输入：`children: string`（Markdown 文本）
- 输出：React 渲染树（支持 code highlight/mermaid/math 等插件能力）
- 关键能力：当 `animated` + `isAnimating=true` 时，会把文本 token 拆分并包裹 `data-sd-animate`，从而实现逐词（或逐字）动画。

## 在本仓库的接入现状（Single Source of Truth）

### 1) UI 包统一渲染入口

- `MessageResponse`：消息正文渲染组件，内部直接使用 `<Streamdown />`
  - 位置：`packages/ui/src/ai/message/response.tsx`
- `MessageResponseProps`：直接复用 Streamdown props（因此支持 `animated/isAnimating`）
  - 位置：`packages/ui/src/ai/message/const.ts`

应用侧（PC/Console）不要直接 new 一套 Markdown renderer，统一复用 `@anyhunt/ui/ai/message` 的 `MessageResponse`。

### 2) 流式 token 动画的参数（集中管理）

- 动画参数单一事实来源：
  - `packages/ui/src/ai/streamdown-anim.ts`
  - 导出：`STREAMDOWN_ANIM_STREAMING_OPTIONS`

> 说明：应用侧只决定“要不要动画”（shouldAnimate）和“是否正在动画”（isAnimating），具体动画参数统一由 UI 包收敛，避免多端 magic numbers 漂移。

### 3) 动画 CSS（为什么要内联）

Streamdown 官方提供了 `node_modules/streamdown/styles.css`，但它**没有通过 package exports 导出**，在部分 Vite/PostCSS 环境下直接 `@import 'streamdown/styles.css'` 会报错：

- 报错：`Missing "./styles.css" specifier in "streamdown" package`

因此我们把它的内容**内联**到 UI 包样式里：

- 位置：`packages/ui/styles/index.css`
- 规则：`[data-sd-animate] { animation: ... }`
- keyframes：`sd-fadeIn / sd-blurIn / sd-slideUp`

另外，为了让 Tailwind v4 能扫描到 Streamdown dist 内的 class（避免样式缺失），我们在同一文件里声明：

- `@source '../../../node_modules/streamdown/dist/*.js';`

## 动画机制说明（animated / isAnimating / data-sd-animate）

### 关键结论

- `animated` 决定“是否启用 animate plugin”（以及动画参数：animation/duration/easing/sep）。
- `isAnimating` 决定“**本次渲染**是否真的拆 token 并注入 `data-sd-animate` span”。
- CSS 侧只做一件事：给 `[data-sd-animate]` 挂 `animation: ...`。

### `sep: 'word' | 'char'` 的区别（以及为什么中文常用 `char`）

> 注意：这里的 `word` 不是“真正的分词”，而是**按空白字符（whitespace）分段**。

- `sep: 'word'`
  - 行为：把一个 text node 拆成「连续空白」与「连续非空白」两类片段；只有“非空白片段”会包 `data-sd-animate`
  - 结果：英文/带空格的文本，会按“词/短语块”动；**中文通常没有空格，往往整段会被当成一个 token**，所以几乎看不出逐词动画
- `sep: 'char'`
  - 行为：把“非空白字符”逐个拆分成 token；空白仍保持原样
  - 结果：逐字动画非常明显（含中文、标点），但会生成更多 `<span data-sd-animate>`，对长文本更费 DOM/CPU

### `code/pre` 等内容会不会被拆（JSON/Tool 输出是否安全）

Streamdown 的 animate plugin 会跳过这些标签内部的 text（不会拆 token）：

- `code` / `pre`（包括 code fence、inline code）
- `svg` / `math` / `annotation`

因此：

- **工具输出（JSON）在本仓库默认用 `CodeBlock`/`<pre>` 渲染**（见 `packages/ui/src/ai/tool.tsx`），不会被 token 动画拆碎
- 如果你把 JSON 当作“普通文本”直接塞进 Streamdown（没有 code fence），那它会按 `sep` 拆分并动画，但只是“更吵”，不会破坏数据或语义

### 数据流（ASCII）

```
UIMessage.parts
  |
  v
splitMessageParts()  -> orderedParts[]
  |
  v
findLastTextPartIndex(orderedParts)
  |
  v
shouldAnimate? (只对最后一条 assistant 的最后一个 text part)
  |
  v
<MessageResponse animated=... isAnimating=...>
  |
  v
<Streamdown ...>
  |
  v
rehype animate plugin (only when isAnimating === true)
  |
  v
<span data-sd-animate style="--sd-animation:sd-...;--sd-duration:...;--sd-easing:...">token</span>
  |
  v
packages/ui/styles/index.css: [data-sd-animate] { animation: ... }
```

## 本仓库“哪里开了动画”（现有调用点）

> 快速定位：`git grep -n "STREAMDOWN_ANIM" -- .`

### Moryflow PC（主对话）

- 只对“最后一条 assistant 的最后一个 text part”启用动画
- 只在 streaming（`submitted|streaming`）期间 `isAnimating=true`
- 位置：`apps/moryflow/pc/src/renderer/components/chat-pane/components/message/index.tsx`

### Anyhunt Console（Agent Browser Playground）

- 同 PC 逻辑
- 位置：`apps/anyhunt/console/src/features/agent-browser-playground/components/AgentMessageList/components/message-row.tsx`
- 上层 gating（isLastMessage/isRunning）：
  - `apps/anyhunt/console/src/features/agent-browser-playground/components/AgentMessageList/AgentMessageList.tsx`

### Reasoning（thinking）

- 仅在 reasoning streaming 时启用动画
- 位置：`packages/ui/src/ai/reasoning.tsx`

## 如何调整动画效果（正常/更明显/调试）

### 正常调整（推荐）

修改这里即可：

- `packages/ui/src/ai/streamdown-anim.ts`

当前仓库默认值（以代码为准）：

- `animation: 'slideUp'`
- `duration: 600`
- `easing: 'cubic-bezier(0.22, 1, 0.36, 1)'`
- `sep: 'char'`

可调参数：

- `animation`: `'fadeIn' | 'blurIn' | 'slideUp'`
- `duration`: 毫秒
- `easing`: CSS easing 字符串
- `sep`: `'word' | 'char'`（`word` 本质是按空白分段；`char` 更明显但更费 DOM/CPU）

### 快速确认“是否生效”（调试用做法）

当你怀疑动画没生效时，不要继续猜：

1. 打开 DevTools，Elements 搜索 `data-sd-animate`
2. 若不存在：优先检查 `isAnimating` 是否真的为 true（以及该段是否真的传了 `animated`）
3. 若存在但没动画：检查 `@anyhunt/ui/styles` 是否被应用侧引入、`[data-sd-animate]` 规则是否在最终 CSS 内

## 常见坑与建议

- 不要在应用侧 `@import 'streamdown/styles.css'`：会触发 Vite/PostCSS 的 exports 解析问题。
- 动画只应对“最后一条 + 最后一个 text part”生效：否则 token 拆分会对长列表造成不必要的 DOM 压力。
- 如果你要把动画做得更明显：优先改 `duration` 或 `animation`，最后才考虑改 CSS keyframes（保持可控与一致性）。

---

_最后更新：2026-02-10_
