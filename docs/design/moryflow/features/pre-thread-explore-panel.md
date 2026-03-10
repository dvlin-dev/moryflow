---
title: PreThreadView Redesign — Explore Panel
scope: moryflow/pc
status: active
---

# PreThreadView Redesign — Explore Panel

## 背景与目标

对标 Claude Code 的 entry-canvas 交互模式，将 PreThreadView 从"英雄区 + 建议卡片下置"重构为"建议卡片上置 + 可展开探索面板"。

核心叙事来自产品定位文档：**知识库 → AI 思考 → 内容发布**。所有文案、场景、Skill 提示词均服务于这一叙事，而非通用 AI 聊天风格。

---

## 目标布局

### 默认收起状态

```
┌────────────────────────────────────────────────┐
│                                                │
│   (上方空白区，居中弹性)                          │
│                                                │
│  [卡片1]  [卡片2]  [卡片3]    Explore more  ×  │
│  ┌──────────────────────────────────────────┐  │
│  │              输入框（固定底部）              │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

- 3 个 suggestion 卡片位于输入框**上方**（水平排列）
- 右侧 "Explore more" 文字链接 + "×" 关闭按钮
- "×" 收起 bar（session 内不再显示）

### 展开状态（点击 "Explore more"，从下往上撑满）

```
┌────────────────────────────────────────────────┐
│  Start with a task                        ↓   │  ← 顶部固定栏，↓ 收起
├────────────────────────────────────────────────┤
│  Get started                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ 写作发布  │  │  制定计划  │  │  整理知识  │     │  ← 3 列卡片
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                │  ↑ 可滚动区域
│  Skills                                        │
│  ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │ $pdf │ │$docx │ │$pptx │                   │
│  └──────┘ └──────┘ └──────┘                   │
│  ... (14 个预装 Skill)                          │
│                                                │
├────────────────────────────────────────────────┤
│              输入框（始终可见）                   │  ← 固定底部
└────────────────────────────────────────────────┘
```

**`panel` variant（右侧边栏三栏模式）**：只显示 3 个 suggestion 卡片，不显示 "Explore more"。

---

## Get Started 内容

基于 Moryflow 核心叙事（笔记 → 发布），3 个场景：

| id                 | 标题                             | 填充话术                                                                                                                      |
| ------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `write-publish`    | Write & publish a post           | Review my recent notes and draft a publication-ready article with a clear narrative, strong opening, and structured sections. |
| `build-plan`       | Build a plan from my ideas       | Turn my latest notes into a concrete execution plan with milestones, deliverables, and risk flags.                            |
| `create-site-page` | Create a site page from my vault | Survey my vault content and help me structure and publish a focused page to my site.                                          |

---

## Skills 内容（14 个预装）

点击 Skill 卡片 → **填充输入框**（不创建线程，用户确认后自行发送）。

| Skill                   | 填充话术                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `pdf`                   | Use $pdf to create a one-page summary PDF from my research notes.                                |
| `docx`                  | Use $docx to turn my current notes into a polished Word document ready to share.                 |
| `pptx`                  | Use $pptx to generate a presentation slide deck from my research notes.                          |
| `xlsx`                  | Use $xlsx to analyze my spreadsheet data and produce a structured insight report.                |
| `frontend-design`       | Use $frontend-design to build a clean landing page for my published content.                     |
| `canvas-design`         | Use $canvas-design to design a visual layout for my article — title, sections, and key callouts. |
| `algorithmic-art`       | Use $algorithmic-art to generate a visual pattern inspired by the theme of my latest notes.      |
| `web-artifacts-builder` | Use $web-artifacts-builder to build a structured web page from my article draft.                 |
| `theme-factory`         | Use $theme-factory to create a consistent visual theme for my published site.                    |
| `internal-comms`        | Use $internal-comms to write a team update summarizing this week's progress from my notes.       |
| `skill-creator`         | Use $skill-creator to help me design a new custom skill for my workflow.                         |
| `find-skills`           | Use $find-skills to discover the best skill for this task.                                       |
| `agent-browser`         | Use $agent-browser to research a topic and compile a structured report from the web.             |
| `macos-automation`      | Use $macos-automation to automate my daily file organization and note export workflow.           |

---

## 架构设计

### 核心决策：`fillInput` ref 桥

PreThreadView 需要从外部控制 `ChatComposer` 内部的 textarea。采用 `forwardRef` + `useImperativeHandle` 方案：

```
PreThreadView
├── composerRef = useRef<ChatComposerHandle>()
├── PreThreadExplorePanel
│   └── onFillInput(text) → composerRef.current.fillInput(text)
└── ChatComposer (ref={composerRef})
    └── ChatPromptInput (ref forwarded)
        └── useImperativeHandle → { fillInput: promptController.textInput.setInput }
```

### 组件职责划分

```
components/
└── chat-pane/
    └── components/
        ├── pre-thread-view.tsx               (改写：去英雄区，接 ExplorePanel)
        ├── chat-composer.tsx                 (改写：forwardRef，去 suggestions)
        ├── pre-thread-explore-panel/
        │   ├── const.ts                      (静态数据：场景卡片 + Skill 提示词)
        │   ├── index.tsx                     (状态编排：expanded / dismissed)
        │   ├── explore-bar.tsx               (收起态：3 卡片 + Explore more)
        │   ├── explore-panel.tsx             (展开态：固定顶栏 + 可滚区域)
        │   ├── get-started-section.tsx       (Get Started 卡片列)
        │   └── skills-section.tsx            (Skills 卡片网格)
        └── chat-prompt-input/
            ├── index.tsx                     (加 forwardRef，去 suggestions 渲染)
            └── const.ts                      (去 ChatPromptSuggestion type)
```

---

## 步骤计划

### Step 1 — i18n：更新翻译键

**文件**：`packages/i18n/src/translations/chat/en.ts`

删除旧键（8 个）：

```
preThreadEyebrow / preThreadTitle / preThreadDescription
preThreadSuggestionSummarizeTitle / ...Prompt
preThreadSuggestionPlanTitle / ...Prompt
preThreadSuggestionActionsTitle / ...Prompt
preThreadSuggestionPublishTitle / ...Prompt
```

新增键：

```ts
preThreadExploreMore: 'Explore more',
preThreadStartWithTask: 'Start with a task',
preThreadGetStarted: 'Get started',
preThreadSkills: 'Skills',
```

---

### Step 2 — `ChatPromptInput`：加 ref handle，去 suggestions

**文件**：`chat-prompt-input/index.tsx`

- 用 `forwardRef` 包装，暴露 `ChatPromptInputHandle { fillInput(text: string): void }`
- `ChatPromptInputInner` 接收 `forwardedRef`，通过 `useImperativeHandle` 注册 `fillInput`
- 删除 suggestions prop + suggestions grid 渲染（lines 368–389）

**文件**：`chat-prompt-input/const.ts`

- 删除 `ChatPromptSuggestion` type（已无使用）
- 删除 `ChatPromptInputProps` 中的 `suggestions`

---

### Step 3 — `ChatComposer`：加 ref handle，去 suggestions

**文件**：`chat-composer.tsx`

- 用 `forwardRef` 包装，暴露 `ChatComposerHandle { fillInput(text: string): void }`
- 内部持有 `inputRef = useRef<ChatPromptInputHandle>()`，转发给 `ChatPromptInput`
- `useImperativeHandle` 将 `fillInput` 代理给 `inputRef.current.fillInput`
- 删除 `suggestions` prop

---

### Step 4 — `pre-thread-explore-panel/const.ts`

静态数据文件：

```ts
export type ExploreItem = { id: string; title: string; prompt: string };

export const GET_STARTED_ITEMS: ExploreItem[] = [ ... ]; // 3 个场景

export const PREINSTALLED_SKILL_NAMES: string[] = [ ... ]; // 14 个 skill name

export const SKILL_DEFAULT_PROMPTS: Record<string, string> = { ... }; // skill → prompt
```

---

### Step 5 — `get-started-section.tsx`

接收 `items: ExploreItem[]` + `onSelect(prompt): void`，渲染 3 列卡片网格。

---

### Step 6 — `skills-section.tsx`

接收 `skills: SkillSummary[]` + `onSelect(prompt): void`。

- 每个 Skill 卡片：title（来自 `skill.title`）+ 截断描述（来自 `skill.description`）
- 点击 → `onSelect(SKILL_DEFAULT_PROMPTS[skill.name])`
- 如果该 Skill 的 `defaultPrompt` 不在 map 中，降级到 `Use $${skill.name} to help me.`

---

### Step 7 — `explore-bar.tsx`

收起态 UI：

```
[卡片1] [卡片2] [卡片3]          Explore more  ×
```

Props:

```ts
{
  items: ExploreItem[];
  onFillInput(text: string): void;
  onExpand(): void;
  onDismiss(): void;
  exploreMoreLabel: string;
}
```

---

### Step 8 — `explore-panel.tsx`

展开态 UI（固定顶栏 + 可滚区域）：

```tsx
<div className="flex flex-col min-h-0 flex-1 overflow-hidden">
  {/* Fixed header */}
  <div className="flex items-center justify-between px-8 py-4 border-b border-border/50">
    <span className="text-sm font-medium">{startWithTaskLabel}</span>
    <button onClick={onCollapse}>
      <ChevronDown />
    </button>
  </div>
  {/* Scrollable content */}
  <div className="flex-1 overflow-y-auto">
    <div className="mx-auto max-w-[46rem] px-8 py-6 space-y-8">
      <GetStartedSection items={items} onSelect={onFillInput} />
      <SkillsSection skills={skills} onSelect={onFillInput} />
    </div>
  </div>
</div>
```

使用 `motion/react` 的 `AnimatePresence` 做展开动画（`y: 20 → 0, opacity: 0 → 1`）。

Props:

```ts
{
  skills: SkillSummary[];
  onFillInput(text: string): void;
  onCollapse(): void;
  labels: { startWithTask, getStarted, skills };
}
```

---

### Step 9 — `pre-thread-explore-panel/index.tsx`

状态编排层（orchestrator）：

```ts
// 状态
const [expanded, setExpanded] = useState(false);
const [dismissed, setDismissed] = useState(false);

// 数据
const { skills } = useAgentSkills();
const preinstalledSkills = useMemo(
  () => skills.filter((s) => PREINSTALLED_SKILL_NAMES.includes(s.name)),
  [skills]
);
```

Props：

```ts
{
  variant: 'mode' | 'panel';
  onFillInput(text: string): void;
}
```

逻辑：

- `dismissed || variant === 'panel'`：仅渲染 `ExploreBar`（无 Explore more 按钮）
- `dismissed === false && variant === 'mode'`：渲染 `ExploreBar`（含 Explore more）
- `expanded`：渲染 `ExplorePanel`

---

### Step 10 — `pre-thread-view.tsx`：重写

```tsx
export const PreThreadView = ({ variant = 'mode', submitMode = 'default' }) => {
  const composerRef = useRef<ChatComposerHandle>(null);
  const { t } = useTranslation('chat');

  const handleFillInput = useCallback((text: string) => {
    composerRef.current?.fillInput(text);
  }, []);

  const shellClass =
    variant === 'panel' ? 'mx-auto w-full max-w-[34rem] px-6' : 'mx-auto w-full max-w-[46rem] px-8';

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <PreThreadExplorePanel variant={variant} onFillInput={handleFillInput} />
      <div className={cn(shellClass, 'pb-8')}>
        <ChatComposer ref={composerRef} variant="prethread" submitMode={submitMode} />
      </div>
    </div>
  );
};
```

删除：英雄区 HTML、`suggestions` useMemo、`space-y-8` 包装层、背景渐变 div。

---

### Step 11 — 验证

```bash
pnpm --filter @moryflow/pc typecheck
pnpm --filter @moryflow/pc test:unit
```

手动验证：

1. `mode` 收起：3 卡片显示在输入框上方，点击填充文字
2. `mode` 收起：点击 "Explore more" → 展开面板，输入框仍可见
3. `mode` 展开：Get Started / Skills 卡片点击均填充输入框
4. `mode` 展开：点击 ↓ → 收起回 bar 状态
5. `mode` 收起：点击 × → bar 消失，只剩输入框
6. `panel`（打开文件三栏）：只显示 3 卡片，无 Explore more
7. Skills 未安装边界：卡片显示，prompt 降级为通用话术
8. 发送流程：填充 → 发送 → 正常创建会话

---

## 文件变更汇总

| 文件                                                          | 变更类型 | 说明                                               |
| ------------------------------------------------------------- | -------- | -------------------------------------------------- |
| `packages/i18n/src/translations/chat/en.ts`                   | 改       | 删 8 旧键，加 4 新键                               |
| `components/chat-pane/components/pre-thread-view.tsx`         | 重写     | 去英雄区，接 ExplorePanel + composerRef            |
| `components/chat-pane/components/chat-composer.tsx`           | 改       | forwardRef，去 suggestions                         |
| `components/chat-pane/components/chat-prompt-input/index.tsx` | 改       | forwardRef + fillInput handle，去 suggestions 渲染 |
| `components/chat-pane/components/chat-prompt-input/const.ts`  | 改       | 去 ChatPromptSuggestion，去 suggestions prop       |
| `pre-thread-explore-panel/const.ts`                           | 新增     | 静态数据                                           |
| `pre-thread-explore-panel/index.tsx`                          | 新增     | 状态编排                                           |
| `pre-thread-explore-panel/explore-bar.tsx`                    | 新增     | 收起态 UI                                          |
| `pre-thread-explore-panel/explore-panel.tsx`                  | 新增     | 展开态 UI                                          |
| `pre-thread-explore-panel/get-started-section.tsx`            | 新增     | Get Started 区块                                   |
| `pre-thread-explore-panel/skills-section.tsx`                 | 新增     | Skills 区块                                        |
