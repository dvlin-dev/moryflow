---
title: Moryflow PC 本地凭据存储
date: 2026-03-12
scope: apps/moryflow/pc
status: active
---

# Moryflow PC 本地凭据存储

## 1. 目标与边界

- 桌面端当前以“零 Keychain 弹窗”为第一优先级。
- 所有会触发 macOS Keychain 的凭据路径都已移除；桌面端不再依赖 `keytar` 或 Electron `safeStorage`。
- 当前不做旧 Keychain 条目迁移，也不兼容旧桌面端凭据格式。

## 2. 当前存储策略

- Telegram Bot Token、Webhook Secret、Proxy URL 使用独立本地 store 持久化。
- Membership 的 refresh/access token 与 access token 过期时间使用独立本地 store 持久化。
- Agent runtime 的 `SecureStorage` 接口仍保留，但底层已经改为普通本地字符串存储。
- 上述凭据都不写入普通设置快照，也不会再触发系统钥匙串授权弹窗。

## 3. 存储布局

### 3.1 存储工厂

- 主进程统一通过 `apps/moryflow/pc/src/main/storage/desktop-store.ts` 创建 `electron-store` 实例。
- 线上默认使用 Electron `userData` 目录。
- E2E 场景下，如设置 `MORYFLOW_E2E_USER_DATA`，所有 store 统一落到 `MORYFLOW_E2E_USER_DATA/stores`。

### 3.2 当前 store 划分

- `telegram-channel-secrets`：Telegram Bot Token、Webhook Secret、Proxy URL。
- `membership-token-store`：refresh token、access token、access token 过期时间。
- `agent-runtime-secure`：Agent runtime 的本地字符串凭据存储。
- `agent-runtime-storage`：Agent runtime 的普通持久化状态。

## 4. 行为约束

- Telegram runtime 只有在账号 `enabled=true` 时才会读取本地凭据；未启用账号不会在启动阶段读取 Telegram secrets。
- `membership.isSecureStorageAvailable()` 与 `telegram.isSecureStorageAvailable()` IPC 契约仍保留，但当前语义是“本地凭据存储可用”，桌面端实现恒为 `true`。
- Renderer 不再在启动或 Telegram 页面展示“安全存储不可用”的前置检查与告警。
- 当前本地凭据存储不提供 OS 级静态加密，不应再宣称为系统安全存储。

## 5. 构建与发布约束

- `@moryflow/pc` 不再声明 `keytar` 生产依赖，也不再执行针对 `keytar` 的 `electron-rebuild`。
- 发布契约测试必须持续断言桌面端生产代码不再引用 `keytar` / `safeStorage`。
- 桌面端 build/release 流程必须以最终打包产物为准，禁止把“依赖已安装”误当成“不会触发系统凭据访问”。

## 6. 验证基线

- `apps/moryflow/pc/src/main/app/packaging/release-build-contract.test.ts`
- `apps/moryflow/pc/src/main/channels/telegram/secret-store.test.ts`
- `apps/moryflow/pc/src/main/membership/token-store.test.ts`
- `apps/moryflow/pc/src/main/agent-runtime/runtime/desktop-adapter.test.ts`
- `apps/moryflow/pc/src/main/channels/telegram/runtime-orchestrator.test.ts`
- `apps/moryflow/pc/src/renderer/lib/server/__tests__/auth-methods.spec.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/remote-agents/telegram-section.behavior.test.tsx`
- `CI=1 pnpm --dir apps/moryflow/pc build`

## 7. 代码索引

- `apps/moryflow/pc/src/main/storage/desktop-store.ts`
- `apps/moryflow/pc/src/main/channels/telegram/secret-store.ts`
- `apps/moryflow/pc/src/main/membership/token-store.ts`
- `apps/moryflow/pc/src/main/agent-runtime/runtime/desktop-adapter.ts`
