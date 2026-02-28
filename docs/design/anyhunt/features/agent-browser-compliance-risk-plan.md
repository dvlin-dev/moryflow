---
title: Agent Browser 合规自动化与检测风险治理方案
date: 2026-02-24
scope: apps/anyhunt/server/src/browser, apps/anyhunt/console/src/features/agent-browser-playground
status: implemented
---

<!--
[INPUT]: 当前 Agent Browser 架构（browser/session/network/diagnostics/cdp）与 bot.sannysoft.com 检测背景
[OUTPUT]: 可执行的“合规自动化 + 降低误判”技术方案（不提供绕过安全检测能力）
[POS]: Anyhunt Dev Agent Browser 风险治理方案文档
-->

# Agent Browser 合规自动化与检测风险治理方案

## 背景与目标

- 背景：部分目标站点会把自动化流量识别为高风险，导致访问失败或验证码频发。
- 目标：在不绕过网站安全机制的前提下，降低误判率、提升成功率、保留可审计性。

## 明确边界（已修订 2026-02-25）

> **注意**：本节已于 2026-02-25 修订。原"禁止伪装真人/伪造设备指纹"约束已废除。
> 新方案见 `stealth-fork-gap-and-adoption-plan.md`。

- 允许目标：反检测指纹补丁注入、浏览器行为人性化、区域信号对齐、验证页风险检测与处理、降低异常行为模式、控制访问强度、提升可观测与回退能力。
- 非目标：验证码自动破解（CAPTCHA solving）、代理 IP 轮换池管理。

## 方案总览

分三层推进：

1. **策略层（Policy）**：站点级 allow/deny、速率预算、并发预算、重试预算。
2. **执行层（Runtime）**：会话参数标准化、节流与抖动、导航与动作时序治理。
3. **观测层（Observability）**：检测分、失败原因分类、站点画像、回归基线。

## 详细设计

### 1) 站点策略中心（新增）

- 新增 `BrowserSitePolicy`（可先用配置文件，后续落库）：
  - `hostPattern`
  - `automationAllowed`（默认 false，白名单启用）
  - `maxRps`, `maxBurst`
  - `maxConcurrentNavigationsPerHost`
  - `retryBudget`
  - `respectRobots`（默认 true）
- 接入点：
  - `browser-session.service.ts` 的 `openUrl` 前置策略校验
  - `network/interceptor.service.ts` 继续承担 SSRF/网络安全拦截，不叠加业务速率限流（避免重复计数与过度复杂）
- 失败返回：统一 `429/403` + 英文错误消息（用户可见）。

### 2) 会话行为标准化（基于现有能力）

- 复用已存在参数，不新增“反检测”字段：
  - `userAgent/device/locale/timezone/viewport`
  - `headers`, `permissions`, `offline`（仅业务需要时）
- 约束：
  - 同一任务会话内保持参数一致，避免频繁切换导致风控升高。
  - 指纹补丁由 stealth 模块统一注入（详见 `stealth-fork-gap-and-adoption-plan.md`），业务层不自行注入。
- 落点：
  - `session.manager.ts` 的 `toContextOptions/applyContextRuntimeOptions`。

### 3) 动作节奏治理（新增中间层）

- 在 `action.handler.ts` 前增加 `ActionPacingService`：
  - 为动作插入最小间隔（如 120~350ms 随机抖动）。
  - 高风险动作（连续 click/type）强制冷却窗口。
  - 页面未稳定时禁止下一步（要求 `domcontentloaded` 或显式 wait）。
- 目标：降低“机器式高频突发行为”，减少误判，而不是伪装真人。

### 4) 导航与重试策略（增强）

- 导航失败分类：
  - 网络层（超时、DNS、TLS）
  - 访问控制层（403/429/challenge）
  - 站点脚本层（脚本错误、重定向回环）
- 重试规则：
  - 仅对网络层执行指数退避重试（如 3 次）。
  - 对 403/429/challenge 默认不盲重试，直接返回策略建议。

### 5) 可观测与审计（新增）

- 新增指标（Prometheus 或日志聚合）：
  - `browser_policy_block_total{host,reason}`
  - `browser_action_pacing_delay_ms`
  - `browser_navigation_fail_total{host,class}`
  - `browser_success_rate{host}`
- Console 增加“Detection Risk”诊断面板（只展示风险与建议）：
  - 最近 24h 成功率
  - 触发限制原因 TopN
  - 建议（降并发、延长间隔、检查站点策略）

### 6) 兼容 bot.sannysoft.com 的使用方式

- 定位：仅作为 QA 诊断页，不作为“绕过目标”。
- 输出：
  - 记录检测项变化趋势（版本回归）
  - 若评分下降，检查最近改动是否引入异常行为模式
- 禁止：
  - 不以“把所有检测项伪装成真人”为验收标准。

## 分阶段实施计划

### P0（1-2 天）

- 增加 `BrowserSitePolicy` 配置与 `openUrl` 前置校验。
- 增加基础指标与结构化日志字段（host、reason、policyId）。

### P1（2-3 天）

- 引入 `ActionPacingService`，接入 `action/actionBatch` 流程。
- 补齐导航失败分类与重试预算控制。

### P2（2 天）

- Console Agent Browser Diagnostics 页增加 Detection Risk 区块。
- 增加站点维度报表（成功率、限制原因、建议动作）。

## 测试与验收

### 单元测试（必须）

- `site-policy.spec.ts`：allow/deny、并发/速率边界。
- `action-pacing.spec.ts`：最小间隔、抖动范围、批处理节奏。
- `navigation-retry.spec.ts`：失败分类与预算收敛。

### 集成验证（必须）

- 低风险站点：成功率不低于基线。
- 高风控站点：错误分类清晰，且不会出现无限重试。
- 压测：并发上升时仍满足策略限流，不击穿目标站点。

## 风险与取舍

- 成功率与速度冲突：节奏治理会增加单任务耗时。
- 合规优先：拒绝“高成功率但不可审计/不可解释”的黑箱策略。
- 运营成本：需要维护站点策略与例外清单。

## 结论

- 本方案不提供“伪装真人”能力；核心是“合规自动化 + 误判治理 + 可观测审计”。
- 若业务确需更高通过率，优先走目标站点官方 API、合作通道或明确授权渠道。

## 复审后优化结论（2026-02-24）

- 去除 feature flags：能力默认启用，不再做“开关驱动上线”。
- 简化限流位置：业务限流仅在 `openUrl` 与会话并发入口实施；`interceptor` 只做安全拦截。
- 收敛重试范围：仅网络类错误允许退避重试；访问控制类与 challenge 一次失败即返回。
- 先做可读实现：配置文件 + 内存状态（单实例）先跑通，稳定后再演进分布式状态。
- 保持单一职责：策略决策、预算控制、动作节奏、重试分类、遥测上报严格分层。

---

## 实现细化（模块化 + 单一职责）

本节只定义核心逻辑与边界，不引入复杂框架，不做过度抽象。

### 设计原则（落地约束）

- 一个模块只解决一个问题：策略判定、节奏控制、重试分类、指标上报彼此隔离。
- 先本地配置再演进存储：P0 使用配置文件，验证有效后再落库。
- 入口最小改造：优先接入 `browser-session.service.ts` 与 `action.handler.ts`，不重写主链路。
- 默认启用：能力默认开启，通过保守默认阈值控制风险，不依赖运行时开关。

### 模块拆分与职责

1. `policy/site-policy.types.ts`  
   职责：定义 `BrowserSitePolicy`、`RetryBudget`、`PolicyDecision` 类型。

2. `policy/site-policy.service.ts`  
   职责：按 host 匹配策略、给出 allow/deny 决策，不负责限流存储实现细节。

3. `policy/site-rate-limiter.service.ts`  
   职责：处理 `maxRps/maxBurst` 与 host 维度“导航并发令牌”，返回是否允许。

4. `runtime/action-pacing.service.ts`  
   职责：动作前延迟与冷却窗口计算，不执行动作本身。

5. `runtime/navigation-retry.service.ts`  
   职责：错误分类 + 重试决策（仅网络类），不参与 URL 校验与页面操作。

6. `observability/browser-risk-telemetry.service.ts`  
   职责：统一上报结构化日志/指标，业务层只传事件与上下文。

### 与现有代码的接入点（最小侵入）

- `browser-session.service.ts`
  - `openUrl` 前：`sitePolicyService.assertNavigationAllowed(...)`
  - `openUrl` 前：`siteRateLimiter` 校验速率预算与导航并发预算
  - `page.goto` 包装：`navigationRetryService.run(...)`
  - 成功/失败后：`telemetry.recordNavigationResult(...)`
- `handlers/action.handler.ts`
  - 每个 action 执行前：`actionPacingService.beforeAction(...)`
  - 执行后：`telemetry.recordAction(...)`

### 核心接口（示意）

```ts
type ActionType = 'click' | 'fill' | 'type' | 'press' | 'wait' | 'scroll';

interface SitePolicyService {
  resolve(host: string): BrowserSitePolicy;
  assertNavigationAllowed(input: { sessionId: string; host: string; url: string }): Promise<void>;
}

interface ActionPacingService {
  beforeAction(input: { sessionId: string; actionType: ActionType }): Promise<void>;
}

interface NavigationRetryService {
  run<T>(input: { host: string; execute: () => Promise<T>; budget: RetryBudget }): Promise<T>;
}
```

### 核心逻辑（伪代码）

```ts
// openUrl 主流程（精简）
policy = sitePolicyService.resolve(host)
assert policy.automationAllowed
assert siteRateLimiter.allow(host, policy.maxRps, policy.maxBurst)
assert siteRateLimiter.acquireConcurrent(host, policy.maxConcurrentNavigationsPerHost)

try {
  result = navigationRetryService.run({
    host,
    budget: policy.retryBudget,
    execute: () => page.goto(url, options),
  })
  telemetry.ok('navigation', { host, sessionId })
  return result
} catch (err) {
  telemetry.fail('navigation', { host, sessionId, class: classify(err) })
  throw mapToHttpError(err)
} finally {
  siteRateLimiter.releaseConcurrent(host)
}
```

```ts
// action 前置节奏控制（精简）
rule = pacingRules[actionType]; // 例如 click/type 120~350ms
delay = jitter(rule.minDelayMs, rule.maxDelayMs);
if (burstCounter.exceeded(sessionId, actionType)) {
  delay += rule.cooldownMs;
}
await sleep(delay);
```

---

## 执行计划（按步骤实施）

### Step 0：建立基线与约束契约（0.5 天）

- 产出：
  - 固化错误分类枚举：`network/access_control/script`
  - 固化 telemetry 字段契约：`host/reason/policyId/sessionId/class`
  - 形成一份回归基线样本（成功/403/429/challenge/超时）
- 验收：
  - 无额外业务逻辑改动，仅新增契约与基线数据。
- 执行结果（2026-02-24）：
  - 已落地 `observability/risk-contract.ts`，固化错误分类与 telemetry 字段契约。
  - 已新增 `risk-contract.spec.ts`，覆盖契约与基线样本场景完整性。

### Step 1：落地站点策略与匹配（1 天）

- 产出：
  - `site-policy.types.ts` + `site-policy.service.ts`
  - 策略配置文件（hostPattern + allow/deny + retryBudget）
- 核心逻辑：
  - host 精确匹配优先，通配符次之，最后走 default policy。
- 验收：
  - 单测覆盖：匹配优先级、默认策略、禁用站点拒绝。
- 执行结果（2026-02-24）：
  - 已新增 `policy/site-policy.types.ts` 与 `policy/site-policy.service.ts`。
  - 已实现 host 匹配优先级（exact > longer wildcard > `*`）。
  - 已新增 `site-policy.service.spec.ts` 覆盖匹配与回退规则。

### Step 2：接入 openUrl 前置闸门（1 天）

- 产出：
  - `browser-session.service.ts` 中 `openUrl` 接入 `assertNavigationAllowed`
  - 标准错误映射（403/429）
- 核心逻辑：
  - 策略判定失败直接返回，不触发 `page.goto`。
- 验收：
  - 单测覆盖：禁止站点不会发起真实导航调用。
- 执行结果（2026-02-24）：
  - 已在 `browser-session.service.ts` 的 `openUrl` 中接入 `sitePolicyService.assertNavigationAllowed(...)`。
  - 已在 `browser-session.controller.ts` 增加 `BrowserPolicyDeniedError -> 403` 映射。
  - 已新增 `browser-session.service.spec.ts` 覆盖“策略拒绝时不发起导航”回归。

### Step 3：接入 host 速率/并发控制（1 天）

- 产出：
  - `site-rate-limiter.service.ts`
  - `openUrl` 接入速率预算与导航并发令牌
- 核心逻辑：
  - 令牌获取失败快速失败，`finally` 确保释放。
- 验收：
  - 并发测试：超过上限返回 429，不出现令牌泄漏。
- 执行结果（2026-02-24）：
  - 已在 `policy/site-rate-limiter.service.ts` 落地 host 级令牌桶 + 导航并发令牌。
  - 已在 `browser-session.service.ts` 的 `openUrl` 接入配额申请与 `finally` 释放。
  - 已在 `browser-session.controller.ts` 增加 `BrowserNavigationRateLimitError -> 429` 映射。
  - 已新增 `site-rate-limiter.service.spec.ts`，覆盖并发上限、速率预算与时间补充令牌路径。

### Step 4：接入动作节奏控制（1 天）

- 产出：
  - `action-pacing.service.ts`
  - `action.handler.ts` 前置调用
- 核心逻辑：
  - 仅对高风险动作限速；`wait/snapshot` 不加延迟。
- 验收：
  - 单测覆盖：延迟范围、冷却触发、白名单动作不受影响。
- 执行结果（2026-02-24）：
  - 已新增 `runtime/action-pacing.service.ts`，仅对高风险动作施加随机抖动与 burst 冷却。
  - 已在 `handlers/action.handler.ts` 的动作执行前接入 `actionPacing.beforeAction(...)`。
  - 已新增 `action-pacing.service.spec.ts` 与 `action.handler.spec.ts` 回归用例，覆盖延迟区间、冷却触发与前置接入。

### Step 5：接入导航重试分类（1 天）

- 产出：
  - `navigation-retry.service.ts`
  - 错误分类器：`network/access_control/script`
- 核心逻辑：
  - 只重试 `network`；`403/429/challenge` 立即返回。
- 验收：
  - 单测覆盖：分类准确、重试次数与退避时间符合预算。
- 执行结果（2026-02-24）：
  - 已新增 `runtime/navigation-retry.service.ts`，实现 `network/access_control/script` 分类与重试决策。
  - 已在 `browser-session.service.ts` 的 `openUrl` 中接入 `navigationRetry.run(...)`，仅网络类失败执行退避重试。
  - 已增加响应结果分类：`403/429/challenge` 直接判定为 `access_control`，不进行盲重试。
  - 已在 `browser-session.controller.ts` 增加 `BrowserNavigationError` 到 `403/429/503/502` 的错误映射。
  - 已新增 `navigation-retry.service.spec.ts` 覆盖分类与重试预算行为。

### Step 6：补齐可观测与诊断数据（1 天）

- 产出：
  - `browser-risk-telemetry.service.ts`
  - 结构化日志字段标准（host/reason/policyId/sessionId/class）
- 核心逻辑：
  - 业务代码不直接拼日志，统一走 telemetry service。
- 验收：
  - 日志可按 host 与 reason 聚合查询。
- 执行结果（2026-02-24）：
  - 已新增 `observability/browser-risk-telemetry.service.ts`，统一记录 policy block、rate limit、navigation result、action pacing 事件。
  - 已在 `browser-session.service.ts` 与 `handlers/action.handler.ts` 接入 telemetry service，业务层不再手工拼接风险日志。
  - 已提供 `getSessionSummary(...)` 聚合能力，支持按 `host/reason` 统计 TopN、成功率与建议动作。
  - 已新增 `browser-risk-telemetry.service.spec.ts` 与 `browser-session.service.spec.ts` 回归用例，覆盖聚合与关键埋点路径。

### Step 7：Console 诊断面板最小可用（1 天）

- 产出：
  - 在 Diagnostics 页面增加 Detection Risk 区块（只读）
  - 展示成功率、TopN 拒绝原因、建议动作
- 验收：
  - 可定位“为什么失败”，并给出明确调整方向。
- 执行结果（2026-02-24）：
  - 后端已新增 `GET /api/v1/browser/session/:id/risk`，由 `browser-session.service.ts` 返回风险聚合摘要。
  - Console 已新增 `getBrowserDetectionRisk(...)` API 与 `BrowserDetectionRiskSummary` 类型。
  - Diagnostics 区块已接入 “Detection Risk” 只读面板，支持刷新并展示成功率、TopN 原因与建议动作。
  - 已补充 `browser-session.service.spec.ts` 对风险摘要读取路径的回归覆盖。

---

## 每步完成定义（Definition of Done）

- 代码：模块职责清晰，无跨模块反向依赖。
- 测试：每步至少新增对应单测，关键路径补回归测试。
- 文档：本文件更新“实施状态”，并同步 `docs/CLAUDE.md` 最近更新。
- 回滚：通过策略配置回退（放宽阈值、关闭节奏延迟）与代码回滚实现，不依赖 feature flag。

## 实施状态（待执行）

- [x] Step 0 基线与约束契约
- [x] Step 1 站点策略与匹配
- [x] Step 2 openUrl 前置闸门
- [x] Step 3 速率与并发控制
- [x] Step 4 动作节奏控制
- [x] Step 5 导航重试分类
- [x] Step 6 可观测与诊断数据
- [x] Step 7 Console 诊断面板
