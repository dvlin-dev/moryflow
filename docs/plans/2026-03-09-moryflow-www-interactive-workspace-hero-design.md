# Moryflow WWW 首屏交互式 Workspace Hero 设计

## 背景

`apps/moryflow/www` 当前首页首屏仍是营销式 Hero：标题、下载按钮和产品截图占位。它能表达定位，但不能让用户直接感知 Moryflow PC 的核心体验，也无法承接“产品图改成真实可交互演示”的诉求。

本次改造的目标不是把桌面端运行时搬进官网，而是在官网首屏内构建一个高拟真的交互式演示壳层，让用户在一屏内同时看到：

- 左侧 Home 视角下的文件与导航
- 中间打开的产品介绍文档
- 右侧模拟 AI 对话与工具执行过程

该演示只服务官网转化，不接真实后端、不接真实模型、不复用 PC 的复杂 store/runtime。

## 目标

- 桌面端首页首屏改为交互式 workspace demo，视觉结构对齐 Moryflow PC 的 Home tab。
- 默认进入时即展示一轮已经完成的真实感对话，体现“搜索、写入文件、生成介绍”的 agent 工作流。
- 用户可以在中间文档区编辑文本，获得“内容可沉淀、可修改”的感受。
- 用户可以在右侧输入框再次发送消息；发送后立即收到固定官网话术，强化“下载后体验真实产品”。
- 移动端不渲染该 demo，仅保留简化 Hero 文案与 CTA。

## 非目标

- 不接入真实聊天接口、工具运行时、消息流协议或联网搜索。
- 不复用 `apps/moryflow/pc` 的 workspace store、chat controller、editor runtime。
- 不在首页实现完整的 Home/Chat/Sites/Skills 导航逻辑。
- 不支持移动端 demo 交互。

## 方案选择

### 方案 A：独立的官网模拟壳层

在 `apps/moryflow/www` 内新建 marketing-only demo 组件，用本地 `useState` 驱动左侧文件列表、中间文档编辑和右侧聊天面板。

优点：

- 依赖最小，稳定性最好
- 不把官网首屏拖入 PC 端运行时耦合
- SSR、构建体积、可维护性都更可控

缺点：

- 需要单独实现一套高拟真外观

### 方案 B：直接嵌入 PC 端组件

尝试复用 PC 的 Sidebar、EditorPanel、ChatPane，并用 mock 数据填充。

优点：

- 外观最接近真实产品

缺点：

- store/context/runtime 耦合重
- 官网首屏会引入不必要的复杂度和体积
- SSR 与交互稳定性风险较高

### 结论

采用方案 A。官网需要的是“像真实产品”，不是“真的把桌面端运行时搬进来”。

## 信息架构

首屏保持现有产品定位信息，但将截图区域替换为一个桌面端专属的 interactive workspace hero。

结构分为两层：

1. 文案层

- 顶部标题、副标题、主下载 CTA 继续保留
- 仍然承担首页首屏的定位表达和下载转化

2. 演示层

- 只在 `lg` 及以上断点渲染
- 外观参考 Moryflow PC Home 工作区：Sidebar + Editor + Chat Pane
- 占据当前首屏产品图位置，成为新的核心视觉

## 交互设计

### 默认状态

用户首次进入首页时，首屏 demo 已处于“完成一轮对话”的状态：

- 左侧默认高亮 `Home`
- 文件列表中选中 `Introducing Moryflow.md`
- 中间文档已打开并展示产品介绍内容
- 右侧对话区已展示一轮完整消息

默认不做自动打字，不做延迟播放，进入即见结果。

### 用户可执行交互

只开放四类交互：

1. 点击左侧文件项

- 打开同一篇 `Introducing Moryflow.md`
- 不支持多文档切换逻辑扩展

2. 编辑中间文档

- 用户可真实输入、删除、修改文本
- 刷新页面后重置为初始 mock 内容

3. 在右侧输入框发送消息

- 输入框允许输入任意文本
- 点击发送后，立即追加一轮新的 assistant 回复
- 该回复使用固定官网话术，不接真实模型

4. 点击 `Home | Chat`

- 仅改变顶部 tab 的视觉状态
- 主区内容保持不变，不额外实现 Chat 模式线程页

### 不做的交互

- 不实现真实文件树展开、拖拽、重命名、搜索
- 不实现真实工具审批、流式协议、会话切换、模型切换
- 不实现自动轮播、打字机动画、复杂状态回放

## 文档区设计

中间区域模拟 Moryflow 的文档编辑体验，但实现上采用轻量可控方案：

- 使用本地受控编辑状态维护文本内容
- 视觉上做成类 Notion / 类 Moryflow 的文档阅读与编辑外观
- 顶部保留文档标题、少量只读工具条氛围元素

默认文档内容是产品宣传型介绍文：

- Moryflow 是 local-first AI agent workspace
- 它把 notes、agent workflows、publishing 放在同一工作流
- 用户可以把工作沉淀到可编辑文档，而不是丢在聊天记录里
- 当内容成熟后可以进一步发布成网站

实现上不引入富文本编辑器。第一版使用轻量文本编辑方案即可，优先保证稳定和手感。

## 对话区设计

右侧 Chat Pane 需要模拟“真实 agent 工作过程”，而不是单条普通文案。

默认预置一轮对话：

- User: `Please introduce Moryflow.`
- Assistant 工具过程：
  - `Searching the web for product positioning`
  - `Collecting key product capabilities`
  - `Writing summary to Introducing Moryflow.md`
- Assistant 结论：
  - `Moryflow is a local-first AI workspace for notes, agent workflows, and publishing. It helps users keep work in editable documents and turn finished notes into websites.`

用户再次发送任意消息后，追加固定回复：

- `This is a simulated demo on the website. Please download Moryflow to experience the real interactive workspace.`

回复前不需要复杂动画；如需增强过程感，只允许加入极短的本地过渡，不引入异步脚本编排。

## 组件边界

建议在 `apps/moryflow/www/src/components/landing/` 下新增一套官网专用 demo 组件，而不是把所有逻辑继续堆进 `AgentFirstHero.tsx`。

推荐拆分：

- `InteractiveWorkspaceHero.tsx`
  - 首屏装配，承载标题、CTA、桌面端 demo 入口
- `workspace-demo/mock-data.ts`
  - 文件、文档、消息、固定回复模板
- `workspace-demo/WorkspaceDemoShell.tsx`
  - 三栏容器
- `workspace-demo/WorkspaceDemoSidebar.tsx`
  - 左侧导航与文件列表
- `workspace-demo/WorkspaceDemoEditor.tsx`
  - 中间文档编辑区
- `workspace-demo/WorkspaceDemoChat.tsx`
  - 右侧消息区与输入框

`AgentFirstHero.tsx` 可以保留为轻量包装层，也可以直接由新组件替换；以减少历史占位逻辑为优先。

## 数据模型

所有数据均为本地 mock 常量：

- `sidebarMode: 'home' | 'chat'`
- `selectedFileId`
- `documentTitle`
- `documentBody`
- `messages`
- `chatInput`

消息模型建议最小化，不复用 PC 真实消息协议，只保留官网演示必需字段：

- `id`
- `role`
- `kind`: `text` | `tool-step`
- `content`

## 样式与响应式

视觉上对齐 Moryflow PC 的结构节奏，但保持官网品牌背景与卡片氛围。

- demo 外层仍属于 marketing hero，不做纯 app 截图感
- 三栏容器使用实色背景、细边框、较浅阴影
- 宽屏优先，保证首页首屏内三栏信息清晰可读
- 移动端直接隐藏 demo，仅保留标题、说明和 CTA

## 风险与控制

### 风险 1：过度追求“和 PC 一模一样”

会把官网首屏拖入复杂的真实运行时依赖。

控制：

- 只复用布局语言与视觉结构，不复用 PC 状态机

### 风险 2：对话动画过重

会影响首屏稳定性与性能。

控制：

- 默认态直接展示完成结果
- 二次发送只做最短反馈，不做长链路播放

### 风险 3：编辑器实现过度

引入富文本库收益低，维护成本高。

控制：

- 第一版只用轻量受控编辑实现

## 验收标准

- 桌面端首页首屏的产品图区域已替换为三栏交互式 workspace demo
- 默认进入即看到完整一轮 agent 对话与文档内容
- 用户可编辑文档内容
- 用户可发送新消息并收到固定官网回复
- 移动端不渲染 demo，但首屏文案和 CTA 保持完整
- 首页其余 section 不被本次改造破坏

## 验证建议

本次属于 L1：涉及首页组件交互与本地状态改造。

最小验证基线：

- `pnpm --filter @moryflow/www typecheck`
- `pnpm --filter @moryflow/www test:unit`
- 本地手工验证首页桌面端与移动端首屏表现
