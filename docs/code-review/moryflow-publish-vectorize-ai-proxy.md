---
title: Moryflow Publish/Vectorize/AI Proxy Code Review
date: 2026-01-23
scope: apps/moryflow/publish-worker + apps/moryflow/server/src/ai-proxy
status: in_progress
---

<!--
[INPUT]: apps/moryflow/publish-worker, apps/moryflow/server/src/ai-proxy, apps/moryflow/server/src/vectorize（暂不处理）
[OUTPUT]: 风险清单 + 修复建议 + 进度记录
[POS]: Phase 1 / P1 模块审查记录（Publish/AI Proxy，Vectorize 暂不处理）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Moryflow Publish/Vectorize/AI Proxy Code Review

## 范围

- Publish Worker：`apps/moryflow/publish-worker/`
- AI Proxy：`apps/moryflow/server/src/ai-proxy/`
- Vectorize：暂不处理（将由 Anyhunt 的 Memox 替换）

主要入口：

- `moryflow.app` / `*.moryflow.app`（Cloudflare Worker）
- `/v1/models`、`/v1/chat/completions`

## 结论摘要

- 高风险问题（P1）：1 个（AI Proxy 计费预检缺失）
- 中风险问题（P2）：2 个（流式断连不取消、Publish meta 解析失败导致 500）
- 低风险/规范问题（P3）：3 个（非 GET/HEAD 请求未限制、SSE 未处理 backpressure、OpenAI 参数忽略）

## 发现（按严重程度排序）

- [P1] 计费预检缺失：`apps/moryflow/server/src/ai-proxy/ai-proxy.service.ts` 仅检查余额是否 > 0，未做预估/预扣或上限控制。低余额用户可触发长输出，流式场景 `onUsage` 扣费失败也已输出内容，存在成本裸奔与额度绕过风险。
- [P2] 流式断连不取消：`apps/moryflow/server/src/ai-proxy/ai-proxy.controller.ts` 在客户端断开时不取消模型推理，也未向 AI SDK 传递 abort 信号，可能导致持续消耗并延迟释放资源。
- [P2] Publish 元数据解析失败会 500：`apps/moryflow/publish-worker/src/handler.ts` 直接 `object.json()`，若 `_meta.json` 损坏会抛异常导致 500；`expiresAt` 解析异常也可能导致状态判断失真。

- [P3] Publish 未限制非 GET/HEAD：`apps/moryflow/publish-worker/src/handler.ts` 未对方法做过滤，POST/PUT 等被当作 GET 处理，易被滥用或制造无效请求。
- [P3] SSE 未处理 backpressure：`apps/moryflow/server/src/ai-proxy/ai-proxy.controller.ts` `res.write()` 未等待 `drain`，高频流式输出可能产生内存压力。
- [P3] OpenAI 参数声明但未生效：`apps/moryflow/server/src/ai-proxy/dto/schemas.ts` 接收 `stop`/`n`/`user`，但 `ai-proxy.service.ts` 未传递给 AI SDK，存在协议兼容性落差。

## 修复建议

- 计费预检：引入“预估/预扣/上限”策略（例如基于 `max_tokens` + 模型单价预估；不足即拒绝），完成后再按实际 usage 结算并差额退回。
- 断连取消：在控制器监听 `res.on('close')`，触发 AbortController，向 AI SDK 传递 `signal` 终止推理，并在回调中跳过扣费。
- Publish 容错：`_meta.json` 解析失败时返回 404/离线页；`decodeURIComponent` 包裹 try/catch；为 OFFLINE/EXPIRED/404 增加明确的 `Cache-Control`。
- SSE backpressure：当 `res.write()` 返回 false 时等待 `drain`，避免积压。
- 协议兼容：若要支持 `stop`/`n`/`user`，补齐参数透传；否则从 schema 移除并在文档说明。

## 修复计划与进度

- 当前阶段：review
- 待处理：上述问题的修复与单测
- 状态：in_progress
