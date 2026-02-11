---
title: Agent Skills（面向 C 端的“技能库”）接入方案
date: 2026-02-11
scope: apps/moryflow/pc
status: implemented
---

<!--
[INPUT]:
- 需求：在 Moryflow 接入“Skills（技能库）”，参考 OpenCode，但交互面向 C 端，保持 Notion 风格的低学习成本。
- 已确认决策：默认全启用、可单独禁用不删除、输入框支持 `+` 菜单与空输入 `/` 两入口选中 skill（结构化 selectedSkill，不使用纯文本前缀）。
- 约束：不考虑历史兼容；允许结构性重构；遵循 ADR-0002 控制面（Permission/Truncation/Compaction/Doom Loop）。

[OUTPUT]:
- Skills 的最终方案（基于已确认决策）：UX、状态模型、上下文注入策略、Runtime 接入路径
- OpenCode skill 实现核对结论（哪些默认注入，哪些按需注入）
- PC 端落地拆分与执行顺序（不过度设计）

[POS]: 本文作为 Skills 接入的单一事实来源（implemented），用于持续演进与多端对齐。

[PROTOCOL]: 本文件变更需同步更新 `docs/index.md`、`docs/CLAUDE.md`、`docs/architecture/CLAUDE.md`。
-->

# Agent Skills（面向 C 端的“技能库”）接入方案

## 决策摘要（已确认）

1. Skills 作为独立模块入口，放在 Sidebar 的 `Sites` 上方。
2. 已安装 skill 默认全启用（global enabled），不按“某个会话单独安装”。
3. 支持“禁用但不删除”：用户可暂时停用 skill，后续可恢复启用。
4. 输入框支持两种“选中 skill”入口：`+` 二级菜单与 `/` 选择器（仅输入框为空时可触发）。
5. 选中 skill 后写入结构化状态并显示 `Skill` chip（可移除），不使用 `use skill ...` 纯文本前缀。
6. Skill 来源采用你确认的 `C`：内置 + 用户目录 + 外部兼容目录自动合并导入。
7. 内置 skill 采用你确认的 `B`：首次引导时复制到用户目录（用户可直接管理）。
8. 兼容扫描命中后默认自动导入到主目录（`~/.moryflow/skills`），不做引导和提醒。
9. 资源注入策略采用你确认的 `B`：当“加载某个 skill”时，允许注入 skill 正文与资源文件清单（受白名单控制）。
10. 默认“全启用”不等于“全量正文注入”：默认只给模型 skill 元信息目录，正文按需加载。
11. 元信息注入不包含本地绝对路径与状态字段（仅注入已启用 skills）；路径信息统一由 `skill` tool 返回，保持 Web/PC 一致数据源。
12. `skill` 不走权限审批与审计链路，改为白名单直通（仅允许“已安装且已启用”的 skill）。

## OpenCode 实现核对结论（用于对齐）

### 结论

- 你问的这个判断是对的：**默认只暴露 skill 的名称/描述/位置等元信息**，并不会把全部 skill 主体 prompt 一开始就塞进上下文。
- 完整 skill 内容会在两种显式路径注入：
  - 模型调用 `skill` 工具时
  - 用户显式触发 skill 命令（slash command）时

### 代码证据（OpenCode）

核对快照（2026-02-11）：

- 仓库：`https://github.com/anomalyco/opencode`
- commit：`a0673256db74e5c2c90bb0b970335999d664a83b`

1. `skill` 工具默认注册：
   `packages/opencode/src/tool/registry.ts`（`SkillTool` 在 all tools 列表中）
2. 工具描述里会包含 `<available_skills>`（name/description/location）：
   `packages/opencode/src/tool/skill.ts`
3. 调用 skill 工具时才返回完整 `<skill_content ...>`（含正文 + 文件列表样本）：
   `packages/opencode/src/tool/skill.ts`
4. slash skill 命令走 `command.template = skill.content`，会显式注入 skill 正文：
   `packages/opencode/src/command/index.ts`
   `packages/opencode/src/session/prompt.ts`

## 产品形态（C 端、Notion 风格）

### 1) Sidebar Modules

- 模块顺序：`Skills` 在 `Sites` 上方。
- Navigation 扩展：`destination: 'agent' | 'skills' | 'sites'`。
- 其它语义保持现有实现：Agent 面板常驻，点击打开类行为可回到 Agent。

### 2) Skills 页面（参考你给的交互图）

- 页面头部：`Refresh`、`Search skills`、`+ New skill`
- 分区：
  - `Installed`（已安装）
  - `Recommended`（推荐）
- 卡片信息：name、description、状态（enabled/disabled）
- 详情弹层（modal）动作：
  - `Try`（将该 skill 设为当前输入框 selected skill）
  - `Disable/Enable`
  - `Open`（打开 skill 目录）
  - `Uninstall`（删除）

### 3) 输入框显式选中（你已确认）

- 在 `+` 二级菜单新增 `Skills` 子菜单。
- 输入框 `/` 触发也支持 skill 选择，但仅在输入框为空时可用：
  - `text.trim() === ''` 时，`/` 面板可出现 skills 项
  - 一旦已有文字，不再出现 skills 项（避免和普通 slash 文本命令冲突）
- 选择 skill 后：
  - 写入结构化 `selectedSkill`（非纯文本）
  - 输入框上方显示 `Skill` chip（可移除）
  - 若再次选择新 skill，则覆盖上一次选中

### 4) 输入框 Tag 能力现状（实现约束）

- 现有输入框支持“输入框上方 chip 行”（文件引用/附件），不支持“文本框内部 inline tag token”。
- 因此 P0 推荐交互为：
  - 保持纯文本输入区不注入魔法字符
  - 在输入框上方增加一个 `Skill` chip（可移除），作为显性状态
- 若后续要做“像图中那样的 inline tag”，需要改造底层输入组件（非 P0 必需）。
- 已落地补充（2026-02-11）：
  - 发送成功后自动清空输入区 selected skill chip（避免残留到下一条消息）。
  - 用户消息会在消息体下方渲染本次使用的 skill tag（从 `message.metadata.chat.selectedSkill` 读取），便于回看“这一条用了哪个 skill”。

### 5) 下期方案（仅规划，不在本期实现）：Tiptap 输入框 inline skill tag

目标：保留当前 `+` 与空输入 `/` 的选中流程，但在输入框内部渲染真正的 skill token（类似文件引用 tag），并与消息 metadata 一致。

实施范围（P1）：

1. Composer 内核改造
   - 将 `PromptInputTextarea` 的纯文本输入替换为轻量 Tiptap composer（仅启用 chat 所需扩展）。
   - 统一 `text + inline node` 的序列化协议，发送前可稳定提取纯文本和 skill token 列表。
2. Skill token 扩展
   - 新增 `skill` inline node（原子节点，不可拆分），显示 `title`，持久化 `name/title`。
   - 支持 Backspace 删除整个 token，与现有附件删除行为一致。
3. Slash/Plus 接入
   - `+` 菜单与空输入 `/` 选择 skill 时，插入 inline skill token，而不是仅维护外部 chip。
   - 输入框已有普通文本时禁用 slash-skill 弹层规则保持不变。
4. 发送与渲染一致性
   - 发送时将 skill token 同步写入 `message.metadata.chat.selectedSkill`（或多 token 列表）。
   - 消息列表继续以 metadata 作为单一渲染来源，保证历史消息稳定可回放。
5. 测试与回归
   - 新增 composer 序列化单测（token 插入/删除/提取）。
   - 新增 UI 单测（输入框 token 渲染、发送后消息 tag 渲染、失败不清空）。

验收标准（DoD）：

- 输入框可见 inline skill token（非纯文本）。
- 同一条用户消息能稳定回显 skill tag。
- 发送成功清空输入区 token；发送失败保留 token 便于重试。
- `pnpm lint` / `pnpm typecheck` / `pnpm test:unit` 全通过。

## 状态模型与存储

### Skill 元数据（解析自 `SKILL.md`）

```ts
type SkillManifest = {
  name: string; // 唯一 ID（kebab-case）
  title?: string;
  description?: string;
  prompt: string; // SKILL.md body
  tags?: string[];
  version?: string;
};
```

### 安装状态（用户级）

```ts
type SkillInstallState = {
  name: string;
  installed: boolean;
  enabled: boolean; // 默认 true
  location: string;
  updatedAt: number;
};
```

### 存储路径

- PC 主目录：`~/.moryflow/skills/<name>/`（目录根包含 `SKILL.md`）
- Mobile 主目录：`Paths.document/.moryflow/skills/<name>/`（目录根包含 `SKILL.md`）
- 外部兼容目录（固定清单）：
  - `~/.agents/skills`
  - `~/.claude/skills`
  - `~/.codex/skills`
  - `~/.clawdbot/skills`
- 扫描时机：
  - App 启动时自动扫描并导入主目录（不弹提示）
  - Skills 页面点击 `Refresh` 时重扫并导入
- 自动导入规则：
  - 按“技能目录”整体导入（不是只导入单个 `SKILL.md` 文件）。
  - 合法目录判定：目录根存在 `SKILL.md`，且可解析 `name/description/body`。
  - 导入时保留目录结构（例如 `scripts/`、`templates/`、`references/`）。
  - 同名冲突：主目录已存在则跳过兼容源（主目录优先）。
  - 导入后统一按主目录读取与管理（单一来源）。
  - 安全边界：忽略符号链接目录；导入前做 `realpath` 校验，禁止 `..` 穿越写入主目录外路径。

### 内置技能安装（你确认的 B）

- 首次启动或版本升级时，把内置 skills 复制/同步到 `~/.moryflow/skills`。
- 用户可在该目录直接编辑/禁用/删除。
- 同名冲突策略：用户目录覆盖内置版本（用户优先）。

## 上下文注入与执行策略（核心）

### 1) 默认全启用时注入什么？

- 默认只注入 `available_skills` 目录（name/title/description）。
- 不默认注入所有 skill 的 `prompt` 正文。
- 这样满足“全启用可发现”且避免上下文膨胀。

示例（发送给模型的系统附加片段）：

```xml
<available_skills>
  <skill>
    <name>weekly-review</name>
    <description>Turn scattered notes into a weekly review.</description>
  </skill>
</available_skills>
```

说明：

- 不注入 location：避免将“本地文件路径能力”耦合进系统提示词，兼容未来 Web 端无本地路径场景。
- 不注入 status：因为仅启用项才进入 `available_skills`。

### 2) 何时注入 skill 正文？

- 当 agent 决定调用 `skill` 工具（或用户显式选中某个 skill）时，再加载并注入完整正文。
- 注入格式对齐 OpenCode 思路：
  - `<skill_content name="..."> ... </skill_content>`
  - 附带技能定位信息与文件列表样本（你确认的 B）

建议 `skill` 工具返回结构（统一数据源）：

```xml
<skill_content name="weekly-review">
  ...SKILL.md body...
</skill_content>
<skill_meta>
  <name>weekly-review</name>
  <base_dir>/Users/xxx/.moryflow/skills/weekly-review</base_dir>
</skill_meta>
<skill_files>
  <file>/Users/xxx/.moryflow/skills/weekly-review/scripts/run.sh</file>
  <file>/Users/xxx/.moryflow/skills/weekly-review/templates/output.md</file>
</skill_files>
```

约束：

- `base_dir` 仅本地 skill 返回；远端/Web skill 仅返回可解析的 `skill_id`（不返回本地绝对路径）。
- 这样 PC 与 Web 都走同一条“tool 返回事实数据”的链路。

### 3) `selectedSkill` 的语义（替代纯文本前缀）

- 这是显式用户意图状态，不依赖字符串解析。
- Runtime 将 `selectedSkill` 作为强信号：
  - 优先尝试该 skill（调用 `skill` 工具加载）
  - 然后按用户正文继续执行
- 如果 skill 不可用（被禁用/不存在），先提示英文错误并给出可选技能列表，然后自动回退为普通对话继续执行（不中断本次发送）。

与 slash skill 命令关系：

- 两者可以并存，不冲突。
- slash 本质是“显式注入 skill 正文”。
- `selectedSkill` 本质是“显式意图状态 + 优先触发 skill tool”。
- C 端默认主路径建议使用 `+` 菜单与空输入 `/` 两入口，slash 文本命令作为高级能力保留。

### 4) 白名单策略（不走权限审计）

- `skill` 工具不进入 Permission/Approval/Audit 流程。
- 执行规则为白名单：
  - 仅允许“已安装且已启用”的 skill 被加载。
  - 未安装或已禁用 skill 直接返回英文可见错误。
- 资源文件访问同样按 skill 白名单目录处理（不弹审批，不写审计事件）。
- 不新增独立 usage 审计日志或额外权限复杂度。
- 该策略仅针对 `skill`；其它工具继续沿用 ADR-0002 的权限与审计机制。

## 接入点（PC）

### 1) Navigation 与模块入口

- `apps/moryflow/pc/src/renderer/workspace/navigation/state.ts`
  - `Destination` 增加 `'skills'`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/modules-nav.tsx`
  - 列表改为：`Skills` 在 `Sites` 上方
- `apps/moryflow/pc/src/renderer/workspace/desktop-workspace-shell.tsx`
  - 新增 `SkillsPage` 挂载与 keep-alive

### 2) Skills 页面（新目录）

建议目录：`apps/moryflow/pc/src/renderer/workspace/components/skills/`

- `index.tsx`：SkillsPage 容器
- `skills-list.tsx`：Installed/Recommended 列表
- `skill-detail-modal.tsx`：详情弹层（Try/Disable/Open/Uninstall）
- `use-skills.ts`：数据加载与状态更新

### 3) 输入框 + 菜单接入

- 目标位置：现有 Chat 输入框 `+` 菜单二级项
- 新增：
  - `Skills` submenu
  - 点击某个项后设置 `selectedSkill`
- 输入框 `/` 接入 skills 选择：
  - 仅在输入框为空时显示/可选
  - 选中后同样设置 `selectedSkill`
- 两入口复用同一 action creator（保证行为一致）

### 4) Runtime 与工具层

- `packages/agents-runtime`：
  - 新增 `skills-registry`（扫描、解析、enable 状态）
  - 新增 `available_skills` 注入器（仅元信息）
- `packages/agents-tools`：
  - 新增 `skill` 工具（按 name 加载 skill 正文 + 文件样本）
- `apps/moryflow/pc/src/main/agent-runtime/index.ts`：
  - 组装 tool 列表时挂 skill tool
  - 拼装运行上下文时注入 `available_skills`

## Mobile 策略（P1）

- P0 先落 PC 完整闭环。
- Mobile P1 再接：
  - skills 页面可先只做“已安装 + 启停”
  - 输入框 `selectedSkill` 动作与 runtime 注入策略保持一致

## 分阶段执行（不过度设计）

### P0（必须）

1. Sidebar 增加 `Skills` 模块并放在 `Sites` 上方。
2. Skills 页面（Installed + Detail + Enable/Disable + Try + Uninstall）。
3. 输入框支持两入口选中 skill（`+` 子菜单 + 空输入 `/` 选择），并显示 `Skill` chip。
4. 外部兼容目录启动时默认自动导入主目录（不做引导/提醒）。
5. Runtime 默认注入 `available_skills`（元信息，不注入全部正文）。
6. `skill` 工具按需加载正文与资源文件样本。

### P1（可选）

1. Recommended 先固定本地三项预设（`skill-creator`、`find-skills`、`baoyu-article-illustrator`）；远端推荐源后续单独提案，不在本期。
2. Mobile UI 对齐与多端状态同步策略。

## 最终原则

1. 对 C 端，Skill 是“能力模板”，不是“配置系统”。
2. 默认全启用是“可发现性”，不是“全量正文注入”。
3. 显式 `selectedSkill`（chip）提供可见控制，降低黑盒感。
4. 任何正文注入都走显式加载与白名单控制，保持可解释且不打扰用户。

## 执行计划（按步骤）

> 进度同步规则（强制）：每完成一个步骤，必须立即更新本节对应条目的“状态/完成时间/验证结果”，禁止只在聊天记录里口头同步，防止上下文压缩后信息丢失。

1. [x] P0-1：Sidebar 增加 `Skills` 模块并放在 `Sites` 上方
   - 状态：Completed
   - 完成时间：2026-02-11
   - 验证：`modules-nav` 新增 `Skills`，导航状态扩展到 `destination: 'agent' | 'skills' | 'sites'`，快捷键更新为 `Cmd/Ctrl+3 => Skills`、`Cmd/Ctrl+4 => Sites`
2. [x] P0-2：Skills 页面（Installed + Detail + Enable/Disable + Try + Uninstall + Refresh）
   - 状态：Completed
   - 完成时间：2026-02-11
   - 验证：新增 `workspace/components/skills/*` 与 `use-agent-skills`，支持 Installed/Recommended、详情弹层、启停、卸载、创建、目录打开、Try
3. [x] P0-3：输入框两入口选中 skill（`+` 子菜单 + 空输入 `/` 选择）并显示 `Skill` chip
   - 状态：Completed
   - 完成时间：2026-02-11
   - 验证：`ChatPromptInputPlusMenu` 新增 Skills 子菜单；输入框新增空输入 `/` 的 Skills 面板；选中后显示可移除的 Skill chip（非纯文本注入）
4. [x] P0-4：兼容目录自动导入（`~/.agents/skills`、`~/.claude/skills`、`~/.codex/skills`、`~/.clawdbot/skills`）与 `Refresh` 重扫
   - 状态：Completed
   - 完成时间：2026-02-11
   - 验证：`main/skills/index.ts` 实现启动与 `refresh` 重扫；按目录整体导入，保留子目录结构，主目录冲突跳过，默认无提示
5. [x] P0-5：Runtime 默认注入 `available_skills`（仅元信息）
   - 状态：Completed
   - 完成时间：2026-02-11
   - 验证：`agent-runtime/index.ts` 的 `resolveSystemPrompt` 注入 `<available_skills>`（name/title/description），不注入正文
6. [x] P0-6：`skill` 工具按需加载正文 + 返回 `base_dir`/`skill_files`（本地）或 `skill_id`（Web）
   - 状态：Completed（PC 本地）
   - 完成时间：2026-02-11
   - 验证：新增 `main/agent-runtime/skill-tool.ts`，按名称返回 `<skill_content>` + `<skill_meta><base_dir>` + `<skill_files>`；Web `skill_id` 形态保留为后续扩展
7. [x] P0-7：`selectedSkill` 不可用时软降级（提示后回退普通对话继续执行）
   - 状态：Completed
   - 完成时间：2026-02-11
   - 验证：发送前校验 selected skill 是否仍存在且启用，不可用时 toast 英文提示并清空选择；请求级 `agentOptions` 覆盖确保本次发送不携带旧 skill
8. [x] P0-8：白名单直通（无权限审批/审计链路）与路径安全边界（忽略 symlink + realpath 校验）
   - 状态：Completed
   - 完成时间：2026-02-11
   - 验证：`skill` 工具仅允许加载“已安装且已启用”skill；权限系统对 `skill` 不做审批域解析；导入与扫描忽略 symlink，并做目录边界校验
9. [x] P0-9：补齐新增 skills 链路单元测试（回归）
   - 状态：Completed
   - 完成时间：2026-02-11
   - 验证：新增 `main/chat/__tests__/agent-options.test.ts` 与 `renderer/components/chat-pane/handle.test.ts`，覆盖 `selectedSkill`/context 归一化与 options 派生
10. [x] P0-10：收尾校验（lint/typecheck/test）+ 最终 code review + 全量暂存

- 状态：Completed
- 完成时间：2026-02-11
- 验证：二次执行全量校验通过；完成实现级 code review（权限链路/注入链路/输入框交互）；全部改动加入暂存区

11. [x] P0-11：发送后清理 selected skill + 消息列表显式 skill tag（本期方案 1）

- 状态：Completed
- 完成时间：2026-02-11
- 验证：`chat-prompt-input/index.tsx` 发送成功后清空 selected skill；`chat-pane/index.tsx` 将 selected skill 写入 message metadata；`components/message/index.tsx` 渲染用户消息 skill tag；补充 `types/message.test.ts` 回归测试

## 验证记录

- 2026-02-11：`pnpm lint` 通过
- 2026-02-11：`pnpm typecheck` 通过
- 2026-02-11：`pnpm test:unit` 通过
- 2026-02-11：二次校验 `pnpm lint` / `pnpm typecheck` / `pnpm test:unit` 全部通过（含新增单测）
- 2026-02-11：三次校验 `pnpm lint` / `pnpm typecheck` / `pnpm test:unit` 全部通过（含发送后清理与消息 skill tag 回归）
- 2026-02-11：四次校验 `pnpm --filter @anyhunt/moryflow-pc typecheck` 与 `pnpm --filter @anyhunt/moryflow-pc test:unit` 全部通过（含 Skills 推荐/预安装/Try 立即生效改造）
- 2026-02-11：五次校验 `pnpm --filter @anyhunt/moryflow-pc typecheck` 与 `CI=1 pnpm --filter @anyhunt/moryflow-pc test:unit` 全部通过（含“一次性预安装”状态标记修正）
- 2026-02-11：六次校验 `pnpm --filter @anyhunt/moryflow-pc typecheck` 通过（最终收尾格式化与可读性调整后复核）
- 2026-02-11：七次校验 `CI=1 pnpm --filter @anyhunt/moryflow-pc test:unit` 通过（最终提交前全量回归）
- 2026-02-11：八次校验 `pnpm lint --filter @anyhunt/moryflow-pc` 通过（目标包 lint 流程通过）

## 行为准则（实施阶段）

1. 单步推进：一次只做一个步骤，避免多需求混改。
2. 步骤闭环：每步必须包含代码、测试、验证结果，缺一不可。
3. 即时同步：每步完成后立刻回写本文件的进度状态，不延迟。
4. 失败可见：步骤失败时也要记录“失败原因 + 下一步修正动作”，不允许静默跳过。
5. 单一数据源：skill 元信息只从系统注入最小集合；正文与路径只从 `skill` tool 返回。
6. C 端优先：默认路径以直觉交互为主（`+` 与空输入 `/`），高级命令不影响主路径。
7. 不做历史兼容：按最佳实践直接收敛目标结构，不保留旧分支逻辑。

## 增量方案（已实施）：推荐预设 + Try 立即生效

> 目标：满足你最新确认的交互，不额外引入复杂配置层；保持单一数据源、易维护。

### A. 推荐技能与预安装（固定三项）

1. 推荐区固定展示 3 个技能（来自本地预设目录）：
   - `skill-creator`（Skill Creator）
   - `find-skills`（Find Skills）
   - `baoyu-article-illustrator`（Article Illustrator）
2. 首次启动自动预安装 2 个技能：
   - `skill-creator`
   - `find-skills`
3. 预安装/安装动作统一为“按目录整体复制”：
   - 从安装包预设目录复制到 `~/.moryflow/skills/<name>/`
   - 保留 `scripts/`、`templates/`、`references/` 等子目录
   - Prompt 不再额外硬编码，统一以 `SKILL.md` 正文为准（单一数据源）

### B. `New skill` 行为改造（不再本地脚手架创建）

1. `+ New skill` 按钮改为复用 `Try Skill Creator`：
   - 不再调用 `createSkill()` 直接创建空目录模板
   - 直接进入“Skill Creator 引导会话”路径
2. 用户创建新技能的主路径收敛为：
   - `Skills > New skill`（等价于 Try Skill Creator）
   - `Skills > Skill Creator > Try`（同一行为）

### C. `Try skill` 立即生效（修复“下个会话才生效”）

1. 点击 `Try` 时立即执行：
   - 新建会话（thread）
   - 切换到新会话
   - 将选中 skill 绑定到该新会话输入态（显示 skill tag）
2. 生效时机：
   - 不等待下一次会话切换
   - 新会话第一条消息即可使用该 skill
3. 发送后清理规则保持不变：
   - 发送成功立即清空输入框 skill tag（以及输入框内容）
   - 消息列表保留该条消息的 skill tag 回显

### D. 实施边界（避免过度设计）

1. 不新增“推荐源配置中心”或远端 CMS。
2. 不引入第二套 prompt 存储；只认 `SKILL.md`。
3. 不新增复杂状态机；仅补齐 “Try -> new thread -> selected skill draft” 这条最短链路。

### E. 执行计划（本轮新增）

> 进度同步规则沿用上文：每步完成后立刻回写本节状态，避免上下文压缩丢失。

1. [x] P0-12：将 Recommended 收敛为本地三项（Skill Creator / Find Skills / Article Illustrator）
   - 状态：Completed
   - 完成时间：2026-02-11
   - 验证：`main/skills/index.ts` 的 curated 推荐池固定为 `skill-creator`、`find-skills`、`baoyu-article-illustrator`；推荐区仅展示“未安装项”，文案优先读取对应预设 `SKILL.md`
2. [x] P0-13：首次启动预安装 `skill-creator`、`find-skills`
   - 状态：Completed
   - 完成时间：2026-02-11
   - 验证：`refresh()` 链路新增 `ensurePreinstalledSkills()`；仅预安装标记为 `preinstall: true` 的 skill（当前为前两项）
3. [x] P0-14：`New skill` 改为复用 `Try Skill Creator` 行为
   - 状态：Completed
   - 完成时间：2026-02-11
   - 验证：`SkillsPage` 的 `New skill` 不再调用 `createSkill`，改为 `startSkillThread('skill-creator', { autoInstall: true, autoEnable: true })`
4. [x] P0-15：`Try skill` 改为“立即新建会话并生效”
   - 状态：Completed
   - 完成时间：2026-02-11
   - 验证：`startSkillThread` 统一执行 `createSession -> setSelectedSkillName -> setSub('chat')`，详情弹层 `Try` 成功后立即关闭并跳转

### F. 本轮行为准则（新增）

1. 推荐、预安装、安装三者统一走“目录复制 + SKILL.md 解析”链路。
2. “New skill”不再分叉实现，必须复用 `Try Skill Creator`，避免两套逻辑漂移。
3. 用户视角下的生效必须“即时可见”：Try 后立刻看到新会话与 skill tag。
4. 不做历史兼容保留：旧的 `createSkill` 脚手架路径在迁移后直接删除。
