---
title: 工程规范
date: 2026-03-08
scope: monorepo
status: active
---

<!--
[INPUT]: 前后端通用工程约束、表单与类型规范、命名与安全基线
[OUTPUT]: 可按需查阅的工程规范
[POS]: docs/reference/ 工程规则

[PROTOCOL]: 仅在跨项目工程规范、命名规则或安全基线失真时更新本文件。
-->

# 工程规范

## 请求与状态

- 前端统一采用 `Zustand Store + Methods + Functional API Client`
- 共享业务状态禁止新增 React Context（Theme/i18n 等非业务上下文除外）
- 组件优先 `useXxxStore(selector)` 就地取数，避免中间胶水层透传
- Zustand selector 禁止返回对象/数组字面量新引用
- 业务 API 统一函数导出，禁止 class 风格 API client
- 鉴权模式必须显式区分 `public | bearer | apiKey`
- 服务端业务代码禁止直写 `fetch`，统一走函数式请求客户端

设计事实源：

- `docs/design/anyhunt/core/request-and-state-unification.md`
- `docs/design/moryflow/core/ui-conversation-and-streaming.md`

## 表单与 Zod

- 所有表单必须使用 `react-hook-form` + `zod`
- 表单数据禁止使用多个 `useState` 管理
- 前端表单使用 `import { z } from 'zod/v3'`
- 后端 server 使用 `import { z } from 'zod'`

## DTO 与类型

- 所有请求/响应类型必须从 Zod schema 用 `z.infer<>` 派生
- 禁止为同一结构重复定义 TypeScript interface
- `types.ts` 只承载外部/第三方 API 结构，不承载内部请求/响应事实源

## 代码原则

- 单一职责、纯函数优先、提前返回、职责分离、DRY
- 不做历史兼容，不保留废弃注释
- 不写兼容层，如 `legacyX`、`oldX`、`x_v1`
- 不做补丁式修复，优先根因治理

## 命名规范

| 类型       | 规范             | 示例                |
| ---------- | ---------------- | ------------------- |
| 组件/类型  | PascalCase       | `ScreenshotService` |
| 函数/变量  | camelCase        | `handleScreenshot`  |
| 常量       | UPPER_SNAKE_CASE | `MAX_CONCURRENT`    |
| 组件文件夹 | PascalCase       | `ApiKeyCard/`       |
| 工具文件   | camelCase        | `urlValidator.ts`   |

## UI/UX 基线

- 交互做减法：少打扰、少术语、少入口、明确下一步
- 主路径文案面向普通用户，禁止暴露内部协议术语
- 成功状态优先安静反馈，避免无意义成功 toast
- 图标统一 Lucide（`lucide-react`）
- 应用统一使用 `/ui/styles` 作为全局样式入口

## 安全基线

- URL 输入必须经过 SSRF 校验
- 默认屏蔽 localhost、内网 IP、云元数据端点
- API Key 仅存储哈希，明文只在创建时展示一次

## 继续阅读

- 构建与部署基线：`docs/reference/build-and-deploy-baselines.md`
- Anyhunt 前端工程基线：`docs/design/anyhunt/core/frontend-engineering-baseline.md`
- Moryflow 前端工程基线：`docs/design/moryflow/core/frontend-engineering-baseline.md`
