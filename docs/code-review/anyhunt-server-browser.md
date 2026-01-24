---
title: Anyhunt Server Browser Code Review
date: 2026-01-26
scope: apps/anyhunt/server (browser)
status: done
---

<!--
[INPUT]: apps/anyhunt/server/src/browser, apps/anyhunt/server/src/common/validators/url.validator.ts
[OUTPUT]: 风险清单 + 修复建议 + 进度记录
[POS]: Phase 2 / P1 模块审查记录（Anyhunt Server：Browser）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Anyhunt Server Browser Code Review

## 范围

- Browser 模块：`apps/anyhunt/server/src/browser/`
  - Session 管理：`session/session.manager.ts`
  - Pool 管理：`browser-pool.ts`, `browser.constants.ts`, `browser.types.ts`
  - L2 API：`browser-session.service.ts`, `browser-session.controller.ts`
  - CDP：`cdp/cdp-connector.service.ts`
  - Network：`network/interceptor.service.ts`
  - Snapshot：`snapshot/snapshot.service.ts`
  - Action：`handlers/action.handler.ts`
  - Storage：`persistence/storage.service.ts`
  - DTO：`dto/*.schema.ts`
  - Agent Port：`ports/browser-agent.port.ts`
- SSRF 校验：`apps/anyhunt/server/src/common/validators/url.validator.ts`

主要入口：

- `POST /api/v1/browser/session`
- `GET /api/v1/browser/session/:id`
- `POST /api/v1/browser/session/:id/open`
- `POST /api/v1/browser/session/:id/snapshot`
- `POST /api/v1/browser/session/:id/action`
- `POST /api/v1/browser/session/:id/screenshot`
- `POST /api/v1/browser/session/cdp/connect`
- `POST /api/v1/browser/session/:id/intercept/*`
- `POST /api/v1/browser/session/:id/storage/*`

## 结论摘要

- 高风险问题（P0）：0
- 中风险问题（P1）：0
- 低风险/规范问题（P2）：0
- 状态：修复完成（2026-01-26）

## 发现（按严重程度排序）

- [P0] **CDP 连接存在 SSRF / 内网探测风险（已修复）**
  - 修复：引入 `BROWSER_CDP_ALLOWED_HOSTS` 白名单；默认禁用 `port` 连接；ws/wss 走 SSRF 校验（`ws/wss` → `http/https` 归一化）；可选 `BROWSER_CDP_ALLOW_PRIVATE_HOSTS` 放开私网。
  - 文件：`apps/anyhunt/server/src/browser/cdp/cdp-connector.service.ts`, `apps/anyhunt/server/src/browser/browser.constants.ts`, `apps/anyhunt/server/.env.example`

- [P1] **拦截规则只绑定单一 Page，新增标签页/窗口不生效（已修复）**
  - 修复：拦截规则迁移到 `BrowserContext.route`，并为新窗口注册 context；`setRules/addRule` 会注册所有窗口的 context。
  - 文件：`apps/anyhunt/server/src/browser/network/interceptor.service.ts`, `apps/anyhunt/server/src/browser/browser-session.service.ts`

- [P1] **Session 过期自动清理不会释放网络拦截状态与快照缓存（已修复）**
  - 修复：`SessionManager.closeSession` 统一清理网络拦截与快照缓存；过期清理路径自动复用。
  - 文件：`apps/anyhunt/server/src/browser/session/session.manager.ts`, `apps/anyhunt/server/src/browser/snapshot/snapshot.service.ts`, `apps/anyhunt/server/src/browser/network/interceptor.service.ts`

- [P1] **CDP 会话创建“新窗口”会切到本地 BrowserPool（已修复）**
  - 修复：CDP 会话禁止创建新窗口，直接返回错误。
  - 文件：`apps/anyhunt/server/src/browser/session/session.manager.ts`, `apps/anyhunt/server/src/browser/browser-session.controller.ts`

- [P1] **Action 校验缺失导致 selector 必填类动作报错不友好（已修复）**
  - 修复：Zod `superRefine` 按类型校验 selector/value/options/key 等；handler 增加必要参数判定。
  - 文件：`apps/anyhunt/server/src/browser/dto/action.schema.ts`, `apps/anyhunt/server/src/browser/handlers/action.handler.ts`

- [P2] **BrowserPool 资源耗尽错误返回 500（已修复）**
  - 修复：Controller 显式映射 `BrowserUnavailableError` → 503。
  - 文件：`apps/anyhunt/server/src/browser/browser-session.controller.ts`

- [P2] **Controller 自定义错误格式与全局 Filter 规范不一致（已修复）**
  - 修复：统一使用 `HttpException(message, status)` 返回，交由全局 Filter 格式化。
  - 文件：`apps/anyhunt/server/src/browser/browser-session.controller.ts`

- [P2] **移除最后一条拦截规则后仍保持路由拦截（已修复）**
  - 修复：规则清空时自动取消 routing。
  - 文件：`apps/anyhunt/server/src/browser/network/interceptor.service.ts`

- [P2] **导航后仍保留旧 refs（已修复）**
  - 修复：导航后清空 refs 并清理增量快照缓存。
  - 文件：`apps/anyhunt/server/src/browser/browser-session.service.ts`, `apps/anyhunt/server/src/browser/snapshot/snapshot.service.ts`

## 测试审计

- 已有：
  - `apps/anyhunt/server/src/browser/__tests__/browser-pool.spec.ts`
- 新增：
  - `apps/anyhunt/server/src/browser/__tests__/cdp-connector.service.spec.ts`
  - `apps/anyhunt/server/src/browser/__tests__/action.schema.spec.ts`
  - `apps/anyhunt/server/src/browser/__tests__/network-interceptor.service.spec.ts`
  - `apps/anyhunt/server/src/browser/__tests__/session.manager.spec.ts`

## 修复计划与进度

- 状态：**修复完成**

## 修复记录

- 2026-01-26：完成 CDP 白名单与 SSRF 策略、拦截规则改为 Context 路由、会话清理回收、Action 校验、错误格式统一与导航 refs 清理；补充单测与 .env.example 变量
