---
title: 'Moryflow PC/Mobile Access Token 持久化升级方案'
date: 2026-01-25
scope: apps/moryflow/pc, apps/moryflow/mobile
status: draft
---

<!--
[INPUT]: access-token-storage-plan.md + Moryflow PC/Mobile 现有 auth-session/refresh 流程
[OUTPUT]: PC/Mobile access token 持久化与刷新策略的可执行升级方案
[POS]: Moryflow 端设备侧 Auth 升级入口（单一数据源 + 安全存储 + 预刷新）

[PROTOCOL]: 本文件变更时，需同步更新 docs/architecture/CLAUDE.md 与 docs/CLAUDE.md（必要时更新根 CLAUDE.md）。
-->

# Moryflow PC/Mobile Access Token 持久化升级方案

## 背景

- Anyhunt 已完成 access token 的持久化与首屏优化（Zustand + Persist）。
- Moryflow PC/Mobile 仍仅将 access token 保存在内存（刷新/重启后丢失）。
- 现有 refresh 已支持 device body + `X-App-Platform`，响应包含 `accessTokenExpiresAt`，具备无后端改动的前提。

## 目标

1. **首屏无阻塞**：应用启动即可使用持久化 access token 发起请求，同时后台刷新。
2. **单一数据源**：access token 统一由 Zustand store 管理，API 只读内存态。
3. **安全存储**：access token 与 refresh token 均存入平台安全存储（不落磁盘明文）。
4. **可预刷新**：基于 `accessTokenExpiresAt` 定时刷新，避免大面积 401。
5. **与 Anyhunt 对齐**：流程、字段、失败处理、单次重试规则一致。

## 非目标

- 不改后端 token 签发策略（access 6h、refresh 90d、rotation on）。
- 不做兼容迁移（旧数据/旧存储一律清理）。
- 不改登录/注册业务流程（仍由 Better Auth 客户端完成）。

## 当前实现（现状）

### Mobile

- `apps/moryflow/mobile/lib/server/auth-session.ts`
  - access token 仅保存在模块内存变量 `accessToken`。
  - refresh token 使用 `expo-secure-store`（`storage.ts`）。
  - refresh 成功仅 `setAccessToken(data.accessToken)`，未保存 `expiresAt`。

### PC (Electron Renderer)

- `apps/moryflow/pc/src/renderer/lib/server/auth-session.ts`
  - access token 仅保存在内存变量 `accessToken`。
  - refresh token 存在 main 进程安全存储 `membership-token-store.ts`。
  - refresh 成功仅 `setAccessToken(data.accessToken)`，未保存 `expiresAt`。
  - renderer 通过 `desktopAPI.membership` IPC 操作 refresh token。

## 核心原则（最佳实践）

1. **Access Token 永不落盘明文**：必须存入平台安全存储（SecureStore / Keychain / Keystore / Electron safeStorage）。
2. **Refresh Token 不进 Zustand Store**：仅在 refresh 流程内读取与更新。
3. **API 只读内存态**：请求过程中不直接读取持久化层。
4. **单次刷新 + 单次重试**：遇到 401 只刷新一次并重试一次。
5. **预刷新优先**：通过 `accessTokenExpiresAt` 提前触发 refresh，减少 401 风暴。
6. **主进程保密**（PC）：安全存储仅在 main 进程访问，renderer 通过 IPC 代理。

## 已确定的三点（最佳实践决策）

1. **PC 安全存储方案**
   - **决定：主进程使用 keytar + 系统 Keychain/Keystore 作为唯一持久化存储**（access + refresh 均存于系统凭据库）。
   - 理由：OS 级密钥库是桌面最佳实践；`safeStorage` 仅提供对称加密，不具备系统级凭据生命周期与防护边界。
   - 若 keytar 不可用：**不做落盘**，降级为“仅内存 access + 强制重新登录获取 refresh”，并提示用户启用系统凭据支持。

2. **refresh 失败处理边界**
   - **决定：仅在 401/403 或响应缺失 `accessToken/accessTokenExpiresAt` 时清理本地 token**。
   - 网络超时/断网**不清空 refresh**，只标记“需刷新”，在网络恢复/下次唤醒时重试。

3. **预刷新窗口与唤醒策略**
   - **决定：默认预刷新窗口 60s，并在 App Resume 时强制执行一次 `ensureAccessToken()`**。
   - 理由：移动端/桌面端存在长时间后台 + 时钟偏差场景，Resume 时补一次校验可避免 401 风暴。

## 升级后设计（统一模型）

### 1) Auth Store（单一数据源）

新增 `auth-store`（Zustand + Persist），字段与 Anyhunt 对齐：

```ts
accessToken: string | null;
accessTokenExpiresAt: string | null;
lastUpdatedAt: string | null;
isHydrated: boolean;
```

动作：

- `setAccessToken(token, expiresAt)`
- `clearAccessToken()`
- `setHydrated(true)`

### 2) 持久化存储适配层（安全存储）

- Mobile：使用 `expo-secure-store` 作为 persist storage（access token + expiresAt）。
- PC：仅使用 main 进程 keytar + 系统 Keychain/Keystore（access + refresh），通过 IPC 暴露给 renderer（renderer 不可直连）。

> **注意**：access token 和 refresh token 分开存储，避免 refresh 逻辑污染 store。

### 统一存储 Key（最佳实践）

- 持久化 store 的 key 统一使用 `mf_auth_session`（与 Anyhunt 的 `ah_auth_session` 对齐）。
- PC 的 keytar 使用统一 service：`moryflow.membership.auth`，账号键为：
  - `accessToken`
  - `accessTokenExpiresAt`
  - `refreshToken`

### 3) Refresh 结果写入 store

- `POST /api/auth/refresh` 返回：
  - `accessToken`
  - `accessTokenExpiresAt`
  - `refreshToken`（device only）
- 刷新成功后：
  - `setAccessToken(accessToken, accessTokenExpiresAt)`
  - `setStoredRefreshToken(refreshToken)`（如果返回）

### 4) 启动与预刷新流程

- App 启动：
  - 先 hydrate store（从安全存储加载 access token + expiresAt）。
  - 若 token 即将过期（`skewMs`），立即 `refreshAccessToken()`，但**不阻塞首屏请求**。
  - 启动后根据 `expiresAt` 设置定时 refresh。

### 5) 失败处理

- refresh 失败（401/403 或响应缺 token）：
  - `clearAuthSession()`
  - `clearStoredRefreshToken()`
  - `clearAccessToken()`
  - UI 进入未登录态
- refresh 网络失败（超时/断网）：
  - **不清理 refresh token**
  - 记录“需刷新”状态，并在 App Resume/网络恢复后重试

## 平台细节设计

### Mobile（Expo / RN）

**存储方案**

- 新增 `auth-store.ts`：Zustand persist + SecureStore 存储 adapter。
- 保留 `storage.ts` 仅用于 refresh token 与用户缓存。

**关键改动**

- `auth-session.ts`
  - 使用 `authStore.getState().accessToken` 替代内存变量。
  - refresh 成功写入 `accessTokenExpiresAt`。
  - 引入 `scheduleRefresh(expiresAt)` 与 `isAccessTokenExpiringSoon`。
- `server/api.ts` / `agent-runtime/membership-bridge.ts`
  - token 读取从 `authStore` 获取。
- `server/context.tsx` 初始化时：
  - 先 `waitForAuthHydration()`。
  - 有持久化 access token 时直接进入已登录态，同时后台 refresh。

**安全注意**

- 只允许 SecureStore 保存 access token；不得落入 AsyncStorage。

### PC（Electron Renderer + Main）

**存储方案**

- main 进程使用 keytar 存储 access/refresh（同库不同 key）。
- renderer 通过 IPC 调用 main 的 `get/set/clearAccessToken`。

**关键改动**

- `apps/moryflow/pc/src/main/membership-token-store.ts`
  - 替换为 keytar 读写（access/refresh/expiresAt）。
- `apps/moryflow/pc/src/main/app/ipc-handlers.ts`
  - 新增 `membership:getAccessToken` / `membership:setAccessToken` / `membership:clearAccessToken`。
- `apps/moryflow/pc/src/preload/index.ts` + `src/shared/ipc/desktop-api.ts`
  - 暴露对应 IPC API。
- `apps/moryflow/pc/src/renderer/lib/server/auth-store.ts`
  - 使用 `createJSONStorage` + IPC storage adapter。
- `apps/moryflow/pc/src/renderer/lib/server/auth-session.ts`
  - 移除模块内存变量；改为 `authStore`。
  - refresh 成功写入 `accessTokenExpiresAt`。
  - 引入 `scheduleRefresh(expiresAt)`。

**安全注意**

- renderer 不直接接触 OS Keychain；所有安全存储操作必须在 main 进程。

## 数据结构（持久化）

### Mobile（SecureStore）

```json
{
  "state": {
    "accessToken": "jwt-access-token",
    "accessTokenExpiresAt": "2026-01-25T12:34:56.000Z",
    "lastUpdatedAt": "2026-01-25T06:30:00.000Z"
  },
  "version": 1
}
```

### PC（Keychain/Keystore via keytar）

- keytar 条目：
  - `accessToken`
  - `accessTokenExpiresAt`
  - `refreshToken`

## 关键逻辑伪代码

```ts
// refreshAccessToken (PC/Mobile 共用语义)
if (!refreshPromise) {
  refreshPromise = (async () => {
    const refreshToken = await getStoredRefreshToken();
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'X-App-Platform': DEVICE_PLATFORM, 'Content-Type': 'application/json' },
        body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
      });

      if (res.status === 401 || res.status === 403) {
        await clearAuthSession();
        return false;
      }
      if (!res.ok) return false;

      const data = await res.json();
      if (!data.accessToken || !data.accessTokenExpiresAt) {
        await clearAuthSession();
        return false;
      }

      authStore.getState().setAccessToken(data.accessToken, data.accessTokenExpiresAt);
      if (data.refreshToken) await setStoredRefreshToken(data.refreshToken);
      scheduleRefresh(data.accessTokenExpiresAt);
      return true;
    } catch {
      // network error: keep refresh token, retry on resume
      return false;
    }
  })().finally(() => (refreshPromise = null));
}
return refreshPromise;
```

## 兼容与迁移策略（无历史兼容）

- 原内存 access token 逻辑全部移除。
- 旧 token 状态一律清空，首次启动后执行 refresh 获取新 token。

## 风险与对策

- **系统凭据不可用**：keytar 不可用时，PC 仅内存模式并提示用户启用系统凭据（不落盘）。
- **原生模块打包失败**：keytar 未正确编译/打包会导致登录失败，需在构建链路中固定 electron-rebuild 与预编译策略。
- **多端并发登录**：refresh rotation 会使旧 refresh 失效，旧端需重新登录（已知行为）。
- **离线过期**：access 过期且 refresh 不可达时，转为未登录态并提示重试。

## 影响范围（重点文件）

### Mobile

- `apps/moryflow/mobile/lib/server/auth-session.ts`
- `apps/moryflow/mobile/lib/server/storage.ts`
- `apps/moryflow/mobile/lib/server/context.tsx`
- `apps/moryflow/mobile/lib/server/api.ts`
- `apps/moryflow/mobile/lib/agent-runtime/membership-bridge.ts`
- 新增：`apps/moryflow/mobile/lib/server/auth-store.ts`

### PC

- `apps/moryflow/pc/src/renderer/lib/server/auth-session.ts`
- `apps/moryflow/pc/src/renderer/lib/server/api.ts`
- `apps/moryflow/pc/src/renderer/lib/server/context.tsx`
- `apps/moryflow/pc/src/shared/ipc/desktop-api.ts`
- `apps/moryflow/pc/src/preload/index.ts`
- `apps/moryflow/pc/src/main/app/ipc-handlers.ts`
- `apps/moryflow/pc/src/main/membership-token-store.ts`
- 新增：`apps/moryflow/pc/src/renderer/lib/server/auth-store.ts`

## 执行步骤（待审核）

1. **新增 Store（Mobile/PC）**
   - Mobile 新增 `auth-store.ts`（Zustand + SecureStore persist）。
   - PC 新增 `auth-store.ts`（Zustand + IPC storage adapter）。

2. **扩展安全存储**
   - Mobile：新增 SecureStore keys（access token + expiresAt）。
   - PC：新增 `keytar` 适配器，access/refresh 全部写入系统凭据库，**仅 main 进程** 可访问。
   - Electron 打包：确保 keytar 原生模块可用（预编译或 electron-rebuild），并把 keytar 置于 `dependencies`。

3. **改造 auth-session.ts**
   - 移除内存 `accessToken` 变量，改用 `authStore`。
   - refresh 成功写入 `accessTokenExpiresAt` 并 `scheduleRefresh()`。
   - refresh 失败分级处理：401/403 清理本地状态；网络错误保留 token 并延迟重试。

4. **改造启动流程**
   - `MembershipProvider`/`AuthProvider` 初始化前等待 store hydration。
   - 有持久化 token 时允许首屏请求，后台 refresh 更新。
   - App Resume/窗口唤醒时触发 `ensureAccessToken()`。

5. **API client 对齐**
   - `createServerApiClient` 的 `tokenProvider` 改为读取 `authStore`。
   - `onUnauthorized` 仍复用 `refreshAccessToken`（保持单次重试）。

6. **IPC 端对齐（PC）**
   - 新增 access token IPC handlers 与 preload 暴露。
   - Renderer 的 storage adapter 只经由 IPC。

7. **测试与验收**
   - 新增/更新单测：auth-session refresh 成功/失败、store hydration、过期清理。
   - 增加“网络失败不清理 refresh token”的回归测试。
   - 验收路径：冷启动 -> 直接访问业务接口 -> 不出现 401 瀑布；离线过期 -> 回到未登录态。
