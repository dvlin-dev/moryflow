---
title: Moryflow 认证、同步与发布核心规范
date: 2026-02-28
scope: apps/moryflow/server, apps/moryflow/pc, apps/moryflow/mobile
status: active
---

# 认证链路

- Token-first：PC/Mobile 启动优先用本地 refresh token 续期。
- 无 refresh token 时必须 fail-fast，避免无意义网络请求。
- 仅在明确 `401/403` 时清会话；网络失败保留未过期 access token。

## 云同步

- 一致性依据：`fileId + vectorClock + lastSyncedHash`。
- 冲突策略：保留远端冲突副本，本地版本覆盖原文件。
- `lastSyncedSize/mtime` 仅用于性能优化，不参与冲突判定。
- commit 成功后再回写 FileIndex，防止本地状态领先服务端。

## 站点发布

- 子域：`{slug}.moryflow.app`。
- 发布产物使用静态模板与 R2 托管，按 `sites/{slug}` 前缀组织。
- 生成站点应保持明暗主题与导航一致性。

## 工程治理

- 问题修复必须先定位根因，在事实源/协议边界一次性收口。
- 禁止在同步、认证、发布链路引入临时补丁分支。
