---
title: Anyhunt Agent Browser 治理与 Stealth 架构
date: 2026-03-08
scope: apps/anyhunt/server/src/browser + apps/anyhunt/console/src/features/agent-browser-playground
status: active
---

<!--
[INPUT]: Agent Browser 当前合规治理、Stealth 接入与风险观测实现
[OUTPUT]: Agent Browser 治理唯一事实源（风险边界 + 运行时治理 + 观测）
[POS]: Anyhunt Features / Agent Browser

[PROTOCOL]: 仅在治理边界、运行时层次、观测指标或验证基线失真时更新；不维护分阶段接入日志。
-->

# Anyhunt Agent Browser 治理与 Stealth 架构

## 1. 目标与边界

### 1.1 目标

1. 在不绕过网站安全机制的前提下，降低自动化流量误判率并提升成功率。
2. 为 Browser 会话建立可审计、可回退、可观测的治理层。
3. 将 Stealth 能力作为 Browser runtime 的内建层，而不是散落在业务入口里的补丁。

### 1.2 非目标

1. 不提供验证码自动破解。
2. 不提供代理 IP 轮换池管理。
3. 不提供黑箱绕过或不可审计的“伪装真人”方案。

## 2. 冻结治理原则

1. 风控目标固定为“合规自动化 + 误判治理 + 可审计”。
2. Agent 不直接接触 diagnostics / streaming / profile 内部治理能力。
3. site policy、pacing、risk detection、stealth patch、telemetry 必须分层，禁止堆进单个 service。
4. Browser 只有本地 `chromium.launch()` 模式时，stealth 层默认整体启用，不再为历史连接模式维护分支。

## 3. 运行时分层

### 3.1 策略层

1. `BrowserSitePolicy` 按 host 提供 allow / deny、并发预算、速率预算、重试预算与 robots 约束。
2. `openUrl` 前必须先过站点策略与预算校验。
3. 访问控制类错误与 challenge 默认不盲重试。

### 3.2 执行层

1. `ActionPacingService` 负责最小动作间隔与抖动。
2. `HumanBehaviorService` 负责打字节奏与鼠标轨迹等行为人性化计算。
3. `NavigationRetryService` 只对网络类错误做指数退避重试。

### 3.3 Stealth 层

1. Chromium 启动参数负责最基础的 automation 标记削弱。
2. Browser / Page 级 CDP 覆写负责 UA、metadata 与平台信号统一。
3. init-script patch 负责浏览器指纹、API 能力与 headless 痕迹修正。
4. 区域信号对齐负责 locale、timezone、Accept-Language 与目标站点区域语义对齐。

### 3.4 观测层

1. 统一记录 risk signal、navigation fail class、policy block 与 success rate。
2. Console 的 diagnostics 只展示风险与建议，不暴露黑箱逃逸能力。

## 4. Stealth 结构

建议模块固定为：

```text
browser/stealth/
├── stealth.types.ts
├── stealth-patches.ts
├── stealth-cdp.service.ts
├── stealth-launch-args.ts
└── stealth-region.service.ts
```

约束：

1. init-script patch 集合是内聚资产，必须由单一构建入口产出，不允许业务层自行拼接脚本。
2. Browser 级 CDP 覆写完成后立即 detach；Page 级 session 维持存活以覆盖 Worker。
3. Context 级 locale / timezone 必须在 `newContext()` 时确定，不能靠运行时临时改写。

## 5. 风险信号与处理

### 5.1 风险信号

允许识别但不越界处理的风险包括：

1. `captcha_interstitial`
2. `verification_interstitial`
3. `bot_challenge`
4. `access_gate`

信号来源可来自：

1. URL 模式
2. Title 模式
3. 页面结构与导航结果

### 5.2 处理策略

1. 网络层错误允许指数退避重试。
2. `403 / 429 / challenge` 默认不盲重试，直接返回结构化建议。
3. Browser runtime 必须把风险结果返回给上层，而不是在内部静默吞掉。

## 6. 观测与审计

建议统一指标：

1. `browser_policy_block_total{host,reason}`
2. `browser_action_pacing_delay_ms`
3. `browser_navigation_fail_total{host,class}`
4. `browser_success_rate{host}`

Console Diagnostics 面板至少展示：

1. 最近 24h 成功率
2. 触发限制原因 TopN
3. 降并发、延长间隔、检查站点策略等建议动作

## 7. 与主架构的关系

1. Browser 主架构定义模块边界、会话模型、API 与 Agent 合约。
2. 本文只定义治理、stealth、risk detection 与 observability。
3. 任何需要影响 Agent 工具调用面或会话生命周期的治理改动，都必须同步更新 [agent-browser-architecture.md](/Users/lin/.codex/worktrees/17b2/moryflow/docs/design/anyhunt/features/agent-browser-architecture.md)。

## 8. 验收标准

1. Stealth 能力以模块化形态接入 Browser runtime，不再由业务入口散布 patch。
2. site policy、action pacing、retry、risk detection 与 telemetry 职责清晰，不互相越权。
3. 高风控站点失败时必须给出可解释的错误分类与治理建议。
4. Browser 成功率优化不能以不可审计的黑箱能力为代价。

## 9. 当前验证基线

1. Browser schema、policy、streaming、profile 与 diagnostics 保持单元回归。
2. `site-policy`、`action-pacing`、`navigation-retry`、`risk-detection` 与 stealth 相关模块需要独立测试。
3. 变更 Browser runtime、stealth patch、risk detection 或 diagnostics 入口时，按 L2 执行根级校验。
