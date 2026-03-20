---
title: Hermes Agent 开源实现调研与可借鉴点
date: 2026-03-12
scope: moryflow/pc, agents-runtime, docs/design/moryflow/core
status: active
---

# Hermes Agent 开源实现调研与可借鉴点

## 调研范围

本调研基于 `NousResearch/hermes-agent` 仓库在 2026-03-12 拉取到本地的代码快照：

- 仓库：`https://github.com/NousResearch/hermes-agent`
- 快照 commit：`8fa96debc9d5225350ecd468b04adb7a61d1fe70`
- 关注范围：Agent 主循环、持久记忆、会话检索、技能系统、自我改进提示、定时任务、CLI/TUI、多入口会话

本文件只记录已从代码验证的实现事实，以及对 Moryflow / Anyhunt 的借鉴判断；不复述营销文案。

## 一句话判断

Hermes 的核心价值不在“AI 会自己成长”这句口号，而在于它把四种长期能力接成了一个闭环：

1. 会话内完成任务
2. 把可复用经验沉淀为 memory / skill
3. 用 SQLite 检索历史会话并做摘要召回
4. 用 cron 把 agent 重新拉起，在新会话里继续完成自动化任务

这套闭环是成立的，但实现风格明显偏 CLI-first、本地目录-first、单体 Python runtime；适合借鉴其机制，不适合原样搬进 Moryflow。

## 代码层面确认的关键实现

### 1. 主运行时是单体 Agent Loop，记忆/技能/检索/调度都挂在同一条链路上

- `run_agent.py` 是绝对主入口，负责系统提示词拼装、tool loop、context compression、memory flush、Honcho 同步、会话持久化。
- `AIAgent._build_system_prompt()` 会把 agent identity、memory snapshot、skills 索引、context files、平台提示拼成稳定 system prompt。
- system prompt 按 session 缓存，只有压缩或新会话时才重建；这保证了 prefix cache 命中，但也意味着“本轮新写入的 memory 不会立刻反映到 system prompt”，而是在下一次 session 生效。

判断：这不是“外挂式功能堆叠”，而是一个围绕“稳定提示词 + 外部状态存储”组织起来的运行时。

### 2. 它的“持久记忆”其实是两层存储，不是一个神秘黑盒

Hermes 的持久记忆不是单一向量库，而是三层并存：

1. `~/.hermes/memories/MEMORY.md`
   记录环境事实、项目约定、已学到的方法。
2. `~/.hermes/memories/USER.md`
   记录用户偏好、沟通方式、长期习惯。
3. Honcho 外部用户模型
   在开启时额外维护跨会话 user representation，并在首轮对话前做 prefetch。

其中前两层由 `tools/memory_tool.py` 管理：

- 采用文件持久化，不是数据库。
- 使用 entry delimiter 分段、字符上限控制、原子写入。
- 对写入内容做 prompt injection / exfiltration 的正则扫描。
- mid-session 写盘立即生效，但 system prompt 仍使用 session 启动时的 frozen snapshot。

`run_agent.py` 还实现了两种“促发机制”：

- `memory_nudge_interval`
  对话若持续多轮，会在用户消息尾部注入提醒，促使模型考虑写 memory。
- `flush_memories()`
  在 reset / compression / 退出等时机，用一个额外的小模型调用 memory tool，把本轮值得保留的信息补刷到 memory。

判断：Hermes 的“会记住”本质上是“显式 memory tool + 自动提醒 + 退出前补刷”，不是模型自发稳定学会长期记忆。

### 3. 它的跨会话召回靠 SQLite FTS5，不靠向量库幻觉

`hermes_state.py` 定义了统一的 session store：

- `sessions` / `messages` 两张主表
- `messages_fts` FTS5 虚表
- WAL 模式，兼顾 gateway 多线程读写

`tools/session_search_tool.py` 的流程很清晰：

1. 对历史消息做 FTS5 搜索
2. 按 session 去重，并沿 `parent_session_id` 回溯到主会话
3. 取相关会话的完整 transcript
4. 裁剪到匹配上下文附近
5. 再交给一个便宜模型做 focused summary

这意味着 Hermes 的“我能搜索过去的对话并回忆起事情”是一个很工程化的两段式方案：

- 粗召回：SQLite 全文检索
- 精提炼：LLM 摘要

判断：这是当前仓库里最值得借鉴的一块，因为它简单、透明、可控，而且已经和会话模型打通。

### 4. 它的“技能自进化”是文件系统上的 procedural memory

Hermes 把 skills 定义成 `SKILL.md + supporting files` 的目录结构，核心实现分三层：

1. `tools/skills_tool.py`
   负责 `skills_list` / `skill_view`，用 progressive disclosure 控制上下文成本。
2. `tools/skill_manager_tool.py`
   允许 agent 创建、编辑、patch、删除 skill 及引用文件。
3. `tools/skills_sync.py`
   把仓库内置 skills 同步到 `~/.hermes/skills/`，并用 manifest 记录“用户是否改过”，避免覆盖用户定制。

配套机制还有：

- `agent/prompt_builder.py` 中的 `SKILLS_GUIDANCE`
  在 system prompt 明示“复杂任务后考虑沉淀 skill”。
- `run_agent.py` 中的 `creation_nudge_interval`
  工具调用迭代数达到阈值后，在下一条用户消息追加提醒。
- `tools/skills_guard.py`
  对社区技能和 agent-created 技能做静态扫描，拦截明显的 exfiltration / persistence / destructive pattern。

判断：Hermes 真正做对的一点，不是“自动生成 skill”，而是把 skill 当成可读、可 diff、可 patch、可同步、可审查的普通文件资产来管理。

### 5. 定时任务不是 UI 小功能，而是“重新启动 agent 的调度平面”

cron 相关实现主要在 `tools/cronjob_tools.py`、`cron/jobs.py`、`cron/scheduler.py`：

- 任务存储在 `~/.hermes/cron/jobs.json`
- 输出归档到 `~/.hermes/cron/output/<job_id>/<timestamp>.md`
- `schedule_cronjob` 强制 prompt 自包含，因为执行时一定是 fresh session
- scheduler 用文件锁防止重复 tick
- job 到时后重新 new 一个 `AIAgent` 去执行 prompt
- 结果可投递回 origin chat、指定平台、或只存本地

这套设计的关键不是 cron 表达式，而是两个产品决策：

1. 自动化任务必须是“可离线执行的 agent prompt”
2. 自动化结果天然和会话系统、消息投递系统打通

判断：这是比“定时提醒”更高一级的能力，接近“可调度的 agent job”。

### 6. CLI/TUI 并不是壳，而是正式的长期工作界面

`cli.py` 不是简单 REPL，而是完整 TUI：

- `prompt_toolkit` 多行输入
- slash command autocomplete
- `FileHistory` 本地输入历史
- SQLite session resume
- resumed history recap
- tool progress、clarify、sudo、dangerous command approval 都接到了同一 UI

判断：Hermes 之所以能承载“长期个人助理”体验，一个重要原因是它先把 CLI 当成主产品，而不是 demo 入口。

## 对 Moryflow / Anyhunt 最值得借鉴的部分

### P0：建议优先吸收

### 1. 会话检索与摘要召回

Moryflow 当前最缺的不是“更多记忆概念”，而是把历史线程、文件、任务结果真正召回给当前 agent 的能力。

建议直接借鉴 Hermes 的两段式设计：

- 本地或服务端先做结构化全文索引
- 再用小模型生成与当前问题强相关的摘要
- 召回结果必须挂回当前 thread / task，而不是只显示一串搜索结果

这块可优先接到：

- Threads 历史
- Vault 文件变更与命中片段
- 已完成 agent tasks 的结果摘要

### 2. 显式区分“用户画像”和“环境记忆”

Hermes 把 `USER.md` 和 `MEMORY.md` 分开是正确的。Moryflow 也应该避免把所有长期信息揉成一个 store。

建议拆成至少两层：

- `user profile`
  用户偏好、表达风格、常用模型、对结果的要求
- `workspace memory`
  当前 vault / workspace 的目录约定、发布流程、脚本入口、项目事实

这样才能控制权限边界，也更容易决定哪些内容进 prompt、哪些只做检索。

### 3. skills 资产的“基线同步 + 用户可改 + 安全更新”模型

Hermes 的 manifest 同步机制很适合我们当前的 built-in skills 能力：

- 内置技能从安装包提供 baseline
- 用户本地修改后，不被后续更新覆盖
- 新版基线只覆盖“用户未改动”的 skill

这比单纯的“在线拉最新版本强覆盖”更稳，尤其适合桌面端离线优先的 Moryflow PC。

### 4. 自动化任务必须以“自包含任务包”建模

Hermes 把 cron job 视为 fresh session，这一点非常值得借鉴。Moryflow 若做自动化，不能偷懒依赖“延续当前会话上下文”。

建议自动化实体至少包含：

- prompt / objective
- scope（workspace、vault、thread、site）
- schedule
- delivery target
- last result summary
- failure policy

否则用户一旦跨天、跨设备、跨线程，自动化就会变成不稳定的黑盒。

### P1：可以借鉴，但需要改造成 Moryflow 风格

### 1. 技能自进化要改成“提案制”，不要直接生产生效

Hermes 允许 agent 直接写 skill 文件，这对 CLI power user 可行，但对 Moryflow 不够稳。

更适合 Moryflow 的方式是：

1. agent 发现可复用流程
2. 生成 skill draft
3. 用户或系统 review
4. 通过后再进入 active skills

最好补一层验证：

- 引用文件是否存在
- prompt 是否越权
- 是否和已有 skill 重复
- 是否通过最小回放测试

### 2. 记忆 nudges 可以保留，但触发位置不能污染用户主对话

Hermes 通过往用户消息尾部拼接 system nudge 来提醒模型“记得写 memory / skill”。这个方法有效，但对图形化产品不够优雅。

Moryflow 更适合：

- 在 run metadata 中注入非用户可见的 runtime hint
- 或在 task completion hook 阶段触发 post-run summarizer
- 而不是把提醒文本混进用户消息正文

### 3. Honcho 类用户建模值得做，但不该直接依赖外部第三方

Hermes 的 Honcho 集成证明“用户长期画像”有产品价值，但对我们更合理的路径不是接第三方，而是复用 Memox / Moryflow 自己的知识层。

建议方向：

- 以 Thread / Note / Preference / Behavior signal 生成用户长期画像
- 做成受用户可见、可编辑、可清理的 profile graph
- 只把压缩后的 profile summary 注入 agent runtime

### P2：不建议直接跟进

### 1. 不建议复制 Hermes 的“单体 `run_agent.py`”

Hermes 在 Python 单仓里这样组织尚可，但 Moryflow 当前是多端、多包、分层 runtime。我们应借鉴机制，不应回退到单文件统管所有状态。

### 2. 不建议把“自动写 memory / skill”默认开到过于激进

Hermes 偏个人本地 agent，因此容忍 agent 主动写很多长期状态。Moryflow 面向更广用户时，必须更强调可见性、可撤销性和范围控制。

### 3. 不建议优先投入完整多平台消息网关

Hermes 的 Telegram / Discord / Slack / Signal 一体化很强，但这不是 Moryflow 当前主线。现阶段更该先把 PC 内的长期会话、自动化与发布链路做深，而不是扩散入口。

## 对当前架构的直接建议

### 建议 1：把“长期记忆”从概念收敛成三种受管资产

Moryflow 可以明确只做三类长期状态：

1. `Profile`
   用户级偏好与工作习惯
2. `Workspace Memory`
   当前 vault / workspace 的结构化事实
3. `Recall Index`
   线程、文件、任务结果的检索索引

不要把“记忆”继续混成一个抽象大词。

### 建议 2：补一个统一的 recall tool，而不是零散 search

Hermes 的经验表明，真正被模型稳定使用的不是“UI 上有搜索框”，而是 runtime 内存在一个成本明确、结果受控的 recall tool。

Moryflow 可以补一个统一入口，按目标源路由：

- files
- threads
- tasks
- published sites
- user/profile memory

### 建议 3：skills 生命周期改成四段

建议统一为：

1. bundled
2. installed
3. draft
4. active

其中 draft 来源可以是：

- 官方更新
- 用户导入
- agent 自动提案

这样才能兼容“内置 baseline、在线同步、用户改造、agent 自演进”四种来源。

### 建议 4：自动化优先服务 Moryflow 主链路

比起通用 cron，更适合我们先落地的自动化是：

- 每日站点表现摘要
- 每周 vault 内容回顾
- 定期未发布草稿盘点
- 指定目录内容整理/打标签
- 远程 agent 定时巡检

即先围绕“知识整理 + 发布 + 运营回顾”做自动化，而不是追求泛化任务调度器。

## 最终结论

Hermes Agent 最值得我们学习的，不是“AI 会自己成长”这种叙事，而是它把长期状态拆成了真正可运行的工程件：

- 文件型 memory
- SQLite FTS 会话检索
- 文件系统 skills
- fresh-session cron jobs
- 跨入口共享会话状态

对 Moryflow 来说，最该优先借鉴的是“Recall + 分层记忆 + Skills 生命周期 + 自包含自动化任务”这四件事。

不建议照搬 Hermes 的点也很明确：

- 不照搬单体 Python runtime
- 不照搬直接生效的 agent 自写技能
- 不把多平台消息网关当成当前主线

如果后续要进入实现，优先级建议为：

1. 统一 recall tool 与历史摘要召回
2. 用户画像 / 工作区记忆分层
3. skills draft-review-activate 生命周期
4. 面向发布与知识工作的自动化任务系统
