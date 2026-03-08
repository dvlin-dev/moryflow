# Moryflow WWW 首页能力承接改造冻结方案

**状态：** 已冻结，可直接作为后续实施依据
**适用范围：** `apps/moryflow/www` 首页中段信息架构与 footer 对齐改造
**不包含：** Hero / 首页第一个区块的任何结构或文案调整

---

## 1. 背景

当前 `apps/moryflow/www` 的首页已经具备基础区块：

- Hero
- Why Moryflow
- How it works
- Use Cases
- Social Proof
- Publishing
- Final Download CTA

但首页中段仍存在两个明显问题：

1. footer 中已经在暴露的能力和优势，没有在首页获得同等级承接
2. 首页表达偏抽象，用户很难快速把 Moryflow 理解为一个完整产品，而不是一组泛化能力描述

当前 footer 实际在售卖的内容分为三类：

- 产品入口：`Features`、`Use Cases`、`Download`、`Pricing`
- 差异化入口：`vs Notion`、`vs Obsidian`、`vs Manus`、`vs Cowork`、`vs OpenClaw`
- 关键能力入口：`Telegram AI Agent`、`Notes to Website`

冻结后的首页必须把这三类内容中的高价值部分上移到首页中段，让首页本身能够完成“产品定义 + 能力解释 + 差异说明 + 下载收口”。

---

## 2. 已确认约束

### 2.1 不可变更项

- Hero 不在本次范围内
- 首页第一个区块不动
- 全站主转化目标仍然是 `Download`

这里的“首页第一个区块不动”，按当前实现理解为：

- [AgentFirstHero.tsx](../../apps/moryflow/www/src/components/landing/AgentFirstHero.tsx)
- [CorePillarsSection.tsx](../../apps/moryflow/www/src/components/landing/CorePillarsSection.tsx)

后续实施时不得对这两个区块做结构重排或文案重写；最多允许为了样式一致性进行非语义级微调，但默认不改。

### 2.2 已确认方向

- 接受把 `Telegram AI Agent`、`Notes to Website`、`对比优势` 明确上移到首页中段
- 首页从“极简下载页”转为“完整产品叙事页”
- `Why not just Notion / Obsidian / OpenClaw` 必须放在 `Notes to Website / Publishing` 上面

---

## 3. 改造目标

本次首页改造只解决一个问题：

**让 footer 中已经在承诺的能力与优势，在首页中段被用户真正看见并理解。**

首页读完后，用户应当得到以下结论：

1. Moryflow 不只是一个 AI 聊天工具，而是 knowledge-native 的 agent workspace
2. 它既支持桌面端内的 agent workflow，也支持 Telegram 这种 chat-first 入口
3. 它不只是记笔记，还能把知识继续发布为网站
4. 它与 Notion / Obsidian / OpenClaw 的差异是产品路径不同，而不是单点功能对比
5. 下一步动作仍然是下载桌面端

---

## 4. 冻结后的首页结构

冻结后的首页结构按以下顺序执行：

1. Hero
   现状保留，不在本次范围内

2. Why Moryflow
   现状保留，不在本次范围内

3. How it works
   保留区块，但文案改为更贴近真实使用路径

4. Use Cases
   保留区块，但每个场景卡片增加能力映射感

5. Telegram AI Agent
   新增独立能力区块

6. Compare
   新增轻量对比区块，位置必须在 Publishing 前

7. Notes to Website / Publishing
   保留现有 Publishing 区块，但升级为明确能力说明

8. Social Proof
   保留为轻量信任补充，不承担主叙事职责

9. Final Download CTA
   继续作为首页唯一收口动作

说明：

- `Compare` 放在 `Publishing` 上面，是本次冻结方案里的硬顺序
- `Telegram AI Agent` 与 `Publishing` 都不再只是“去别的页面了解更多”，而是首页中段主能力
- `Social Proof` 降级为辅助区块，不再位于功能闭环的核心位置

---

## 5. 各区块职责冻结

### 5.1 How it works

**职责：** 把抽象流程改成用户能代入的真实工作流。

冻结表达方向：

- Capture knowledge
- Ask agent
- Continue in desktop or Telegram
- Publish when ready

要求：

- 不再只写通用流程词，如 `Collect context / Run tasks`
- 必须显式出现 `Telegram` 或 “chat-first entry” 的含义
- 最后一步继续收口到 `publish`

对应组件：

- [WorkflowLoopSection.tsx](../../apps/moryflow/www/src/components/landing/WorkflowLoopSection.tsx)

### 5.2 Use Cases

**职责：** 把四个场景和实际能力绑定，避免只有场景、没有产品抓手。

冻结表达方向：

- Research workflows + Memory
- Writing and drafting + Agent workflows
- Personal knowledge base + Local-first notes
- Digital garden + Publishing

要求：

- 每个 use case 卡片必须让用户看出“这个场景靠什么能力成立”
- 链接仍然指向 `/use-cases` 对应锚点，不改为首页内展开

对应组件：

- [UseCasesSection.tsx](../../apps/moryflow/www/src/components/landing/UseCasesSection.tsx)

### 5.3 Telegram AI Agent

**职责：** 把 footer 里的 `Telegram AI Agent` 从资源链接提升为首页核心能力。

冻结表达方向：

- 在 Telegram 中直接与 agent 交互
- 回答仍然基于你的本地知识与笔记
- 对话结果会回流到 workspace，形成可继续编辑和积累的知识

区块形式建议：

- 单独横向 section
- 左侧讲能力与价值
- 右侧展示 3 个简短要点或一个 Telegram 对话示意

禁止事项：

- 不暗示支持 Telegram 以外的更多消息渠道
- 不把它写成“随便一个 bot”
- 不写成独立产品，而是 Moryflow workspace 的延伸入口

建议 CTA：

- 主链接到 `/telegram-ai-agent`
- 辅助文案继续服务于下载主转化，而不是把 CTA 重心切走

建议新增组件：

- `apps/moryflow/www/src/components/landing/TelegramAgentSection.tsx`

### 5.4 Compare

**职责：** 在首页中段提前解释“为什么不是直接用别的工具”，降低用户跳出和误判。

冻结表达方向：

- `vs Notion`
  - Notion 更偏云端协作与文档系统
  - Moryflow 更强调 local-first + AI agent workspace + publishing

- `vs Obsidian`
  - Obsidian 更偏本地笔记与插件生态
  - Moryflow 更强调集成式 AI workflow、knowledge-grounded agent 与一体化发布

- `vs OpenClaw`
  - OpenClaw 更偏 self-hosted、多渠道 agent gateway
  - Moryflow 更偏 desktop-first、knowledge-native、面向个人知识工作的 agent workspace

要求：

- 首页只做轻量摘要，不上重表格
- 每张对比卡只回答“适合谁、路径差在哪”
- 保持克制，不做攻击性措辞
- 详细展开继续落到 `/compare/notion`、`/compare/obsidian`、`/compare/openclaw`

说明：

- `Manus`、`Cowork` 仍保留在 footer 与 compare 页面体系中
- 但首页首批只突出 `Notion / Obsidian / OpenClaw`
- 原因是这三个更直接对应用户当前认知分流

建议新增组件：

- `apps/moryflow/www/src/components/landing/CompareStripSection.tsx`

### 5.5 Notes to Website / Publishing

**职责：** 把 `Publishing` 从“顺手提一下”升级为明确产品能力。

冻结表达方向：

- 不需要 CMS
- 不需要复制粘贴和重复搬运
- 编辑笔记即可更新网站

该区块要回答的问题不是“我们也能发布”，而是：

**为什么一个 agent workspace 还要具备 publishable output。**

固定价值解释：

- Agent 结果不是一次性聊天记录，而是可沉淀的知识资产
- 知识资产不应停留在本地，还应能低摩擦变成公开网站
- 因此 `notes -> website` 是 Moryflow 产品闭环的一部分，不是附属功能

要求：

- 保留到 `/notes-to-website` 的入口
- 允许出现 2 到 3 个 bullet，但不要做成大篇幅 SEO 文案
- 不再使用泛 placeholder 式表达

对应组件：

- [PublishingSection.tsx](../../apps/moryflow/www/src/components/landing/PublishingSection.tsx)

### 5.6 Social Proof

**职责：** 轻量增强可信度，不承担核心产品说明。

冻结要求：

- 若暂无真实数据，只保留非常轻的 beta / early adopters 表达
- 不允许虚构下载量、用户数、媒体背书
- 视觉存在感低于 Telegram、Compare、Publishing

对应组件：

- [SocialProofSection.tsx](../../apps/moryflow/www/src/components/landing/SocialProofSection.tsx)

### 5.7 Final Download CTA

**职责：** 首页所有解释最终都收口到下载。

冻结要求：

- 不改变“下载桌面端”这一主转化
- 不增加注册、预约、联系销售等平行动作
- CTA 文案可继续按平台识别，但产品利益点要与中段叙事一致

对应组件：

- [DownloadCTA.tsx](../../apps/moryflow/www/src/components/landing/DownloadCTA.tsx)

---

## 6. 文案原则冻结

### 6.1 首页必须说清的三件事

- Moryflow 是 `agent workspace`
- Moryflow 的 agent 以 `knowledge / notes / local context` 为中心
- Moryflow 的输出可以继续 `publish`

### 6.2 首页不再采用的表达方式

- 只有抽象优势，没有具体能力入口
- 只说 “AI agents work with your knowledge”，但不解释 Telegram 和 Publishing
- 把 Compare 完全藏到 footer

### 6.3 Compare 文案边界

- 采用 “different paths” 而不是 “better than everything”
- 重点讲产品路径和适用人群，不讲情绪化优劣
- 不夸大 Moryflow 当前不存在的渠道能力或自动化范围

### 6.4 Telegram 文案边界

- 当前只写 Telegram
- 必须明确它是现有能力
- 不写“multi-channel”“omnichannel”“everywhere”

### 6.5 Publishing 文案边界

- 可以写 clean website / digital garden / publish notes
- 不写复杂 CMS 能力、团队内容管理能力或多角色发布流程
- 如需提到域名能力，必须以后续实现事实为准

---

## 7. 组件与路由改造范围冻结

首页主装配文件：

- [index.tsx](../../apps/moryflow/www/src/routes/{-$locale}/index.tsx)

本次允许修改或新增的首页组件：

- [WorkflowLoopSection.tsx](../../apps/moryflow/www/src/components/landing/WorkflowLoopSection.tsx)
- [UseCasesSection.tsx](../../apps/moryflow/www/src/components/landing/UseCasesSection.tsx)
- [PublishingSection.tsx](../../apps/moryflow/www/src/components/landing/PublishingSection.tsx)
- [SocialProofSection.tsx](../../apps/moryflow/www/src/components/landing/SocialProofSection.tsx)
- [DownloadCTA.tsx](../../apps/moryflow/www/src/components/landing/DownloadCTA.tsx)
- `apps/moryflow/www/src/components/landing/TelegramAgentSection.tsx`
- `apps/moryflow/www/src/components/landing/CompareStripSection.tsx`
- [index.ts](../../apps/moryflow/www/src/components/landing/index.ts)

本次默认不动：

- [AgentFirstHero.tsx](../../apps/moryflow/www/src/components/landing/AgentFirstHero.tsx)
- [CorePillarsSection.tsx](../../apps/moryflow/www/src/components/landing/CorePillarsSection.tsx)

文案与 footer 数据源允许修改：

- [i18n.ts](../../apps/moryflow/www/src/lib/i18n.ts)
- [marketing-copy.ts](../../apps/moryflow/www/src/lib/marketing-copy.ts)

---

## 8. Footer 对齐冻结要求

footer 需要与首页中段形成明确对应关系：

- `Telegram AI Agent`
  首页必须存在对应能力区块

- `Notes to Website`
  首页必须存在对应能力区块

- `Compare`
  首页必须存在轻量对比区块，而不是只留 footer 链接

此外，contact 邮箱冻结为：

- `dvlin.dev@gmail.com`

对应修改点：

- [marketing-copy.ts](../../apps/moryflow/www/src/lib/marketing-copy.ts)

---

## 9. 验收标准

完成后，首页需要满足以下标准：

1. 不看 footer，只看首页主内容，也能知道 Moryflow 支持 Telegram agent access
2. 不看 footer，只看首页主内容，也能知道 Moryflow 支持 notes-to-website / publishing
3. 用户在首页中段就能理解为什么不是直接选 Notion、Obsidian 或 OpenClaw
4. 首页仍然只有一个主转化方向：下载桌面端
5. Hero 与首页第一个区块未被改动
6. footer contact 已改为 `dvlin.dev@gmail.com`

---

## 10. 实施备注

这是冻结版设计文档，不记录实施过程，不记录阶段性状态，不记录 review 往返。

后续如果进入实现，应以本文件为准；如需调整首页区块顺序或职责，必须先更新本文件，再实施。

---

## 11. 具体实施步骤

### Step 1. 补首页装配顺序的回归保护

- 为首页区块顺序增加可测试的数据源
- 明确冻结后的首页顺序为：
  - `hero`
  - `pillars`
  - `workflow`
  - `use-cases`
  - `telegram`
  - `compare`
  - `publishing`
  - `social-proof`
  - `download-cta`
- 为 `compare` 目标增加可测试配置，限定首页首批只展示：
  - `notion`
  - `obsidian`
  - `openclaw`

### Step 2. 先写失败测试

- 更新或新增 `apps/moryflow/www/src/components/__tests__/*` 单元测试
- 至少覆盖以下断言：
  - footer `contact` 链接改为 `dvlin.dev@gmail.com`
  - 首页区块顺序中 `compare` 位于 `publishing` 前
  - 首页对比区只突出 `Notion / Obsidian / OpenClaw`
  - 首页新增 `Telegram AI Agent` 区块的数据配置存在

### Step 3. 调整首页路由装配

- 修改 [index.tsx](../../apps/moryflow/www/src/routes/{-$locale}/index.tsx)
- 保持 Hero 与第一个区块原样不动
- 将中后段顺序改为：
  - `WorkflowLoopSection`
  - `UseCasesSection`
  - `TelegramAgentSection`
  - `CompareStripSection`
  - `PublishingSection`
  - `SocialProofSection`
  - `DownloadCTA`

### Step 4. 改造 How it works

- 修改 [WorkflowLoopSection.tsx](../../apps/moryflow/www/src/components/landing/WorkflowLoopSection.tsx)
- 将流程文案改为真实使用路径
- 必须显式包含 Telegram 入口含义
- 最后一步继续收口到发布

### Step 5. 改造 Use Cases

- 修改 [UseCasesSection.tsx](../../apps/moryflow/www/src/components/landing/UseCasesSection.tsx)
- 每个卡片增加“场景由哪项能力支撑”的表达
- 保持跳转到 `/use-cases` 页面锚点

### Step 6. 新增 Telegram AI Agent 区块

- 新建 `apps/moryflow/www/src/components/landing/TelegramAgentSection.tsx`
- 区块内容固定围绕三点：
  - Telegram 中直接问 agent
  - 回答基于本地知识
  - 结果回流 workspace
- CTA 指向 `/telegram-ai-agent`

### Step 7. 新增 Compare 区块

- 新建 `apps/moryflow/www/src/components/landing/CompareStripSection.tsx`
- 首页只展示 `Notion / Obsidian / OpenClaw`
- 每张卡都只讲“产品路径差异”和“适合谁”
- CTA 指向各自 compare 页面

### Step 8. 升级 Publishing 区块

- 修改 [PublishingSection.tsx](../../apps/moryflow/www/src/components/landing/PublishingSection.tsx)
- 去掉“顺手提一下”的表达方式
- 必须明确：
  - 不需要 CMS
  - 不需要重复搬运
  - 编辑笔记即可更新网站
- CTA 继续指向 `/notes-to-website`

### Step 9. 降级 Social Proof

- 修改 [SocialProofSection.tsx](../../apps/moryflow/www/src/components/landing/SocialProofSection.tsx)
- 仅保留轻量 beta / early adopters 信号
- 不抢 Telegram、Compare、Publishing 的视觉权重

### Step 10. 更新首页相关文案与导出

- 修改 [i18n.ts](../../apps/moryflow/www/src/lib/i18n.ts)
- 增加 Telegram、Compare、Publishing、Workflow、Use Cases 所需中英文文案
- 修改 [index.ts](../../apps/moryflow/www/src/components/landing/index.ts)
- 导出新增区块组件

### Step 11. 修改 footer 联系方式

- 修改 [marketing-copy.ts](../../apps/moryflow/www/src/lib/marketing-copy.ts)
- 将 `contact` 邮箱改为：
  - `dvlin.dev@gmail.com`

### Step 12. 运行验证并修正

- 先跑 `@moryflow/www` 受影响单测
- 再跑 `@moryflow/www` 的 `typecheck`
- 再跑 `@moryflow/www` 的 `build`
- 如任一步失败，必须先修正再继续

### Step 13. 做全量 code review

- 基于本次 diff 做一次完整人工 review
- 重点检查：
  - 首页顺序是否符合冻结方案
  - Hero 与第一个区块是否被误改
  - 文案是否夸大不存在能力
  - Compare 是否保持克制
  - Telegram 与 Publishing 是否已成为首页主能力
  - footer 联系方式是否已经替换

### Step 14. 加入暂存区

- 验证与 review 完成后，将本次改动加入 git 暂存区
- 不执行 `git commit`
