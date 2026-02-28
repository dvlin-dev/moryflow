---
title: Anyhunt Agent Browser 第三方 Browser Provider 去除方案
date: 2026-02-28
scope: apps/anyhunt/server/src/browser, apps/anyhunt/console/src/features/agent-browser-playground, docs/products/anyhunt-dev/features/agent-browser
status: implemented
---

<!--
[INPUT]: 当前 Browser CDP provider 链路（browserbase/browseruse）+ Console CDP 表单 + 相关文档
[OUTPUT]: 一次性去除第三方 provider 的实施记录（零兼容、根因收口、能力不退化）
[POS]: Anyhunt Browser 架构演进方案（已实施）

[PROTOCOL]: 本文件变更时，需同步更新 docs/index.md 与 docs/CLAUDE.md。
-->

# Anyhunt Agent Browser 第三方 Browser Provider 去除方案

## 1. 目标与原则

- 目标：彻底移除 Anyhunt Browser 中对第三方 browser provider（`browserbase`、`browseruse`）的内建适配、会话代建与凭据依赖。
- 强约束：
  - 不考虑历史兼容：不保留 provider 参数、不保留旧环境变量链路、不保留旧文档说明。
  - 不破坏现有核心功能：本地 Browser 会话、标准 CDP 直连（`wsEndpoint`/`port`）、Agent Browser 主流程保持可用。
- 工程原则：
  - 根因治理优先：在协议事实源与服务边界一次性收口，不做 shim/兜底分支。
  - 单一事实源：CDP 连接协议只保留“标准 CDP 输入”。
  - 职责分离：Browser 模块只负责会话与 CDP，外部 provider 生命周期管理不再进入服务端。

## 2. 当前问题（根因）

- 协议层混杂了业务外部依赖：`ConnectCdpSchema` 同时承载标准 CDP 与第三方 provider 语义。
- 连接器承担了不必要职责：`CdpConnectorService` 既做 CDP 连接，又做 provider 会话创建/停止。
- Console 表单将 provider 作为一等输入，前后端协议与文档同步耦合。
- 文档与配置项扩散了 provider 语义，导致维护与认知负担增加。

## 3. 目标架构（去除后）

CDP 连接统一为标准协议：

- 仅接受：
  - `wsEndpoint`（首选）
  - `port`（由本地 `/json/version` 解析 ws endpoint）
  - `timeout`
- 不再接受：
  - `provider`
  - `BROWSERBASE_*` / `BROWSER_USE_*` 环境变量
  - 服务端代建/回收第三方浏览器会话

保留能力：

- 本地 Browser Session 全链路不变（Session/Snapshot/Action/Network/Diagnostics/Streaming/Profile）。
- CDP 直连能力不变（通过 allowlist + SSRF 策略）。
- Agent Browser（L3）能力不变（仍基于 BrowserAgentPort + browser tools）。

## 4. 变更范围

### 4.1 服务端（Anyhunt Server）

1. 协议收口
   - `apps/anyhunt/server/src/browser/dto/cdp.schema.ts`
   - 删除 `provider` 字段与相关校验文案。
   - 保留 `wsEndpoint | port` 至少其一。

2. 连接器收口
   - `apps/anyhunt/server/src/browser/cdp/cdp-connector.service.ts`
   - 删除 provider 类型与字段：
     - `provider`
     - `providerSessionId`
     - `providerApiKey`
   - 删除 provider 分支方法：
     - `createBrowserbaseSession`
     - `createBrowserUseSession`
     - `closeProviderSession`
     - `closeBrowserbaseSession`
     - `closeBrowserUseSession`
   - `resolveTarget` 只保留 `resolveWsEndpointDirect` 路径。

3. 调用方收口
   - `apps/anyhunt/server/src/browser/browser-session.service.ts`
   - `connectCdp` 不再向 connector 透传 `provider`。

4. 常量与配置收口
   - `apps/anyhunt/server/src/browser/browser.constants.ts`
   - 删除 provider 相关 env 注释与不再使用的配置说明。

5. 测试收口
   - `apps/anyhunt/server/src/browser/__tests__/cdp-connector.service.spec.ts`
   - 删除 provider 用例；补齐标准 CDP 输入与错误边界用例。

### 4.2 前端（Anyhunt Console）

1. 表单协议收口
   - `apps/anyhunt/console/src/features/agent-browser-playground/schemas.ts`
   - `BrowserCdpValues` 删除 `provider`。

2. UI 收口
   - `apps/anyhunt/console/src/features/agent-browser-playground/components/browser-session-sections/cdp-section.tsx`
   - 删除 Provider 下拉；保留 wsEndpoint/port/timeout。

3. 业务编排收口
   - `apps/anyhunt/console/src/features/agent-browser-playground/hooks/use-browser-session-forms.ts`
   - 更新默认值，移除 `provider`。
   - `apps/anyhunt/console/src/features/agent-browser-playground/hooks/use-browser-session-data-actions.ts`
   - `connectCdp` 请求体移除 `provider`。

### 4.3 文档收口

1. Browser 架构文档
   - `docs/products/anyhunt-dev/features/agent-browser/architecture.md`
   - 删除 Browserbase/Browser Use provider 描述。

2. Browser 模块说明
   - `apps/anyhunt/server/src/browser/CLAUDE.md`
   - 删除 provider 能力与相关约束描述。

3. 索引同步
   - `docs/index.md`
   - `docs/CLAUDE.md`

## 5. 非目标

- 不变更 Browser 核心行为（动作语义、stealth、风控、网络拦截、诊断、streaming）。
- 不新增新的外部 provider。
- 不在本次引入新的抽象层或 feature flag。

## 6. 实施步骤（一次性收口）

### 实施进度（持续回写）

- [x] Step 0：冻结边界（2026-02-28）
- [x] Step 1：后端协议与连接器先收口（2026-02-28）
- [x] Step 2：前端协议与页面收口（2026-02-28）
- [x] Step 3：测试回归（2026-02-28）
- [x] Step 4：文档与索引收口（2026-02-28）

### Step 0：冻结边界

- 明确唯一保留的 CDP 输入契约：`wsEndpoint | port` + `timeout`。
- 明确唯一移除目标：`browserbase`、`browseruse` 全链路。

### Step 1：后端协议与连接器先收口

- 先改 DTO，再改 connector，再改 service 调用方。
- 保证编译期立即暴露所有遗留引用。

### Step 2：前端协议与页面收口

- 移除表单字段与请求映射中的 provider。
- 确保 CDP 页交互仍闭环（连接成功/失败展示不变）。

### Step 3：测试回归

- 更新/新增单测覆盖标准路径与错误路径。
- 覆盖重点：
  - allowlist 拒绝
  - SSRF 拒绝
  - wsEndpoint/port 输入边界
  - Console CDP 表单提交与请求体

### Step 4：文档与索引收口

- 删除 provider 相关描述，统一到“标准 CDP 直连”。
- 同步索引与模块 CLAUDE。

## 7. 验收标准（DoD）

功能层：

- Browser 既有核心能力不回归。
- CDP 仍可通过 `wsEndpoint` 或 `port` 成功连接。
- Agent Browser 主流程（Agent + Browser Session）可用。

代码层：

- 以下关键词在目标代码中清零：
  - `provider: 'browserbase'`
  - `provider: 'browseruse'`
  - `BROWSERBASE_API_KEY`
  - `BROWSERBASE_PROJECT_ID`
  - `BROWSER_USE_API_KEY`

质量闸门（L2）：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

建议补充的定向验证：

```bash
pnpm --filter @anyhunt/anyhunt-server test src/browser/__tests__/cdp-connector.service.spec.ts
pnpm --filter @anyhunt/console test src/features/agent-browser-playground/schemas.test.ts
```

## 8. 风险与缓解

- 风险 1：前后端协议不同步导致 CDP 页面报错。
  - 缓解：DTO 先改、Console 同步改、加 schema 与提交链路回归测试。

- 风险 2：connector 删除分支时误伤标准 CDP 连接。
  - 缓解：保留并强化 allowlist/SSRF/port 分支测试。

- 风险 3：文档未完全收口造成认知偏差。
  - 缓解：以本方案为主清单，逐项 `rg` 清理并在 CR 中附对照表。

## 9. 回滚策略

- 本次为零兼容重构，不提供运行时开关回滚。
- 若出现阻断问题，仅允许代码级整体回滚（revert 整体变更），禁止局部补丁回滚。

## 10. 交付物清单

- 代码：server/browser + console/cdp 相关改造 PR（单逻辑原子提交）。
- 文档：架构文档、模块 CLAUDE、索引同步更新。
- 验证：L2 闸门通过记录 + 关键用例截图/日志。

## 11. 实施完成记录（2026-02-28）

- Step 0：冻结边界完成，明确 CDP 契约仅保留 `wsEndpoint | port`。
- Step 1：服务端完成协议与连接器收口，移除 provider 分支和相关字段。
- Step 2：Console 完成 CDP 表单/UI/请求体收口，移除 provider 输入。
- Step 3：回归验证完成：
  - `pnpm --filter @anyhunt/anyhunt-server test src/browser/__tests__/cdp-connector.service.spec.ts`（pass）
  - `pnpm --filter @anyhunt/anyhunt-server typecheck`（pass）
  - `pnpm --filter @anyhunt/console test src/features/agent-browser-playground/schemas.test.ts`（pass）
  - `pnpm --filter @anyhunt/console typecheck`（pass）
- Step 4：文档与索引收口完成，Agent Browser 相关文档统一为“标准 CDP 直连”口径。
