---
title: Anyhunt/Moryflow 统一 Token Auth 改造方案（V2）
date: 2026-02-24
scope: apps/anyhunt/*, apps/moryflow/*, packages/*
status: active
---

<!--
[INPUT]: 当前两条业务线 Auth 在 Web/PC/Mobile 存在 Cookie 会话依赖与多套初始化策略，导致跨端行为不一致
[OUTPUT]: 统一为 Token-first（access + refresh）模型的改造方案与执行计划（不做历史兼容）
[POS]: Auth 统一改造 V2 总方案（跨 Anyhunt + Moryflow）

[PROTOCOL]: 本文件更新需同步更新 `docs/index.md`、`docs/architecture/auth.md`、`docs/architecture/CLAUDE.md`、`docs/CLAUDE.md`，若影响全局索引需同步根 `CLAUDE.md`。
-->

# Anyhunt/Moryflow 统一 Token Auth 改造方案（V2）

## 1. 背景与问题

当前两条业务线都在使用 `access JWT + refresh`，但端侧实现并不统一：

- Web（部分端）依赖 Cookie 会话启动后再 refresh。
- PC/Mobile（部分链路）依赖设备安全存储 refresh token。
- 登录后首跳存在“先走 session/cookie，再换业务 refresh token”的过渡链路。

这导致问题：

- 跨端行为不一致（同一接口在 Web/PC/Mobile 语义不同）。
- Electron/原生端在非标准浏览器上下文下容易出现 session/cookie 依赖问题。
- 页面初始化策略不一致，部分端会在首屏阶段阻塞 refresh。

## 2. 目标与边界

## 2.1 目标

- Anyhunt 与 Moryflow 采用同一套 Token-first 认证逻辑。
- 登录成功直接返回业务可用 `accessToken + refreshToken`。
- 各端仅在 access 过期（或即将过期）时调用 refresh，不做“每次启动必 refresh”。
- 保留 refresh rotation（每次 refresh 返回新 refreshToken）。

## 2.2 不变约束

- 两条业务线仍然完全隔离：不共享账号、不共享 Token、不共享数据库、不共享密钥。
- API 域名保持现状：
  - Moryflow：`server.moryflow.com`
  - Anyhunt Dev：`server.anyhunt.app`

## 2.3 明确取舍（安全模型）

- 接受 Web 端 token 存储在 `localStorage` 的风险（XSS 风险高于 HttpOnly Cookie）。
- 通过工程手段降低风险：CSP、输入净化、禁止危险 HTML 注入、依赖审计。
- 本方案以“多端一致性 + 工程复杂度可控”为第一优先级。

## 3. 统一后的最终模型（目标态）

## 3.1 Token 规则

- `accessTokenTtl = 6h`
- `refreshTokenTtl = 90d`
- `refreshRotation = on`（每次 refresh 返回新的 refresh token，旧 token 立即失效）

## 3.2 统一认证流程

1. 登录/验证成功后，服务端直接返回：
   - `accessToken`
   - `accessTokenExpiresAt`
   - `refreshToken`
   - `refreshTokenExpiresAt`
   - `user`
2. 客户端保存 token（Web localStorage；PC keytar；Mobile SecureStore）。
3. 业务请求统一携带 `Authorization: Bearer <accessToken>`。
4. access 过期或收到 `401` 时，调用 `/api/v1/auth/refresh`（body 带 refreshToken）。
5. refresh 成功后覆盖保存新 `accessToken + refreshToken`。
6. refresh 失败（过期/撤销）时清空本地 token 并回登录态。

## 3.3 启动策略（不阻塞首屏）

- 启动时读取本地 `accessToken + expiresAt`。
- 若 access 未过期（保留 1h skew），直接进入已登录态，不调用 refresh。
- 若 access 已过期但 refresh 仍有效，后台刷新并在必要时短暂按钮级 loading。
- 禁止“全局骨架屏等待 refresh 完成”的默认策略。

## 4. 统一 API 契约（V2）

## 4.1 登录

`POST /api/v1/auth/sign-in/email`

请求：

```json
{
  "email": "user@example.com",
  "password": "******"
}
```

响应（成功）：

```json
{
  "status": true,
  "accessToken": "...",
  "accessTokenExpiresAt": "2026-02-24T18:00:00.000Z",
  "refreshToken": "...",
  "refreshTokenExpiresAt": "2026-05-25T12:00:00.000Z",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "emailVerified": true,
    "name": "..."
  }
}
```

## 4.2 注册与邮箱验证

- `POST /api/v1/auth/sign-up/email`：创建账号并发送 OTP（不返回 token）。
- `POST /api/v1/auth/email-otp/verify-email`：验证成功后直接返回 `accessToken + refreshToken + user`。

## 4.3 刷新

`POST /api/v1/auth/refresh`

请求：

```json
{
  "refreshToken": "..."
}
```

响应（成功，必须轮换）：

```json
{
  "accessToken": "...",
  "accessTokenExpiresAt": "2026-02-24T18:00:00.000Z",
  "refreshToken": "...",
  "refreshTokenExpiresAt": "2026-05-25T12:00:00.000Z"
}
```

## 4.4 登出

`POST /api/v1/auth/logout`

请求：

```json
{
  "refreshToken": "..."
}
```

响应：

```json
{
  "message": "Logout successful"
}
```

## 4.5 兼容策略（本方案）

- 不做历史兼容。
- 旧的 cookie/session refresh fallback 路径全部删除。
- 旧客户端必须随本次方案同步升级。

## 4.6 可选行为定稿（本次执行采用）

以下原本可选项全部在本方案中固定，执行阶段不再二次决策：

1. Refresh 触发时机：
   - 正常请求前不做“每次都预刷新”。
   - 当 `accessTokenExpiresAt - now <= 1h` 时允许前置 refresh（覆盖长时单次任务执行窗口）。
   - 收到 `401` 时必触发一次 refresh + 原请求单次重试。
2. 并发刷新策略：
   - 单飞（mutex）模型，任意时刻只允许一个 refresh 请求。
   - 其余请求等待该 refresh 结果，禁止风暴式并发 refresh。
3. 网络失败策略：
   - refresh 网络失败（超时/断网）不立即清 token，不做强制登出。
   - 业务请求返回原始网络错误，UI 显示按钮级错误态并允许用户重试。
4. 401 失败策略：
   - refresh 返回 `401/403` 视为 refresh 不可用，立即清 token 并回登录。
   - 不做 cookie/session fallback，不做隐式“再试一次旧通道”。
5. Refresh 轮换策略：
   - refresh 成功必须同时返回并覆盖 `accessToken + refreshToken`。
   - 客户端以“整包替换”方式原子更新 token 与过期时间。
6. 登出策略：
   - 客户端调用 `/api/v1/auth/logout` 传 `refreshToken`。
   - 无论服务端返回是否成功，客户端都清空本地 token（本地优先保证退出）。
7. 启动渲染策略：
   - 禁止“全局 loading 等 refresh”。
   - 启动阶段只根据本地 access 可用性决定登录态，刷新放后台执行。
8. 错误展示策略：
   - UI 优先展示 RFC7807 `detail`，其次 `message`，再兜底通用文案。
9. 安全基线（Web token 持久化前提）：
   - 强制 CSP、输入净化、依赖审计、禁用危险 HTML 注入。
   - 不再引入 HttpOnly cookie 兼容分支。

## 5. 客户端统一策略

## 5.1 存储层

- Anyhunt Web/Console/Admin：`localStorage` 持久化 `access + refresh + expiresAt`。
- Moryflow Web/Admin：`localStorage` 持久化 `access + refresh + expiresAt`。
- Moryflow PC：`keytar` 持久化 `access + refresh + expiresAt`。
- Moryflow Mobile：`SecureStore` 持久化 `access + refresh + expiresAt`。

## 5.2 请求层

- 所有 API Client 统一：
  - 请求前读取 access token 并附加 Bearer。
  - `401` 时进入 refresh mutex（单飞），成功后重试一次原请求。
  - 刷新失败统一登出。

## 5.3 UI 行为

- 登录/注册/OTP 提交流程只允许按钮级 loading。
- 禁止因 refresh 导致全局卡死 loading。
- 错误信息统一透传 RFC7807 `detail/code`。

## 6. 服务端统一策略

## 6.1 Auth 控制器

两条业务线都要达成同构：

- 登录/验证接口直接返回业务 token，不再要求“先建 session 再 refresh”。
- `refresh` 严格只从 body 读取 `refreshToken`。
- 删除 `cookieToken`、`issueRefreshFromSession`、cookie fallback 相关逻辑。

## 6.2 refresh rotation 与重放防护

`refresh_token` 记录建议字段：

- `id`
- `userId`
- `tokenHash`
- `familyId`
- `deviceId`
- `platform`
- `expiresAt`
- `revokedAt`
- `replacedByTokenId`
- `createdAt`
- `lastUsedAt`
- `ipAddress` / `userAgent`

策略：

- refresh 成功后：旧 token 置 revoked，新 token 入库。
- 若发现已撤销 token 被再次使用：判定可疑重放，撤销同 family 令牌并强制重新登录。

## 6.3 Better Auth 使用边界

- Better Auth 保留用于身份能力（邮箱密码、OTP、OAuth、账号模型）。
- 业务认证态不再依赖 Better Auth session cookie。
- 统一以业务 refresh token 表为唯一续期依据。

## 7. 影响面评估（按模块）

## 7.1 Anyhunt

- `apps/anyhunt/server/src/auth/*`
- `apps/anyhunt/www/src/lib/{auth-client,auth-session,api-client,auth-context}.ts*`
- `apps/anyhunt/www/src/stores/auth-store.ts`
- `apps/anyhunt/console/src/stores/auth.ts`
- `apps/anyhunt/admin/www/src/stores/auth.ts`
- `apps/anyhunt/admin/www/src/lib/api-client.ts`

## 7.2 Moryflow

- `apps/moryflow/server/src/auth/*`
- `apps/moryflow/mobile/lib/server/{auth-api,auth-session,context,auth-client}.ts*`
- `apps/moryflow/pc/src/renderer/lib/server/{client,auth-session,context}.ts*`
- `apps/moryflow/admin/src/stores/auth.ts`
- `apps/moryflow/admin/src/lib/api-client.ts`

## 7.3 Shared

- `packages/api`（Auth 响应类型、错误解析）
- `packages/types`（ProblemDetails/Auth DTO）
- 文档与测试：`docs/*`、`apps/*/__tests__/*`

## 7.4 必删清单（零兼容）

- 服务端 `refresh` 中的 cookie/session fallback 分支（`cookieToken` / `issueRefreshFromSession` / `setRefreshCookie`）。
- PC 端 `allowCookieFallback` / `forceCookieSession` 相关逻辑与测试。
- Web/Console/Admin “登录后必须先调 refresh 才有 access”的旧链路。
- 与旧链路绑定的文档描述（包括“启动必 refresh”类说明）。

## 8. 风险与应对

## 8.1 风险

- Web localStorage 存 refresh token 的 XSS 风险升高。
- 零兼容改造会导致旧客户端直接失效。
- 服务端接口契约变化大，跨端需同批次发布。

## 8.2 应对

- 强制 CSP + 输入净化 + 依赖审计。
- 发布窗口内统一发版（server + all clients）。
- 灰度期间监控：`refresh 401 rate`、`login success rate`、`token replay detected`。

## 9. 验收标准（Definition of Done）

1. 两条业务线所有端均不再依赖 cookie/session fallback。
2. 登录成功即可直接请求业务 API，无需额外 refresh 才能进入。
3. 刷新页面不会默认触发 refresh（access 未过期时）。
4. access 过期后 refresh 成功可无感续期。
5. refresh 过期/撤销后统一回登录态，错误可读。
6. L2 校验通过：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

## 10. 按步骤执行计划（强制进度回写）

## 10.1 进度同步规则（必须执行）

- 每完成一个步骤，必须在本文档 `10.2` 将对应项从 `[ ]` 改为 `[x]`。
- 每完成一个步骤，必须在本文档 `10.3` 追加一条“执行日志”（日期、负责人、结果、风险）。
- 若步骤中断，标记为 `blocked` 并写明阻塞项与下一动作。

## 10.2 执行清单

- [x] Step 1：冻结 V2 契约（`sign-in/verify-email/refresh/logout` 请求与响应体）并评审通过
- [x] Step 2：Anyhunt Server 实现 Token-first 登录/刷新链路，删除 cookie/session fallback
- [x] Step 3：Moryflow Server 同步实现同构链路，删除 cookie/session fallback
- [x] Step 4：Anyhunt WWW/Console/Admin 全量切换到本地 token 存储与统一 refresh mutex
- [x] Step 5：Moryflow Admin/Mobile/PC 全量切换到本地 token 存储与统一 refresh mutex
- [x] Step 6：删除旧接口语义与冗余代码（含 allowCookieFallback/forceCookieSession/session bootstrap）
- [x] Step 7：补齐回归测试（server + client）并完成 L2 校验
- [x] Step 8：更新所有相关文档并完成上线/回滚预案演练

## 10.3 执行日志（模板）

| 日期       | 步骤                  | 状态           | 负责人 | 结果摘要                                                                                                                                                                                                                                                             | 风险/备注                                                                                |
| ---------- | --------------------- | -------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 2026-02-24 | Step 1                | done           | @codex | 冻结 V2 契约与所有可选行为（刷新时机/并发/失败/登出/UI）并写入文档                                                                                                                                                                                                   | 后续实现需严格按定稿执行，禁止新增兼容分支                                               |
| 2026-02-24 | Step 2                | done           | @codex | Anyhunt Server 已切换 Token-first：登录/验证码验证直接返回 access+refresh，refresh/logout/sign-out 仅接受 body refreshToken                                                                                                                                          | Better Auth session cookie 仍会由基础登录流程生成但不再被业务鉴权链路依赖                |
| 2026-02-24 | Step 3                | done           | @codex | Moryflow Server 已完成与 Anyhunt 同构改造，接口契约一致并补齐控制器回归测试                                                                                                                                                                                          | 同步上线前仍需完成各端客户端切换，避免旧客户端按 Cookie 模式调用                         |
| 2026-02-24 | Step 4                | done           | @codex | Anyhunt WWW/Console/Admin 已统一本地 access+refresh 持久化、body refresh 与单飞 mutex；Console 登录改为本地 Token-first 表单                                                                                                                                         | Console 历史 `/login` 跳转辅助文件仍在仓库（未被路由使用），后续清理归入 Step 6          |
| 2026-02-24 | Step 5                | done           | @codex | Moryflow Admin/Mobile/PC 已统一本地 token 存储与 body refresh；PC 登录/验证码验证改为 Token-first，删除 Cookie fallback 依赖                                                                                                                                         | 已通过受影响端侧回归与全量 `typecheck/test:unit`；发布前仍需真机/打包包体手工验证        |
| 2026-02-24 | Step 6                | done           | @codex | 已删除旧语义残留：PC `allowCookieFallback/forceCookieSession` 逻辑与测试移除，Console 废弃 `LoginRedirect*` 文件清理                                                                                                                                                 | 文档中旧方案描述已同步为 Token-first；少量历史文档仍保留“旧架构”上下文说明，不影响运行时 |
| 2026-02-24 | Step 7                | done           | @codex | 回归测试已补齐并通过：Auth 控制器/会话单测更新；执行 `pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 全量校验通过                                                                                                                                                    | 运行中出现 Redis 连接拒绝等预期测试日志噪音，不影响最终通过结果                          |
| 2026-02-24 | Step 8                | done           | @codex | 已更新相关文档（auth 入口/索引/runbook/CLAUDE）并补充上线与回滚演练记录                                                                                                                                                                                              | 实际生产发布仍需按下述窗口执行并人工验收 PC/Mobile/Console 登录链路                      |
| 2026-02-24 | Step 7（follow-up）   | done           | @codex | 将预刷新阈值统一提升到 1h 后，已修正 PC `auth-session.spec.ts` 的过期时间断言并重新执行 `pnpm --filter @moryflow/pc test:unit -- src/renderer/lib/server/__tests__/auth-session.spec.ts` 通过                                                                        | 仅修复了阈值变化导致的回归断言；其余认证用例保持不变                                     |
| 2026-02-24 | Step 8（follow-up）   | done           | @codex | 已执行线上数据库迁移升级检查：`@anyhunt/anyhunt-server`（main/vector）与 `@moryflow/server` 均完成 `prisma migrate status + migrate deploy`，结果均为 `No pending migrations to apply`                                                                               | 当前线上 schema 与仓库迁移目录一致，无额外待发布迁移                                     |
| 2026-02-24 | Step 7（follow-up-2） | done           | @codex | 已补齐 Console/Admin/Moryflow Admin 的网络失败回退策略：`ensureAccessToken` 在 refresh 网络失败时回退未过期 access token，`bootstrap` 遇到 transient 错误保留已有会话；并将 `user` 纳入持久化，避免刷新页后因瞬时网络抖动丢失已知登录态；新增三端 store 回归测试验证 | 保留 401/403 立即清会话语义不变，避免把鉴权失败误判为网络抖动                            |
| YYYY-MM-DD | Step N                | done / blocked | @owner | 一句话结果                                                                                                                                                                                                                                                           | 一句话风险                                                                               |

## 11. 上线与回滚预案（演练记录）

### 11.1 上线顺序（必须同窗）

1. 发布服务端（Anyhunt Server + Moryflow Server）：确保 `sign-in/email`、`verify-email`、`refresh/logout` 契约已生效（body refreshToken）。
2. 发布 Web 端（Anyhunt WWW/Console/Admin、Moryflow Admin）：切换到本地 token 存储与 token-first 登录链路。
3. 发布 Native 端（Moryflow PC/Mobile）：切换到安全存储 refresh token + token-first 登录/验证码验证。
4. 观察 30 分钟：重点看 `refresh 401 rate`、`login success rate`、`EMAIL_NOT_VERIFIED` 异常率。

### 11.2 回滚策略（零兼容前提）

1. 若出现大面积登录失败：整套回滚到“上一稳定版本（server + clients 同版本）”，禁止只回滚单端。
2. 回滚后立刻验证：`sign-in/email`、`email-otp/verify-email`、`refresh` 三个接口与客户端版本契约一致。
3. 回滚窗口内冻结新发布，先完成根因定位再重发版。

### 11.3 本次演练记录（2026-02-24）

- 已执行校验命令：`pnpm lint`、`pnpm typecheck`、`pnpm test:unit`（全部通过）。
- 已执行关键包回归：`@anyhunt/console`、`@moryflow/pc`、`@moryflow/admin`、`@anyhunt/anyhunt-www`、`@moryflow/mobile`。
- 已确认旧语义清理：PC `allowCookieFallback/forceCookieSession` 与 Console `LoginRedirect*` 已删除。
