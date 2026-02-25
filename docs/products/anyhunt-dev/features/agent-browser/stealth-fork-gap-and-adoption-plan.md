---
title: Agent Browser Stealth 能力引入与改造方案
date: 2026-02-25
scope: apps/anyhunt/server/src/browser
status: implemented
---

<!--
[INPUT]: agent-browser-stealth 外部项目工程结构 + 当前 Anyhunt Browser 模块现状
[OUTPUT]: 可落地的 stealth 能力引入改造方案（模块化、单一职责、分步执行）
[POS]: Anyhunt Dev Agent Browser 功能文档

[PROTOCOL]: 本文件变更时，需同步更新 docs/index.md、docs/products/anyhunt-dev/index.md、docs/CLAUDE.md
-->

# Agent Browser Stealth 能力引入与改造方案

## 1. 需求定义

### 背景

当前 Anyhunt Agent Browser 基于 Playwright 实现浏览器自动化，但缺乏反检测能力。主流网站（电商、社交、新闻等）的反爬系统会通过多维度指纹检测（`navigator.webdriver`、WebGL 渲染器、UA 特征、行为模式等）识别自动化流量，导致访问被阻断或触发验证码。

外部开源项目 [agent-browser-stealth](https://github.com/leeguooooo/agent-browser) 提供了一套成熟的多层反检测架构，包含 25+ 浏览器指纹补丁、CDP 级别 UA 覆写、行为人性化和区域信号对齐，已在生产环境验证。

### 目标

- 将 agent-browser-stealth 的核心 stealth 能力引入 Anyhunt Browser 模块
- 实现多层反检测：启动参数层 → CDP 覆写层 → 初始化脚本层 → 行为层 → 风险感知层
- 提升 Agent Browser 在主流网站上的可用性和成功率
- 保持模块化与单一职责，便于独立测试和维护

### 范围

- **包含**：
  - 浏览器指纹补丁注入（init-script 层）
  - CDP 级别 UA/元数据覆写
  - Chromium 启动参数反检测
  - 行为人性化（打字节奏、鼠标曲线、导航节奏）
  - 区域信号自动对齐（locale/timezone/Accept-Language）
  - 验证页/风险信号检测与处理策略
- **不包含**（非目标）：
  - 验证码自动破解（CAPTCHA solving）
  - 代理 IP 轮换池管理
  - 浏览器集群与分布式调度
  - 移动端浏览器模拟

### 验收标准

1. bot.sannysoft.com 检测项全绿（headless + headed 模式）
2. creepjs headless 检测不触发 headless 标记
3. 现有单测全部通过，新增 stealth 相关单测覆盖率 > 80%
4. `pnpm lint && pnpm typecheck && pnpm test:unit` 全量通过
5. 主流站点（Google、Twitter/X、Amazon）headless 访问不触发即时验证码

---

## 2. 差异分析（外部项目 vs 当前实现）

### 2.1 能力对比矩阵

| 能力维度              | agent-browser-stealth                                                                      | Anyhunt 当前实现                                     | 差距                                  |
| --------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------- |
| **Chromium 启动参数** | `--disable-blink-features=AutomationControlled` + `--use-gl=angle` + `--use-angle=default` | 无                                                   | 完全缺失                              |
| **CDP UA 覆写**       | Browser/Page 级别 `Emulation.setUserAgentOverride`（含 brands、platform、metadata）        | 仅 `session.manager.ts` 透传 `userAgent` 字符串      | 仅表层覆写，缺少 metadata/brands      |
| **Init-Script 补丁**  | 25 个 IIFE 补丁（webdriver/chrome.runtime/plugins/WebGL/screen/memory 等）                 | 无                                                   | 完全缺失                              |
| **行为人性化**        | 打字抖动（±40%）、Bezier 鼠标曲线、导航前随机延迟、wait 随机范围                           | `action-pacing.service.ts` 仅有固定延迟抖动          | 缺少 Bezier 曲线和打字抖动            |
| **区域信号对齐**      | URL TLD 自动推断 locale/timezone/Accept-Language + 20 地区映射                             | 仅透传用户设置的 locale/timezone                     | 缺少自动推断                          |
| **风险信号检测**      | URL/Title 模式匹配 → 结构化 `riskSignals`（code/source/evidence/confidence）               | 无                                                   | 完全缺失                              |
| **风险处理策略**      | `warn`（重试+退避）/ `block`（快速失败）/ `off`                                            | 无                                                   | 完全缺失                              |
| **连接模式感知**      | Local/CDP/Provider 五种模式差异化策略                                                      | 仅使用 local 模式（`BrowserPool` 本地启动 Chromium） | 不需要：只有 local 模式，全层直接启用 |

### 2.2 架构差异

**外部项目**：单体 CLI 工具，所有 stealth 逻辑内聚在 `stealth.ts` + `browser.ts`。

- 优点：实现完整、逻辑集中
- 缺点：`stealth.ts` 约 900 行、`browser.ts` 约 2900 行，职责边界模糊

**我们的架构**：NestJS 模块化服务端，已有 policy/runtime/observability 分层。

- 优点：职责清晰、可独立测试、可注入
- 缺点：当前缺乏 stealth 层

### 2.3 关键结论

1. 外部项目的 init-script 补丁集是核心资产，应完整引入
2. CDP 覆写逻辑需要适配我们的 `browser-pool.ts`（browser 级别 + context/page 级别）
3. 行为人性化需要新建 `HumanBehaviorService`（纯函数计算），由 `ActionHandler` 调用执行；`ActionPacingService` 保持不变，仅管延迟节奏（单一职责）
4. 风险检测可作为全新模块引入，与现有 `navigation-retry.service.ts` 协作
5. 我们只有 local 模式（`BrowserPool` 本地启动 Chromium），不需要外部项目的连接模式策略分层（`StealthPolicy`/`StealthConnectionKind`），所有 stealth 层无条件全部启用
6. Playwright 的 `Browser.newBrowserCDPSession()` 仅在 Chromium 上可用，外部项目用 `as any` 强转调用；我们也使用 `chromium.launch()`，此调用可行
7. CDP session 生命周期：browser-level 覆写后立即 detach；page-level 不 detach（为 Worker 覆写持续生效）
8. Playwright context 的 `locale`/`timezoneId` 只能在 `newContext()` 时设置，无法运行时动态更改；区域对齐应在 context 创建阶段完成

---

## 3. 技术方案（按模块拆分）

### 3.1 设计前提

我们的 Agent Browser 只有一种运行模式：**服务器本地 `chromium.launch()`**（`BrowserPool`）。代码中虽有 browserbase/browseruse CDP 对接，但实际未使用。

因此本方案**不引入连接模式判定（StealthPolicy/StealthConnectionKind）**，所有 stealth 层（启动参数 + CDP 覆写 + init-scripts + 行为人性化）**默认全部启用**，没有运行时开关。

### 3.2 模块总览

```
apps/anyhunt/server/src/browser/
├── stealth/                          # 【新增】反检测核心
│   ├── index.ts                      # 公共导出
│   ├── stealth.types.ts              # 类型定义（StealthScriptOptions、RiskSignal）
│   ├── stealth-patches.ts            # Init-script 补丁集（25+ IIFE）— 纯函数
│   ├── stealth-cdp.service.ts        # CDP 级别 UA/元数据覆写 — @Injectable
│   ├── stealth-launch-args.ts        # Chromium 启动参数常量
│   └── stealth-region.service.ts     # 区域信号自动对齐（TLD→locale/tz）— @Injectable
├── runtime/
│   ├── action-pacing.service.ts      # 【不变】仅管延迟节奏（单一职责）
│   ├── human-behavior.service.ts     # 【新增】Bezier 鼠标曲线计算 + 打字抖动计算 — 纯函数服务
│   ├── navigation-retry.service.ts   # 【增强】接入风险信号检测结果
│   └── risk-detection.service.ts     # 【新增】验证页/风险信号检测 — 纯函数
├── handlers/
│   └── action.handler.ts             # 【增强】click 前调用 humanMouseMove、type 使用抖动 delay
├── browser-pool.ts                   # 【改造】launch 时注入 stealth 参数 + browser-level CDP + context 注入 init-scripts + page 事件
├── browser-session.service.ts        # 【改造】openUrl 接入区域 Accept-Language 更新 + 风险检测
└── ...
```

### 3.3 各模块职责与接口

#### `stealth/stealth.types.ts` — 类型定义

```ts
interface StealthScriptOptions {
  locale?: string;
  userAgent?: string;
  acceptLanguage?: string;
}

interface RiskSignal {
  code: string; // 'captcha_interstitial' | 'verification_interstitial' | 'bot_challenge' | 'access_gate'
  source: 'url' | 'title';
  evidence: string;
  confidence: number; // 0-1
}

type RiskMode = 'warn' | 'block' | 'off';
```

> 不需要 `StealthPolicy` / `StealthConnectionKind` — 只有 local 模式，所有 stealth 层无条件启用。

#### `stealth/stealth-patches.ts` — 补丁集

职责：构建完整的 init-script 字符串，包含 25 个 IIFE 补丁。

从外部项目完整移植以下补丁（每个补丁是独立 IIFE，互不依赖）：

| #     | 补丁                                 | 对抗目标                  |
| ----- | ------------------------------------ | ------------------------- |
| 1     | `navigator.webdriver` 移除           | 最基础的自动化检测        |
| 2     | CSS `border-end-end-radius` 探针中和 | CreepJS                   |
| 3     | `window.chrome.runtime` 补全         | chrome.runtime 缺失检测   |
| 4     | `navigator.language/languages` 对齐  | 语言不一致检测            |
| 5     | `navigator.plugins/mimeTypes` 注入   | 空 plugins 检测           |
| 6     | `navigator.permissions.query` 修正   | notifications 权限异常    |
| 7     | WebGL vendor/renderer 替换           | SwiftShader 检测          |
| 8     | `cdc_` 属性清理                      | Chrome DevTools 属性检测  |
| 9-10  | window/screen 尺寸修正               | 窗口 == 视口 检测         |
| 11    | screen 可用区域修正                  | 全屏可用检测              |
| 12    | `hardwareConcurrency` 修正           | CPU 核心数过低检测        |
| 13    | Notification 权限修正                | 通知权限异常              |
| 14    | ActiveText 颜色修正                  | CreepJS 颜色探针          |
| 15-16 | connection/worker downlinkMax        | 网络信号异常              |
| 17    | `prefers-color-scheme` 中和          | 主题偏好检测              |
| 18-19 | navigator.share/contacts             | API 缺失检测              |
| 20    | contentIndex                         | API 缺失检测              |
| 21    | pdfViewerEnabled                     | PDF 查看器标记            |
| 22    | mediaDevices                         | 空设备列表检测            |
| 23-24 | UA/UAData 清理                       | HeadlessChrome 字符串检测 |
| 25    | performance.memory                   | 内存 API 缺失检测         |
| 26    | 背景色修正                           | 透明背景检测              |

设计原则：

- 每个补丁函数返回字符串（IIFE），由 `buildStealthScript()` 组合
- 补丁通过 `context.addInitScript()` 在页面脚本前注入
- 配置项（locale/languages）通过闭包变量 `__abStealth` 传入

#### `stealth/stealth-cdp.service.ts` — CDP 覆写

职责：通过 CDP 协议覆写 UA 和元数据。NestJS `@Injectable()` 服务，注入到 `BrowserPool`。

两个层级：

1. **Browser 级别**（`(browser as any).newBrowserCDPSession()`）：覆写所有已有 targets（含 Worker），完成后立即 **detach**
2. **Page 级别**（`page.context().newCDPSession(page)`）：每个新页面自动覆写 + 设置白色背景，**不 detach**（Worker 覆写需要 session 存活）

> 注意：`Browser.newBrowserCDPSession()` 仅在 Chromium 上可用，Playwright 类型定义中为 `ChromiumBrowser`。
> 我们使用 `chromium.launch()` 所以一定是 Chromium，但需 `as any` 绕过类型（外部项目同样做法）。
> 非 Chromium 情况下需 `try/catch` 静默跳过。

```ts
// 核心逻辑（伪代码）
applyBrowserLevelStealth(browser, options) {
  try {
    cdp = (browser as any).newBrowserCDPSession()
    version = cdp.send('Browser.getVersion')
    patchedUA = options.userAgent || version.userAgent.replace(/HeadlessChrome/g, 'Chrome')
    if (!patchedUA.includes('HeadlessChrome') && !options.userAgent) {
      cdp.detach(); return  // 非 headless，无需覆写
    }
    metadata = buildUserAgentMetadata(patchedUA)

    // 遍历所有 target 并覆写
    for target in cdp.send('Target.getTargets') {
      sessionId = cdp.send('Target.attachToTarget', { targetId, flatten: true })
      cdp.send('Emulation.setUserAgentOverride', { userAgent, acceptLanguage, platform, metadata })
      cdp.send('Target.detachFromTarget', { sessionId })
    }
    cdp.detach()  // browser-level CDP 用完即释放
  } catch {
    // newBrowserCDPSession 不可用 — 静默跳过
  }
}

applyPageLevelStealth(page, options) {
  try {
    cdp = page.context().newCDPSession(page)
    cdp.send('Emulation.setUserAgentOverride', { userAgent, acceptLanguage, platform, metadata })
    cdp.send('Emulation.setDefaultBackgroundColorOverride', { color: { r:255, g:255, b:255, a:1 } })
    // 不 detach — Worker UA 覆写需要 CDP session 持续生效
  } catch {
    // 非 Chromium — 静默跳过
  }
}
```

#### `stealth/stealth-launch-args.ts` — 启动参数

职责：提供反检测启动参数常量。

```ts
const STEALTH_CHROMIUM_ARGS: string[] = [
  '--disable-blink-features=AutomationControlled', // 禁用自动化控制标识
  '--use-gl=angle', // 使用 ANGLE 渲染（避免 SwiftShader 指纹）
  '--use-angle=default', // 默认 ANGLE 后端
];
```

仅在 `local` 连接模式下注入；CDP/Provider 模式不使用（远端浏览器已启动）。

#### `stealth/stealth-region.service.ts` — 区域信号对齐

职责：从目标 URL 的 TLD 自动推断 locale、timezone、Accept-Language。

```ts
// TLD 映射表（20 地区）
const TLD_REGION_MAP: Record<string, { locale: string; timezone: string }> = {
  tw: { locale: 'zh-TW', timezone: 'Asia/Taipei' },
  jp: { locale: 'ja-JP', timezone: 'Asia/Tokyo' },
  kr: { locale: 'ko-KR', timezone: 'Asia/Seoul' },
  de: { locale: 'de-DE', timezone: 'Europe/Berlin' },
  // ... 共 20 条
};

// 核心逻辑（伪代码）
resolveRegion(url: string): { locale, timezone, acceptLanguage } | null {
  tld = extractTLD(url)         // 支持复合 TLD（co.jp, com.tw）
  region = TLD_REGION_MAP[tld]
  if (!region) return null
  return { ...region, acceptLanguage: buildAcceptLanguage(region.locale) }
}
```

接入点：

- **Context 创建时**：如果 `BrowserContextOptions` 中提供了初始 URL hint 或 TLD，在 `BrowserPool.createContextFromInstance()` 中调用 `resolveRegion()` 设置 `locale`/`timezoneId`（Playwright 仅在 `newContext()` 时支持设置，无法运行时动态更改）
- **`openUrl` 时**：仅更新 `Accept-Language` header（通过 `context.setExtraHTTPHeaders()`），因为 HTTP header 可以随时更改

#### `runtime/risk-detection.service.ts` — 风险信号检测（新增）

职责：检测当前页面是否为验证页/拦截页。

```ts
// URL 模式（高置信度）
const URL_PATTERNS = [
  { pattern: '/verify/captcha', code: 'captcha_interstitial', confidence: 0.98 },
  { pattern: 'scene=crawler',   code: 'bot_challenge',        confidence: 0.99 },
  { pattern: 'recaptcha',       code: 'captcha_interstitial', confidence: 0.97 },
  // ...
];

// Title 模式
const TITLE_PATTERNS = [
  { pattern: 'just a moment',          code: 'verification_interstitial', confidence: 0.95 },
  { pattern: 'checking your browser',  code: 'verification_interstitial', confidence: 0.97 },
  { pattern: '人机验证',                code: 'captcha_interstitial',      confidence: 0.95 },
  // ...
];

// 核心逻辑（伪代码）
detect(url: string, title: string): RiskSignal[] {
  signals = []
  for pattern in URL_PATTERNS:
    if url.toLowerCase().includes(pattern.pattern):
      signals.push({ ...pattern, source: 'url', evidence: pattern.pattern })
  for pattern in TITLE_PATTERNS:
    if title.toLowerCase().includes(pattern.pattern):
      signals.push({ ...pattern, source: 'title', evidence: pattern.pattern })
  return dedup(signals)
}
```

#### `runtime/action-pacing.service.ts` — 不变

保持现有职责：仅管理动作前延迟节奏（burst 检测、cooldown 等）。不增加任何执行逻辑。

#### `runtime/human-behavior.service.ts` — 行为人性化（新增）

职责：提供行为人性化的**纯函数计算**，不直接操作 Page。NestJS `@Injectable()` 服务，注入到 `ActionHandler`。

```ts
@Injectable()
export class HumanBehaviorService {
  // 计算 Bezier 鼠标移动轨迹点
  computeMousePath(fromX, fromY, toX, toY): Array<{x, y}> {
    cp1, cp2 = 随机控制点（±200px 偏移）
    steps = 15 + random(15)
    return steps.map(i => bezierPoint(i/steps, from, cp1, cp2, to))
  }

  // 执行 Bezier 鼠标移动（需要 Page 对象）
  async humanMouseMove(page: Page, toX: number, toY: number): Promise<void> {
    fromX, fromY = 随机起点（视口 30% 区域内）
    points = this.computeMousePath(fromX, fromY, toX, toY)
    for point of points:
      await page.mouse.move(point.x, point.y)
  }

  // 计算打字抖动延迟（基础值 ±40%）
  computeTypingDelay(baseDelay: number): number {
    jitter = baseDelay * 0.4
    return baseDelay + randomBetween(-jitter, jitter)
  }

  // 计算导航前随机延迟
  computeNavigationDelay(): number {
    return 300 + random(700)  // 300~1000ms
  }
}
```

> 三次 Bezier 曲线公式：`bezierPoint(t, p0, p1, p2, p3) = (1-t)³p0 + 3(1-t)²t·p1 + 3(1-t)t²·p2 + t³·p3`

**单一职责分离**：

- `HumanBehaviorService`：计算轨迹和延迟值（大部分为纯函数，`humanMouseMove` 是唯一需要 Page 的方法）
- `ActionHandler`：在 `handleClick()` 中调用 `humanBehavior.humanMouseMove(page, x, y)` 后再 `locator.click()`
- `ActionPacingService`：仅管理 burst 检测和 cooldown 延迟（不变）

### 3.4 接入点（最小侵入）

| 接入位置                                          | 改动内容                                                                                                                                                             | 风险                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `browser-pool.ts` → `createInstance()`            | 合并 `STEALTH_CHROMIUM_ARGS` 到 `chromium.launch({ args })`                                                                                                          | 低：仅追加参数          |
| `browser-pool.ts` → `createInstance()` 后         | 调用 `stealthCdp.applyBrowserLevelStealth(browser)`，完成后 CDP session 自动 detach                                                                                  | 低：一次性 CDP 操作     |
| `browser-pool.ts` → `createContextFromInstance()` | 调用 `stealthRegion.resolveRegion()` 设置 context locale/timezoneId；调用 `context.addInitScript()` 注入补丁；注册 `context.on('page', ...)` 事件监听 page-level CDP | 低：标准 Playwright API |
| `browser-session.service.ts` → `openUrl`          | 接入 `stealthRegion.resolveRegion()` 更新 `Accept-Language` header（通过 `context.setExtraHTTPHeaders()`）                                                           | 低：仅 HTTP header 更新 |
| `browser-session.service.ts` → `openUrl` 后       | 接入 `riskDetection.detect()` + 风险模式处理（全局 `warn` 模式，不暴露到 API）                                                                                       | 中：增加重试路径        |
| `handlers/action.handler.ts` → `handleClick()`    | click 前调用 `humanBehavior.humanMouseMove(page, x, y)`                                                                                                              | 低：增加鼠标轨迹        |
| `handlers/action.handler.ts` → `type` case        | 使用 `humanBehavior.computeTypingDelay()` 替代固定 `delay: 50`                                                                                                       | 低：参数替换            |
| `browser.module.ts`                               | 注册 `StealthCdpService`、`StealthRegionService`、`HumanBehaviorService`、`RiskDetectionService` 到 providers                                                        | 低：NestJS 模块注册     |

---

## 4. 核心逻辑

### 4.1 浏览器启动流程（改造后 — 对应 `BrowserPool`）

```
createInstance()                                     // browser-pool.ts
  │
  ├── args = [...现有运维参数, ...STEALTH_CHROMIUM_ARGS]
  │         // 新增: --disable-blink-features=AutomationControlled
  │         //       --use-gl=angle, --use-angle=default
  │
  ├── browser = chromium.launch({ headless: true, args })
  │
  ├── await stealthCdp.applyBrowserLevelStealth(browser)
  │     // (browser as any).newBrowserCDPSession()
  │     // 遍历所有 target → Emulation.setUserAgentOverride
  │     // 完成后 cdp.detach() — 一次性操作
  │
  └── return instance

createContextFromInstance(instance, options)          // browser-pool.ts
  │
  ├── // 区域对齐：如果 options 有 regionHint（TLD），resolve locale/timezoneId
  ├── region = stealthRegion.resolveRegion(options.regionHint)
  ├── locale = options.locale ?? region?.locale
  ├── timezoneId = options.timezoneId ?? region?.timezone
  │
  ├── context = instance.browser.newContext({
  │     viewport, userAgent, locale, timezoneId, ...
  │   })
  │     // 注意：locale/timezoneId 只能在 newContext() 时设置，无法运行时更改
  │
  ├── script = buildStealthScript({ locale, languages })  // 纯函数
  ├── await context.addInitScript({ content: script })    // 25+ 补丁在页面脚本前注入
  │
  ├── context.on('page', async (page) => {
  │     await stealthCdp.applyPageLevelStealth(page)      // 每个新页面自动 CDP 覆写
  │     // page-level CDP session 不 detach（Worker UA 覆写需要持续生效）
  │   })
  │
  ├── await attachNetworkGuard(context)                   // 已有 SSRF 防护
  │
  └── return context
```

> 没有 `StealthPolicy` 判定 — 所有 stealth 层无条件启用（只有 local 模式）。
> `BrowserPool` 构造函数新增注入：`StealthCdpService`、`StealthRegionService`。

### 4.2 导航流程（改造后）

```
openUrl(userId, sessionId, options)                     // browser-session.service.ts
  ├── urlValidator.isAllowed(url)                        // 已有 SSRF 防护
  ├── sitePolicyService.assertNavigationAllowed(host)    // 已有
  ├── siteRateLimiter.allow(host)                        // 已有
  │
  ├── // 区域信号：仅更新 Accept-Language（locale/timezone 在 context 创建时已设置）
  ├── region = stealthRegion.resolveRegion(url)
  ├── if region:
  │     context.setExtraHTTPHeaders({ 'Accept-Language': region.acceptLanguage })
  │
  ├── // 导航前抖动
  ├── delay = humanBehavior.computeNavigationDelay()     // 300~1000ms
  ├── await sleep(delay)
  │
  ├── result = navigationRetryService.run(() => page.goto(url))
  │
  ├── // 风险检测（全局 warn 模式，不暴露到 API）
  ├── signals = riskDetection.detect(page.url(), await page.title())
  ├── if signals.length > 0:
  │     riskTelemetry.recordRiskSignal(signals)
  │     for attempt in 1..2:
  │       backoff = 3000 + random(4000)
  │       await sleep(backoff)
  │       await page.goto(url)
  │       if riskDetection.detect(...).length === 0:
  │         return { success, warning: 'recovered', riskSignals }
  │     return { success, warning: 'captcha detected', riskSignals }
  │
  └── return result
```

> 风险模式全局硬编码为 `warn`（重试+退避），不暴露 `riskMode` 到 `OpenUrlInput` DTO。
> `browser-session.service.ts` 构造函数新增注入：`StealthRegionService`、`RiskDetectionService`、`HumanBehaviorService`。

### 4.3 点击流程（改造后 — 对应 `ActionHandler`）

```
execute(session, action)                                 // action.handler.ts
  ├── pacing = actionPacing.beforeAction('click')        // 已有 — 延迟节奏
  │
  ├── locator = resolveActionLocator(session, action)
  │
  └── handleClick(locator, action)
        ├── page = sessionManager.getActivePage(session)
        ├── box = await locator.boundingBox()
        │
        ├── if box:
        │     targetX = box.x + box.width * (0.3 + random(0.4))
        │     targetY = box.y + box.height * (0.3 + random(0.4))
        │     await humanBehavior.humanMouseMove(page, targetX, targetY)  // Bezier 曲线
        │
        ├── await locator.click({ button, clickCount, modifiers, timeout })
        │
        └── return { success: true }
```

### 4.4 打字流程（改造后 — 对应 `ActionHandler`）

```
case 'type':                                             // action.handler.ts
  ├── delay = humanBehavior.computeTypingDelay(50)       // 50ms ±40% = 30~70ms
  ├── await locator.pressSequentially(action.value, { delay, timeout })
  └── return { success: true }
```

> `ActionHandler` 构造函数新增注入：`HumanBehaviorService`。
> `ActionPacingService` 保持不变（单一职责）。

---

## 5. 分步执行计划

### Step 0：建立 stealth 模块骨架与类型（0.5 天）

- **输入**：外部项目 `stealth.ts` 类型定义
- **输出**：
  - `stealth/stealth.types.ts`：StealthScriptOptions、RiskSignal、RiskMode（不需要 StealthPolicy/StealthConnectionKind — 只有 local 模式）
  - `stealth/index.ts`：公共导出
- **风险**：无（纯类型文件）
- **回滚**：删除 `stealth/` 目录

### Step 1：移植 init-script 补丁集（1 天）

- **输入**：外部项目 `stealth.ts` 的 25 个补丁函数
- **输出**：
  - `stealth/stealth-patches.ts`：`buildStealthScript(options)` 函数
  - `browser/__tests__/stealth-patches.spec.ts`：每个补丁的单元测试
- **核心逻辑**：逐个移植补丁函数，保持 IIFE 结构，通过 `addInitScript` 注入
- **风险**：补丁与 Playwright 版本兼容性
- **验证**：使用 Playwright 创建 context → 注入补丁 → 评估 `navigator.webdriver`、`chrome.runtime` 等
- **回滚**：移除 `stealth-patches.ts`

### Step 2：实现 CDP 覆写服务（1 天）

- **输入**：外部项目 `stealth.ts` 的 CDP 逻辑
- **输出**：
  - `stealth/stealth-cdp.service.ts`：Browser/Page 级别 CDP 覆写
  - `browser/__tests__/stealth-cdp.service.spec.ts`
- **核心逻辑**：
  - `applyBrowserLevelStealth(browser)`：遍历 targets 覆写 UA + metadata
  - `applyPageLevelStealth(page)`：Page CDP 覆写 + 白色背景
  - 自动构建 `userAgentMetadata`（brands、fullVersionList、platform）
- **风险**：CDP session 生命周期管理；非 Chromium 浏览器需静默跳过
- **回滚**：移除 `stealth-cdp.service.ts`

### Step 3：启动参数常量 + 接入 BrowserPool + NestJS 模块注册（1 天）

- **输入**：Step 1-2 的产出
- **输出**：
  - `stealth/stealth-launch-args.ts`：`STEALTH_CHROMIUM_ARGS` 常量
  - `browser-pool.ts`：构造函数注入 `StealthCdpService` + `StealthRegionService`；`createInstance()` 合并 stealth args + 调用 browser-level CDP（apply 后 detach）；`createContextFromInstance()` 注入 init-scripts + `context.on('page')` 注册 page-level CDP
  - `browser.module.ts`：注册 `StealthCdpService`、`StealthRegionService` 到 providers
  - 更新 `browser-pool.spec.ts`
- **核心逻辑**：
  - `createInstance()` 的 args 数组追加 3 个反检测参数
  - browser 创建后立即调用 `stealthCdp.applyBrowserLevelStealth(browser)`，内部 CDP session 用完即 detach
  - context 创建后立即调用 `addInitScript` + 注册 `page` 事件监听（page-level CDP 不 detach）
  - `BrowserContextOptions` 新增可选 `regionHint?: string` 字段，用于 context 创建时区域对齐
- **风险**：stealth 参数可能与现有运维参数冲突（实际不会，互不影响）
- **回滚**：revert browser-pool.ts + browser.module.ts 的改动

### Step 4：实现区域信号对齐服务（0.5 天）

- **输入**：外部项目 `browser.ts` 的 TLD_REGION_MAP + resolveLocale/resolveTimezone
- **输出**：
  - `stealth/stealth-region.service.ts`
  - `browser/__tests__/stealth-region.service.spec.ts`
- **核心逻辑**：URL TLD 提取 → 区域查表 → CDP 动态覆写
- **风险**：用户显式设置的 locale/timezone 不应被覆盖（env 优先）
- **回滚**：移除 `stealth-region.service.ts`

### Step 5：接入区域对齐到 openUrl（Accept-Language 更新）（0.5 天）

- **输入**：Step 4 产出 + `browser-session.service.ts`
- **输出**：
  - `browser-session.service.ts`：构造函数注入 `StealthRegionService`；`openUrl` 前调用 `resolveRegion(url)` 更新 `Accept-Language` header
  - `browser.module.ts`：确认 `StealthRegionService` 已注册
  - 更新 `browser-session.service.spec.ts`
- **核心逻辑**：仅通过 `context.setExtraHTTPHeaders()` 更新 Accept-Language（locale/timezoneId 在 context 创建时已设置，Playwright 不支持运行时更改）
- **风险**：低（仅 HTTP header 更新）
- **回滚**：revert browser-session.service.ts

### Step 6：实现风险信号检测服务（0.5 天）

- **输入**：外部项目 `actions.ts` 的 `detectRiskSignals()` 函数
- **输出**：
  - `runtime/risk-detection.service.ts`
  - `browser/__tests__/risk-detection.service.spec.ts`
- **核心逻辑**：URL/Title 模式匹配 → 结构化 RiskSignal 数组
- **风险**：无（纯函数）
- **回滚**：移除 `risk-detection.service.ts`

### Step 7：接入风险检测到导航流程（0.5 天）

- **输入**：Step 6 产出 + `browser-session.service.ts`
- **输出**：
  - `browser-session.service.ts`：构造函数注入 `RiskDetectionService`；`openUrl` 后调用 `detect()` + 全局 warn 模式重试
  - `browser.module.ts`：注册 `RiskDetectionService`
  - 更新 `browser-session.service.spec.ts`
- **核心逻辑**：风险模式全局硬编码为 `warn`，不暴露 `riskMode` 到 `OpenUrlInput` DTO；检测到风险信号时最多重试 2 次（退避 3~7s）
- **风险**：warn 模式增加最多 2 次重试，可能影响响应时间（最多 +14s）
- **回滚**：revert browser-session.service.ts

### Step 8：新增 HumanBehaviorService + 增强 ActionHandler（1 天）

- **输入**：外部项目 `actions.ts` 的 humanMouseMove/typing jitter
- **输出**：
  - `runtime/human-behavior.service.ts`：Bezier 鼠标轨迹计算 + 打字抖动计算 + 导航延迟计算
  - `handlers/action.handler.ts`：构造函数注入 `HumanBehaviorService`；`handleClick()` 中 click 前调用 `humanMouseMove(page, x, y)`；`type` case 使用动态延迟
  - `browser-session.service.ts`：`openUrl` 中使用 `humanBehavior.computeNavigationDelay()` 替代硬编码
  - `browser.module.ts`：注册 `HumanBehaviorService`
  - `browser/__tests__/human-behavior.service.spec.ts`
  - 更新 `action.handler.spec.ts`
- **核心逻辑**：
  - Bezier 曲线公式（纯函数）+ `page.mouse.move()` 执行（在 `HumanBehaviorService.humanMouseMove()` 中）
  - 打字延迟：基础 50ms ±40% 随机化
  - 导航延迟：300~1000ms 随机
- **单一职责**：`ActionPacingService` 不变（仅 burst/cooldown）；`HumanBehaviorService` 管人性化计算+执行
- **风险**：可能略微增加动作执行时间（每次点击 ~100-200ms，每次打字 ±20ms/字符）
- **回滚**：移除 `human-behavior.service.ts`，revert action.handler + browser-session.service 改动

### Step 9：端到端验证与回归（1 天）

- **输入**：全部 Step 完成后的代码
- **输出**：
  - bot.sannysoft.com 全项检测通过截图
  - creepjs headless 无标记
  - `pnpm lint && pnpm typecheck && pnpm test:unit` 全通过
  - 更新架构文档与本文件状态
- **风险**：个别检测项可能需要微调补丁
- **回滚**：可按 Step 逐步回退

---

## 6. 测试与验证策略

### 6.1 单元测试（必须）

| 测试文件                         | 覆盖内容                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `stealth-patches.spec.ts`        | 每个补丁函数返回有效 IIFE 字符串；`buildStealthScript` 组合所有补丁                    |
| `stealth-cdp.service.spec.ts`    | CDP session mock；UA metadata 构建；HeadlessChrome 替换；browser-level detach 验证     |
| `stealth-region.service.spec.ts` | TLD 提取（含复合 TLD）；区域映射；用户 env 优先                                        |
| `risk-detection.service.spec.ts` | URL/Title 模式匹配；去重；置信度排序                                                   |
| `human-behavior.service.spec.ts` | Bezier 轨迹点在合理范围内；打字抖动范围在 ±40% 内；导航延迟在 300~1000ms               |
| `browser-pool.spec.ts`（更新）   | stealth args 被合并到启动参数；init-scripts 被注入到 context；StealthCdpService 被调用 |
| `action.handler.spec.ts`（更新） | click 前 humanMouseMove 被调用；type 使用动态 delay                                    |

### 6.2 集成测试（推荐）

- 使用 Playwright 启动 Chromium → 注入全量补丁 → 导航到 `bot.sannysoft.com` → 验证检测项
- 使用 Playwright 启动 Chromium → 验证 `navigator.webdriver === undefined`
- 使用 Playwright 启动 Chromium → 验证 `window.chrome.runtime` 存在

### 6.3 回归基线

| 指标                     | 基线             | 目标                       |
| ------------------------ | ---------------- | -------------------------- |
| bot.sannysoft.com 通过率 | 未知（当前未测） | 100%                       |
| creepjs headless 标记    | 未知             | 无标记                     |
| 现有单测通过率           | 100%             | 100%                       |
| openUrl 平均响应时间     | 基线             | 允许 +500ms（导航抖动）    |
| click 平均响应时间       | 基线             | 允许 +200ms（Bezier 曲线） |

### 6.4 观测指标（复用现有 telemetry）

- `browser_risk_signal_total{code, source}`：风险信号触发次数
- `browser_risk_recovery_total`：warn 模式重试成功次数
- `browser_stealth_cdp_error_total`：CDP 覆写失败次数（非 Chromium 或 CDP 异常）

---

## 7. 行为准则

### 核心原则

1. **最佳实践优先**：为可维护性允许破坏性重构，不考虑历史兼容
2. **模块化**：每个模块有明确边界，可独立测试、独立部署
3. **单一职责（SRP）**：每个 service/函数只做一件事
   - `ActionPacingService`：仅管延迟节奏
   - `HumanBehaviorService`：仅管行为人性化计算+执行
   - `StealthCdpService`：仅管 CDP 覆写
   - `StealthRegionService`：仅管区域信号推断
   - `RiskDetectionService`：仅管风险信号检测
4. **不过度设计**：简单直接，拒绝不必要的抽象
   - 补丁用字符串拼接（外部项目验证过的方案），不引入 AST 解析
   - 区域映射用静态 Map，不引入 i18n 框架
   - 风险检测用正则/字符串匹配，不引入 ML 模型
   - 不引入策略模式/工厂模式 — 只有 local 模式，不需要运行时分派
5. **易读易懂易维护**：代码是给人看的
   - 命名清晰：函数名就是文档
   - 提前返回，减少嵌套
   - 必要注释说明"为什么"，而非"做了什么"

### 工程规则

6. **Stealth 无条件启用**：没有运行时开关，没有策略判定，所有层直接硬编码启用
7. **允许破坏性重构**：旧的"禁止伪装"约束已废除；如果改造需要修改现有接口签名，直接修改
8. **先本地后演进**：所有配置先硬编码/常量，验证有效后再考虑可配置化
9. **纯函数优先**：补丁构建、风险检测、Bezier 计算均为纯函数，便于测试
10. **最小侵入**：通过 NestJS 依赖注入接入，不修改 Playwright 核心调用方式
11. **无用代码直接删除**：不保留废弃注释、不写兼容层

---

## 8. 参考文件清单

### 外部项目（本地路径）

| 文件                                                       | 说明                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| `archive/external-repos/agent-browser/README.md`           | 项目文档：stealth 架构 5 大原则                        |
| `archive/external-repos/agent-browser/src/stealth.ts`      | **核心**：25+ 补丁 IIFE + CDP 覆写 + 启动参数          |
| `archive/external-repos/agent-browser/src/browser.ts`      | BrowserManager：stealth 策略集成 + 区域对齐 + 连接模式 |
| `archive/external-repos/agent-browser/src/actions.ts`      | 风险检测 + Bezier 鼠标 + 打字抖动 + 导航节奏           |
| `archive/external-repos/agent-browser/src/types.ts`        | 类型定义：RiskSignal、RiskMode、LaunchCommand          |
| `archive/external-repos/agent-browser/src/stealth.test.ts` | Stealth 测试用例参考                                   |

### 当前项目（需改造文件）

| 文件                                                         | 改造类型                                                                                                                                                                                                                      |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/anyhunt/server/src/browser/browser-pool.ts`            | 改造：构造函数注入 `StealthCdpService`/`StealthRegionService`；`createInstance()` 注入 stealth args + browser-level CDP（apply 后 detach）；`createContextFromInstance()` 注入 init-scripts + `context.on('page')` + 区域对齐 |
| `apps/anyhunt/server/src/browser/browser-session.service.ts` | 改造：构造函数注入 `StealthRegionService`/`RiskDetectionService`/`HumanBehaviorService`；`openUrl` 接入 Accept-Language 更新 + 导航抖动 + 风险检测                                                                            |
| `apps/anyhunt/server/src/browser/handlers/action.handler.ts` | 增强：构造函数注入 `HumanBehaviorService`；`handleClick()` 前调用 `humanMouseMove`；`type` case 使用动态 delay                                                                                                                |
| `apps/anyhunt/server/src/browser/browser.module.ts`          | 改造：注册 `StealthCdpService`/`StealthRegionService`/`HumanBehaviorService`/`RiskDetectionService` 到 providers + exports                                                                                                    |
| `apps/anyhunt/server/src/browser/browser.types.ts`           | 改造：`BrowserContextOptions` 新增可选 `regionHint?: string` 字段                                                                                                                                                             |

### 当前项目（新增文件）

| 文件                                                                | 说明                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------ |
| `apps/anyhunt/server/src/browser/stealth/index.ts`                  | 公共导出                                               |
| `apps/anyhunt/server/src/browser/stealth/stealth.types.ts`          | 类型定义（StealthScriptOptions、RiskSignal、RiskMode） |
| `apps/anyhunt/server/src/browser/stealth/stealth-patches.ts`        | 25+ Init-script 补丁（纯函数）                         |
| `apps/anyhunt/server/src/browser/stealth/stealth-cdp.service.ts`    | CDP 覆写（@Injectable）                                |
| `apps/anyhunt/server/src/browser/stealth/stealth-launch-args.ts`    | 启动参数常量                                           |
| `apps/anyhunt/server/src/browser/stealth/stealth-region.service.ts` | 区域信号对齐（@Injectable）                            |
| `apps/anyhunt/server/src/browser/runtime/human-behavior.service.ts` | Bezier 鼠标曲线 + 打字抖动 + 导航延迟（@Injectable）   |
| `apps/anyhunt/server/src/browser/runtime/risk-detection.service.ts` | 风险信号检测（@Injectable，纯函数）                    |

### 文档

| 文件                                                                                                | 说明                        |
| --------------------------------------------------------------------------------------------------- | --------------------------- |
| `docs/products/anyhunt-dev/features/agent-browser/stealth-fork-gap-and-adoption-plan.md`            | 本文件                      |
| `docs/products/anyhunt-dev/features/agent-browser/compliance-automation-and-detection-risk-plan.md` | 已更新：移除"禁止伪装"约束  |
| `docs/products/anyhunt-dev/features/agent-browser/architecture.md`                                  | 待更新：补充 stealth 层说明 |

---

## 实施状态

- [x] Step 0：stealth 模块骨架与类型 — `stealth/stealth.types.ts` + `stealth/index.ts`
- [x] Step 1：init-script 补丁集移植 — `stealth/stealth-patches.ts`（26 个 IIFE 补丁）
- [x] Step 2：CDP 覆写服务 — `stealth/stealth-cdp.service.ts`
- [x] Step 3：启动参数 + 接入 BrowserPool + NestJS 模块注册 — `stealth/stealth-launch-args.ts` + `browser-pool.ts` 改造 + `browser.module.ts`
- [x] Step 4：区域信号对齐服务 — `stealth/stealth-region.service.ts`
- [x] Step 5：接入区域对齐到 openUrl — `browser-session.service.ts` Accept-Language 更新
- [x] Step 6：风险信号检测服务 — `runtime/risk-detection.service.ts`
- [x] Step 7：接入风险检测到导航流程 — `browser-session.service.ts` 风险信号遥测
- [x] Step 8：HumanBehaviorService + ActionHandler 增强 — `runtime/human-behavior.service.ts` + `action.handler.ts` Bezier 鼠标+打字抖动
- [x] Step 9：全量回归通过 — 23 test files, 124 tests passed
