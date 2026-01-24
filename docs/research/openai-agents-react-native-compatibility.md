---
title: OpenAI Agents SDK RN 兼容性调研（仅 Core 模块）
date: 2026-01-26
scope: openai-agents-js
status: draft
---

<!--
[INPUT]: openai-agents-js 官方 packages 清单 + RN 兼容性诉求（不使用 Realtime）
[OUTPUT]: 仅做 core 兼容的可行性结论 + 最小改造方案
[POS]: 判断是否能停止本地二开并回归官方包的依据

[PROTOCOL]: 本文件变更时，需同步更新 docs/index.md 与 docs/CLAUDE.md（最近更新）。
-->

# 结论（先给答案）

- **可行**。在“不使用 Realtime”的前提下，可以回退官方包，并只为 `@openai/agents-core` 做 RN 兼容适配。
- 官方 `packages/` 只有 5 个包：`agents` / `agents-core` / `agents-openai` / `agents-realtime` / `agents-extensions`。其中 RN 不兼容的核心是 `agents-realtime`，但你已明确不需要。
- **无需 fork 官方仓库**，可通过“应用层 shim + bundler alias”的方式，让 `@openai/agents-core/_shims` 指向 RN 专用实现。
- 日志系统可以通过 `setTraceProcessors` 接入你的系统，不需要改 SDK 源码。

# 官方包清单（packages/）

官方仓库 `openai-agents-js/packages` 目前只有 5 个包：

1. `@openai/agents`
2. `@openai/agents-core`
3. `@openai/agents-openai`
4. `@openai/agents-realtime`
5. `@openai/agents-extensions`

来源：GitHub API 列表（仅这 5 个目录）。

- https://api.github.com/repos/openai/openai-agents-js/contents/packages

# RN 不兼容范围（排除 Realtime）

- 你不使用 `@openai/agents-realtime`，因此**不需要处理 WebRTC / WebSocket / react-native-webrtc 等问题**。
- 真正需要解决的是 `@openai/agents-core` 在 RN 下缺少 Node/DOM 能力：
  - `EventTarget` / `CustomEvent`（browser shim 依赖）
  - `crypto.randomUUID`
  - `ReadableStream` / `TransformStream`
  - `AsyncLocalStorage`
  - `timer`（setTimeout/unref 兼容）

官方目前只提供 node/browser/workerd shims，没有 RN shim，因此需要**在应用侧覆盖 `_shims`**。

# 仅对 Core 做 RN 兼容的方案（最佳实践）

## 目标

- **不 fork** 官方包；只在 RN 应用侧增加一个 shim 文件。
- 让 `@openai/agents-core/_shims` 在 RN 环境下指向该 shim。
- 保持官方包可持续更新。

## 方案概览

1. **使用官方包**（来自 npm）：
   - `@openai/agents`
   - `@openai/agents-core`
   - `@openai/agents-openai`

2. **在 RN 应用中新增一个 shim 文件**（例如：`apps/moryflow/mobile/src/openai-agents-core-shims.ts`），只实现 core 所需的最小能力：
   - EventEmitter（轻量实现）
   - `randomUUID()`
   - `ReadableStream` / `TransformStream`（通过 polyfill）
   - `AsyncLocalStorage`（简化实现）
   - `timer`（setTimeout 包装）
   - `isBrowserEnvironment()` 返回 false

3. **在 bundler / TS 中做 alias**：
   - Metro：把 `@openai/agents-core/_shims` 指向本地 shim 文件
   - TypeScript `paths` 同步指向，保证类型正确

## 推荐实现要点

### 1) RN shim 的最小职责

- **事件系统**：提供 `RuntimeEventEmitter`（可用自定义 EventEmitter）。
- **UUID**：优先用 `expo-crypto`；其次用 `crypto.randomUUID`（需要 `react-native-get-random-values`）。
- **Streams**：使用 `web-streams-polyfill` 的 ponyfill（或全局 polyfill）。
- **AsyncLocalStorage**：可做简化实现（不保证跨异步链完整隔离）。
- **timer**：包装 RN 的 `setTimeout`，提供 `unref/hasRef/refresh` 空实现即可。

> 注意：这个 shim 只为 `agents-core` 服务，保持最小实现即可。

### 2) Metro alias（示意）

```js
// apps/moryflow/mobile/metro.config.js
const path = require('path');

module.exports = {
  resolver: {
    extraNodeModules: {
      '@openai/agents-core/_shims': path.resolve(__dirname, 'src/openai-agents-core-shims.ts'),
    },
  },
};
```

### 3) TS path alias（示意）

```json
// apps/moryflow/mobile/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@openai/agents-core/_shims": ["./src/openai-agents-core-shims.ts"]
    }
  }
}
```

### 4) 必要 polyfill

- `react-native-get-random-values`
- `web-streams-polyfill/ponyfill`

这些 polyfill 可以在 RN 入口处引入一次即可。

# Moryflow Mobile 当前配置与需要修改（仅 Core）

## 当前配置摘要（apps/moryflow/mobile）

- `metro.config.js` 已启用 `unstable_enablePackageExports` 和条件导出解析，并通过 `resolveRequest` 强制映射：
  - `@openai/agents-core/_shims` → `apps/moryflow/mobile/src/openai-agents-core-shims.ts`
  - `@openai/agents` → `@openai/agents-core`（避免引入 realtime）
  - `@openai/agents/utils` → `@openai/agents-core/utils`
- `app/_layout.tsx` 已引入 `react-native-get-random-values` 与本地 `polyfills.js`。
- `polyfills.js` 已补 `structuredClone`、`TextEncoderStream`/`TextDecoderStream`、`ReadableStream`/`TransformStream`。
- `tsconfig.json` 已配置 `@openai/agents-core/_shims` 的 paths 映射。

## 需要修改（只保留 Core 兼容）

### 1) Metro shim 映射（替换 anyhunt → openai）

把当前 `shimsMap` 改为仅针对 `@openai/agents-core/_shims`，并指向**应用侧 shim 文件**（不依赖 monorepo dist）：

```js
// apps/moryflow/mobile/metro.config.js
const shimsMap = {
  '@openai/agents-core/_shims': 'apps/moryflow/mobile/src/openai-agents-core-shims.ts',
};
```

并对 `@openai/agents` 做 alias，避免 `@openai/agents-extensions` 触发 realtime 依赖。

### 2) TS paths 增加 openai shim

```json
// apps/moryflow/mobile/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@openai/agents-core/_shims": ["./src/openai-agents-core-shims.ts"]
    }
  }
}
```

### 3) Polyfills 补齐 ReadableStream/TransformStream

在 `apps/moryflow/mobile/polyfills.js` 增加 web streams ponyfill 注入（确保在任何 SDK 代码加载前运行）：

```js
import {
  ReadableStream,
  WritableStream,
  TransformStream,
} from 'web-streams-polyfill/ponyfill/es2018';

if (!global.ReadableStream) {
  global.ReadableStream = ReadableStream;
}
if (!global.WritableStream) {
  global.WritableStream = WritableStream;
}
if (!global.TransformStream) {
  global.TransformStream = TransformStream;
}
```

### 4) 依赖调整（仅 core + streams polyfill）

在 `apps/moryflow/mobile/package.json` 中引入：

- `@openai/agents-core`
- `web-streams-polyfill`

并移除对 `@anyhunt/agents` 的依赖（已切换到 `@openai/agents-core`）。

> 说明：当前 mobile 还依赖 `@anyhunt/agents-runtime` / `@anyhunt/agents-tools` / `@anyhunt/agents-adapter`。
> `@openai/agents-extensions` 依赖 `@openai/agents`（peer），RN 端需通过 Metro alias 将 `@openai/agents` 指向 `@openai/agents-core`，避免引入 realtime。

# 日志系统接入（不 fork）

- `agents-core` 提供 `TracingExporter` / `BatchTraceProcessor` / `setTraceProcessors`。
- 你可以实现一个自定义 exporter，把 trace 推送到你的日志系统：

```ts
import { BatchTraceProcessor, setTraceProcessors } from '@openai/agents-core';
import { YourTracingExporter } from './your-exporter';

setTraceProcessors([new BatchTraceProcessor(new YourTracingExporter())]);
```

> 默认 logger 基于 `debug` + `console`，没有官方替换入口。如需统一日志，可在应用层包装 `debug.log` 或代理 `console`。

# 风险与边界

- `AsyncLocalStorage` 在 RN 上功能有限，Tracing 的完整上下文隔离可能不完整。
- 若后续引入 `agents-realtime`，则必须增加 RN shim + WebRTC 适配，工作量明显上升。

# 最终建议

- **你不需要 Realtime 的前提下，回退官方包 + 仅做 core 的 RN shim 是最佳实践**。
- 该方案可最大化跟进官方更新，同时把“二开面”压缩到应用层的一个 shim 文件。
