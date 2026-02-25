---
title: 'Access Token 本地存储方案（Zustand + Persist）'
date: 2026-01-25
scope: auth/www
status: draft
---

# Access Token 本地存储方案（Zustand + Persist）

## 背景

Anyhunt 当前业务接口仅接受 `Authorization: Bearer <accessToken>`。access token 目前只保存在内存中，页面刷新后会丢失，需要重新走 refresh 流程再发业务请求，这会造成首屏请求延迟。

## 现状确认

- access token 存储在模块内存变量中：`apps/anyhunt/www/src/lib/auth-session.ts` 里的 `accessToken`。
- refresh 成功后只写内存，不做持久化；因此刷新页面即丢失。
- 服务端 access token TTL 已是 6 小时（无需改后端常量）。

## 目标

- 刷新页面后仍能立即带上 access token，避免首屏 401 与 refresh 阻塞。
- 不改变服务端鉴权策略（仍是 Bearer access token）。
- 保持 refresh cookie 的安全边界不变。

## 非目标

- 不引入新的跨域或历史兼容逻辑。
- 不改变 refresh token 的签发策略（Web 继续使用 HttpOnly Cookie）。

## 方案概述

### 核心原则

1. **单一数据源**：access token 统一由 Zustand store 管理。
2. **持久化可控**：store 使用 persist 中间件与 localStorage/安全存储同步。
3. **内存优先**：API 请求只读 store 内存态，不直接访问 localStorage。
4. **并行化首屏**：先用已持久化 token 发请求，后台 refresh 更新。
5. **单次刷新**：refresh 使用 single-flight，避免并发风暴。

### Web（Anyhunt www 实验）

1. **Zustand Auth Store（单一数据源）**
   - `accessToken` / `accessTokenExpiresAt` / `isHydrated` / `lastUpdatedAt`
   - 只暴露 getter 与 action，避免散落到其他模块。

2. **Persist 同步（localStorage）**
   - localStorage 保存 token + 过期时间，带版本号与最小字段。
   - 参考 `client-localstorage-schema`：版本化、字段最小化。

3. **Hydration 初始化**
   - 应用启动时，persist 自动读 localStorage 并水合到 store。
   - `isHydrated` 用于避免 UI 过早误判登录态。
   - 参考 `js-cache-storage`：只读一次，避免每次请求读取。

4. **refresh 成功后更新 store**
   - refresh 返回 `accessToken` + `accessTokenExpiresAt`，更新 store 并同步本地存储。

5. **登出/refresh 失败清理**
   - 清空 store 与 localStorage，确保一致性。

6. **并行化减少首屏瀑布**
   - 允许“先用持久化 token 立即请求 + 后台 refresh 更新”。
   - 参考 `async-parallel`：refresh 不再成为所有请求的前置依赖。

### PC / 移动端（Device Refresh）

> 依据 `apps/anyhunt/server/src/auth/CLAUDE.md`：Device 端 refresh token 通过请求体传递，并携带 `X-App-Platform`（跳过 Origin 校验）。

#### 存储与职责拆分

1. **Zustand Store 仍为单一数据源**
   - `accessToken` / `accessTokenExpiresAt` / `isHydrated` / `lastUpdatedAt`
   - API 仅从 store 读取，不直接访问持久化层

2. **安全存储适配层（Persist Storage Adapter）**
   - 用“平台安全存储”替代 Web 的 localStorage，作为 Persist 后端：
     - **Expo/React Native**：`expo-secure-store`
     - **iOS/macOS**：Keychain（SecureStore 底层实现）
     - **Android**：Keystore（SecureStore 底层实现）
     - **Electron**：`keytar`（主进程）+ IPC 透传到 renderer
   - Access Token 与 Refresh Token 不再落盘明文文件（避免磁盘明文泄露）

3. **Refresh Token 的单独职责**
   - Web：refresh token 仍只存在 HttpOnly Cookie
   - Device：refresh token 由安全存储负责（不进 Zustand store）
   - 只有 refresh 时读取 refresh token（避免到处传播）

#### Device Refresh 请求约定

```text
POST /api/v1/auth/refresh
Headers:
  X-App-Platform: ios | android | mobile | desktop | electron | cli
Body:
  { refreshToken: "..." }
Response:
  { accessToken, accessTokenExpiresAt, refreshToken }
```

- refresh token 每次 refresh 轮换（rotation on）
- refresh 失败（401/403）= 视为未登录，清空本地状态并引导登录

#### 设备端生命周期（建议）

1. **启动**
   - 从安全存储加载 refresh token
   - 从 Zustand hydrate access token
   - access token 过期/即将过期 → 触发 refresh

2. **登录成功**
   - 写入 access token 到 store（自动落盘）
   - 写入 refresh token 到安全存储（仅此处）

3. **refresh 成功**
   - 更新 access token（store）
   - 更新 refresh token（安全存储）

4. **登出 / refresh 失败**
   - 清空 store
   - 清空安全存储（refresh token）

#### 安全与一致性注意事项

- **多端并发登录**：refresh 轮换会使旧 refresh 失效，旧设备需重新登录。
- **离线场景**：access token 过期且 refresh 不可达时，进入未登录态并提示重试。
- **跨进程安全**（Electron）：仅主进程访问系统凭据，renderer 通过 IPC 调用。

## Web 端数据结构建议

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

建议 key：`ah_auth_session`

## Web 端实现步骤（实验）

1. 新增依赖与目录：
   - `@anyhunt/anyhunt-www` 增加 `zustand` 依赖。
   - 新增 `apps/anyhunt/www/src/stores/auth-store.ts`（Zustand vanilla store + React hook）。

2. 新增 `auth-store`：
   - `getState()` / `setState()` 统一暴露 access token 与过期时间。
   - action：`setAccessToken` / `clearAccessToken` / `setHydrated`。
   - persist 配置 `partialize` 只落盘必要字段。

3. `auth-session` 改为使用 store：
   - refresh 成功 -> `setAccessToken(accessToken, expiresAt)`
   - refresh 失败/登出 -> `clearAccessToken()`

4. `bootstrapAuth()` 行为调整：
   - 依赖 store 的 persist hydration（无需手动读取 localStorage）。
   - 启动后并行触发 refresh，更新 token 但不阻塞首屏请求。
   - 若 token 已过期或即将过期，则优先刷新（可配置阈值）。

5. `api-client` 读取 store 内存态：
   - 通过 `authStore.getState().accessToken`，避免组件订阅与重渲染。
   - 401 时再走 refresh + retry 逻辑。

6. 兼容 SSR：
   - persist 存储在 SSR 环境返回 noop storage，避免 `window` 访问错误。

## 未登录 / Token 失效处理

### 1) 未登录（无 refresh token）

- Web 无法读取 HttpOnly cookie，所以只能通过 refresh 接口结果判断。
- `POST /api/v1/auth/refresh` 返回 401/403 时，认为「未登录或 refresh 失效」：
  - 清空 store（`clearAccessToken`）。
  - UI 进入未登录态（可引导登录弹窗/页面）。

### 2) refresh token 失效期

- refresh token TTL 为 90 天（服务端已有固定策略）。
- 过期、被 revoke 或用户被删除时，refresh 会返回 401：
  - 清空本地 token。
  - 强制回到未登录态。

### 3) access token 过期或即将过期

- access token TTL 为 6 小时（服务端固定）。
- 设置 **过期缓冲窗口**（如 1 小时）：
  - `expiresAt - now <= skewMs` 视为“即将过期”。
  - `bootstrapAuth` 或定时器触发刷新。
- 若请求时仍使用旧 token，接口返回 401，则走 refresh + retry 一次。

### 4) 401 处理策略（API client）

- 401 -> `refreshAccessToken()` -> 成功则重试一次。
- refresh 失败 -> 清空 store，并触发未登录 UI。
- 防止死循环：同一请求只允许重试一次。

### 5) 身份状态判断

- **API 鉴权**：以 store 中 `accessToken` 为准（并做过期判断）。
- **UI 展示**：优先使用 Better Auth 的 `useSession()` 获取用户信息；结合 `isHydrated` 避免闪烁。

## 过期处理建议参数

```ts
const ACCESS_TOKEN_SKEW_MS = 60 * 60 * 1000; // 1 小时缓冲
```

如果你关心“长任务中途 token 过期”，建议把 `skew` 维持在 1 小时，
让 refresh 提前完成，避免任务执行过程中因过期触发 401。

## 风险与缓解

- **XSS 风险**：localStorage 可被脚本读取。
  - 缓解：强制 CSP、禁用不可信脚本、严格输入净化。
  - 业务接受该风险（本次实验前置条件）。
- **多标签页一致性**：
  - 可选监听 `storage` 事件同步登出（本期不强制）。

## 验收标准

- 登录后刷新页面，首屏请求不再出现 `Missing access token`。
- localStorage 中有有效 token 且过期时间准确。
- refresh 成功后会更新本地存储。
- 登出后 localStorage 被清理。

## 回滚方案

- 增加前端开关（如 `VITE_AUTH_TOKEN_PERSIST`），默认关闭。
- 实验期只在 anyhunt www 打开，发现异常可直接关闭开关回退到内存模式。
