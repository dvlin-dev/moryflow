---
title: 协作与交付
date: 2026-03-08
scope: monorepo
status: active
---

<!--
[INPUT]: 协作规则、文档同步原则、PR 与 git 提交约束
[OUTPUT]: 稳定且可执行的交付基线
[POS]: docs/reference/ 协作规范

[PROTOCOL]: 仅在协作规则、交付流程或文档同步边界失真时更新本文件。
-->

# 协作与交付

## 语言规范

- 开发者相关内容使用中文：文档、代码注释、`CLAUDE.md`
- Git commit message 使用英文，不得使用中文
- 用户可见内容使用英文：界面文案、报错信息、API 响应消息
- 对话沟通使用中文

## 协作原则

- 先查后做：不猜实现，先搜索现有代码与设计文档
- 复用优先：接口、类型、工具优先复用
- 根因治理优先：禁止补丁式修复，回到事实源和职责边界收口
- 外部 review 先判定后执行：先复现或走读确认其对当前代码库成立
- AI 不得擅自 `git commit` / `git push` / `git tag`，除非用户明确授权

## 文档同步协议

- `CLAUDE.md` 只承载稳定上下文：目录职责、结构边界、公共契约、关键约束、核心入口
- 只有当目录职责、结构、跨模块契约、关键约束失真时，才更新对应 `CLAUDE.md`
- `index.md` 只做导航：文档入口、状态、一行摘要
- design/runbook 正文是唯一事实源
- `docs/design/*` 文件名只表达主题、架构、基线或能力边界；流程状态统一放在 frontmatter `status`
- 新需求的 design doc / implementation plan 默认先写入 `docs/plans/*`
- `completed / implemented / confirmed` 文档在合并前必须冻结为“当前状态 / 当前实现 / 当前验证基线”
- 涉及 Harness 闭环的变更，必须区分“长期基线文档”和“执行期计划文档”：稳定事实回写 `docs/design/*`，执行步骤留在 `docs/plans/*`
- 当 `pnpm docs:garden` 输出 `rewrite-to-design` 或 `delete` 时，本轮必须同步处理对应计划文档或悬空引用
- 禁止在代码注释、Header、`CLAUDE.md`、`index.md` 中记录 `[UPDATE]`、日期、PR/Issue、Step、review 流水或测试通过播报

## 文件 Header 规范

关键文件使用以下头部格式：

| 文件类型   | 格式                                 |
| ---------- | ------------------------------------ |
| 服务/逻辑  | `[INPUT]` / `[OUTPUT]` / `[POS]`     |
| React 组件 | `[PROPS]` / `[EMITS]` / `[POS]`      |
| 工具函数集 | `[PROVIDES]` / `[DEPENDS]` / `[POS]` |
| 类型定义   | `[DEFINES]` / `[USED_BY]` / `[POS]`  |

补充约束：

- Header 只描述当前职责、依赖和契约位置
- 仅在头部事实变化时更新 Header
- 历史演进统一依赖 git / PR / changelog

## 工作流程

1. 计划：说明改动范围、动机、风险；存在关键不确定点时先澄清
2. 实施：聚焦单一问题，不盲改
3. 验证：按风险等级做最小必要验证
4. 同步：仅更新失真的事实源文档、索引与 `CLAUDE.md`

## PR 处理流程

1. 先同步最新 `main`
2. 统一以 GitHub PR review threads 为事实源
3. 每条评论先判断是否成立，再决定是否修改
4. 禁止补丁式修复
5. 代码与文档同源，只更新失真的事实源
6. 按风险等级验证
7. 提交与推送需用户授权
8. 推送后回写并 resolve 已闭环线程

## PR Ready 后连续跟进闭环

### 授权边界

- 只有用户先明确授权“提交 PR”，AI 才能执行该次 PR 对应的 `git commit`、`git push`、`gh pr create`、`gh pr ready`
- 一旦用户已明确授权提交同一条 PR，该授权默认覆盖该 PR 后续为达成可合并状态所必需的连续动作：修复代码、补文档、再次 `commit` / `push`、回复评论、resolve review thread、修复 GitHub Actions 失败
- 该授权只对当前 PR 有效，不自动扩展到其他分支、其他 PR、`git tag`、发布动作或合并动作

### 启动条件

1. PR 已创建
2. 当需要对外进入评审时，将 PR 置为 ready
3. 从 ready 开始，持续跟进该 PR，直到达到“可合并状态”或遇到明确阻塞

### 持续跟进职责

- 持续检查 PR 的 review threads、review decision、mergeability 与 GitHub Actions 状态
- 中途不得自行停止，也不得仅因“本轮已经回复”就结束；必须继续观察后续状态变化
- 只有在以下情况才允许中断并回到用户：缺少仓库/平台权限、外部系统故障、需要产品/架构取舍、评论结论无法仅凭当前事实判断

### 评论处理规则

1. 统一以 GitHub PR review threads 为事实源，不以聊天摘录或记忆替代
2. 每条评论先判断是否对当前代码库成立；不成立时给出技术理由回复，不盲改
3. 成立时，先定位根因，再做最小必要修复；禁止补丁式堆叠
4. 修复后补充必要验证，再推送后续提交
5. 在 PR 中明确回复处理结果；仅当问题已闭环时，才 resolve 对应 review thread

### CI 失败处理规则

1. 先读取失败 check、job 与日志，确认真实失败点
2. 仅修复已确认成立的根因，不并带无关改动
3. 修复后执行受影响范围的最小必要验证
4. 推送后继续等待 CI 收敛；若仍失败，重复同一闭环直到通过或遇到明确阻塞

### 可合并状态判定

同时满足以下条件，才算达到可合并状态：

- PR 已是 ready，不再是 draft
- 必需的 GitHub Actions checks 已完成且通过；允许平台明确标记为 skipped 的非必需项
- 不存在未闭环的有效 review 阻塞
- PR mergeability 为可合并状态，例如 `CLEAN`，且不存在已知权限外阻塞

### 完成后的动作

- 向用户同步当前 PR 已达到可合并状态
- 如果仍有非阻塞信息，例如 skipped check、等待人工 review、等待合并按钮操作，可一并说明
- 未获得额外授权前，不擅自执行 merge

## `docs/plans` 完成后的事实回写

### 适用范围

- `docs/plans/*` 只承载任务期 design doc、审计稿与 implementation plan，不是长期事实源
- 新需求默认从 `docs/plans/*` 开始写；不要直接把过程态设计写进 `docs/design/*` 或 `docs/reference/*`
- 只有当其中出现“被采纳的稳定事实”时，才强制回写到 `docs/design/*` 或 `docs/reference/*`
- 纯执行计划、已过时方案、已被正式正文吸收的内容可以直接删除

### 回写判定

满足任一条件，即视为“被采纳的稳定事实”：

- 已成为当前实现、当前架构、当前协议或当前运维口径的一部分
- 后续开发、排障或协作需要把该内容当作稳定基线反复引用
- 该内容若继续只留在 `docs/plans/*`，会导致 design/reference 缺失当前真相

### 归属规则

1. 架构、协议、运行边界、产品能力、运维口径，回写到 `docs/design/*`
2. 协作规则、工程规范、验证流程、构建/部署基线，回写到 `docs/reference/*`
3. 优先更新已有事实源；只有在现有文档职责无法承载、且确实形成新的稳定边界时，才允许新建 design/reference 正文

### 清理规则

1. 回写完成后，`docs/plans/*` 中已被吸收的稳定事实不得与 design/reference 平级双写
2. 纯执行计划、临时审计稿、已过时方案可以直接删除
3. 若某份 plan 仍对后续开发有直接指导价值，可以保留，但只保留任务拆解、审计材料或尚未进入正式事实源的部分
4. 回写为 design 正文后，文件名必须改成主题/架构/基线导向，不再保留 `-plan` 这类过程态后缀
5. 合并前应完成“已回写稳定事实 / 已删除或精简冗余计划文档”的检查，避免 `docs/plans/*` 长期替代正式正文

## Git 规范

- 每个提交只包含一个逻辑变更
- 提交信息使用英文 Conventional Commits
- 作用域使用产品/模块名，如 `auth`、`moryflow/mobile`、`fetchx/server`

## 继续阅读

- 仓库上下文：`docs/reference/repository-context.md`
- 测试与验证：`docs/reference/testing-and-validation.md`
- 工程规范：`docs/reference/engineering-standards.md`
