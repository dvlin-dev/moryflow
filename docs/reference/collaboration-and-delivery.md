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

- 开发者相关内容使用中文：文档、代码注释、提交信息、`CLAUDE.md`
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
- `completed / implemented / confirmed` 文档在合并前必须冻结为“当前状态 / 当前实现 / 当前验证基线”
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

## Git 规范

- 每个提交只包含一个逻辑变更
- 提交信息使用 Conventional Commits
- 作用域使用产品/模块名，如 `auth`、`moryflow/mobile`、`fetchx/server`

## 继续阅读

- 仓库上下文：`docs/reference/repository-context.md`
- 测试与验证：`docs/reference/testing-and-validation.md`
- 工程规范：`docs/reference/engineering-standards.md`
