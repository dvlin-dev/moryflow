---
title: Moryflow PC 登录/注册触发 refresh 连接关闭（ERR_CONNECTION_CLOSED）排查与修复
date: 2026-02-24
scope: moryflow pc, auth, server.moryflow.com
status: active
---

<!--
[INPUT]: Moryflow PC 登录/注册后设置弹窗异常 + `/api/v1/auth/refresh` 长时间 pending 后 `ERR_CONNECTION_CLOSED`
[OUTPUT]: 根因判断 + 分层修复方案（入口链路、客户端兜底、回归验证）
[POS]: Moryflow PC 认证异常排障 Runbook（按步骤执行）

[PROTOCOL]: 本文件变更需同步更新 `docs/index.md` 与 `docs/CLAUDE.md`。
-->

# Moryflow PC 登录/注册触发 refresh 连接关闭排查与修复

## 现象

- Moryflow PC 点击注册/登录后，设置弹窗表现为“闪退/异常关闭”。
- 开发者工具持续报错：`POST https://server.moryflow.com/api/v1/auth/refresh net::ERR_CONNECTION_CLOSED`。
- 登录面板长期 loading，请求通常 pending 约 20s 后失败。

## 已确认事实（2026-02-24）

### 1) 线上入口链路异常（连接层）

本地直接探测 `server.moryflow.com`，在 TLS 握手阶段被对端关闭（还没进入 HTTP 层）：

```bash
curl -I -m 15 https://server.moryflow.com/api/v1/auth/refresh
# curl: (35) LibreSSL SSL_connect: SSL_ERROR_SYSCALL in connection to server.moryflow.com:443

openssl s_client -connect server.moryflow.com:443 -servername server.moryflow.com -brief
# ...unexpected eof while reading
```

对比 `server.anyhunt.app` 同机探测可正常返回 HTTP 响应，说明当前问题集中在 `*.moryflow.com` 入口链路，而不是本地网络全局故障。

### 2) PC 端认证链路已切换 Token-first（不再依赖 Cookie fallback）

- 启动阶段 `ensureAccessToken()` 保持调用，但 `refreshAccessToken()` 在无本地 refresh token 时会 fail-fast，不再发网络请求。
- 显式登录与邮箱验证码验证成功后，客户端直接保存 `accessToken + refreshToken`，不再依赖先建立 Cookie session 再 refresh。

结果：初始化阶段避免无意义 pending；首次登录/验证成功后可直接进入业务会话。

### 3) 已排除旧包因素（最新版仍复现）

用户反馈使用最新桌面包仍可复现“登录/注册后弹窗闪退”，说明问题不只是历史包。

当前修复方向转为“从结构上消除嵌套 form 提交风险 + 认证初始化 fail-fast”，避免设置弹窗层的外部 `form` 被内层账户面板误触发。

## 根因结论

- **主根因（P0）**：`server.moryflow.com` 入口链路异常（TLS/反代/上游其一），导致 `/api/v1/auth/refresh` 连接被直接关闭。
- **放大器（P1，历史）**：PC 客户端旧链路曾依赖 Cookie fallback 建会话，网络异常下会把登录初始化拖成长时间 loading（现已移除）。
- **次要因子（P2）**：旧版桌面端可能未包含“阻止 submit 冒泡”修复，出现“设置弹窗闪退”观感。

## 修复方案

### P0（必须先做）：修复 `server.moryflow.com` 入口可用性

按现有部署口径核对：

- 反代规则：`docs/design/moryflow/runbooks/megaboxpro-1panel-reverse-proxy.md`
- Moryflow compose：`docs/design/moryflow/runbooks/moryflow-compose.md`

执行项：

1. 校验 DNS（`server.moryflow.com`、`www.moryflow.com`）解析是否正确，避免指向不可用地址。
2. 校验 1panel/Nginx Host+Path 路由：
   - `server.moryflow.com` -> `http://<4c6g-ip>:3105`
   - `server.moryflow.com/api/*` -> `http://<4c6g-ip>:3100`
3. 校验证书与 TLS 终止配置（证书完整链、SNI、443 listener）。
4. 校验 4c6g 上游容器健康：`moryflow-server`、`moryflow-app`。
5. 上线后做外网探测验收：

```bash
curl -I https://server.moryflow.com/
curl -i -X POST https://server.moryflow.com/api/v1/auth/refresh \
  -H 'Content-Type: application/json' \
  -H 'X-App-Platform: desktop' \
  --data '{}'
```

目标：返回可预期 HTTP 状态（如 401），不能再出现连接被关闭。

### P1（建议立即跟进）：PC 端 Token-first 认证链路

在 `apps/moryflow/pc/src/renderer/lib/server/` 做最小改造：

1. 初始化阶段：`refreshAccessToken()` 在 `refreshToken` 为空时直接返回 `false`，不发网络请求。
2. 显式登录与验证码验证：统一改为 Token-first 接口，成功后直接写入 `access+refresh`。
3. 给 refresh 请求增加 `AbortController` 超时（8-10s），超时时立即结束 loading 并提示网络不可达。
4. 区分网络错误与鉴权错误：网络错误不清理本地已存在的有效 access token。
5. 账号区 UI：未登录状态不展示全局 skeleton，仅保留按钮级 loading 与表单错误回显。

回归测试（新增）：

- `auth-session.spec.ts`：无 refresh token 时 `refreshAccessToken()` 不调用 `fetch`。
- `AuthProvider` 初始化：无 refresh token 时 `isLoading` 在短时间内结束。

### P2（发布与观测）

1. 确认 PC 发版包含 2026-02-09 登录面板 submit 冒泡修复。
2. 增加认证可用性探针（大陆出口 + 海外出口）持续检测：
   - `GET /health`
   - `POST /api/v1/auth/refresh`（带 `X-App-Platform`）
3. 将 `refresh` 网络失败率纳入告警，避免用户侧先感知。

## 实施进度（2026-02-24）

- [x] 域名口径统一：仓库内旧域名已全部收敛为 `server.moryflow.com`。
- [x] 登录面板提交链路修复：`LoginPanel` 移除内层 `<form>`，改为显式按钮提交 + Enter 捕获提交（避免触发外层 Settings form）。
- [x] 验证码步骤提交链路修复：`OTPForm` 移除内层 `<form>`，并将验证成功后的 `onSuccess` 调用改为 `await`，避免二次登录失败时未处理 Promise 导致弹窗异常。
- [x] Auth fail-fast：`refreshAccessToken()` 在 refresh token 缺失时直接返回，不再发网络请求。
- [x] 首次登录会话建立修复：登录与验证码验证统一走 Token-first，成功后直接建立本地会话（access+refresh）。
- [x] 网络失败策略：refresh 请求增加超时（10s）；`loadUser()` 仅在明确 401/403 时清理会话，网络异常保留现有状态。
- [x] 登录态 loading 行为修复：`AuthProvider.login()` 不再触发全局 loading，登录失败时保持当前面板并回显错误，仅按钮显示提交态。
- [x] Account 区 loading 体验修复：未登录 + loading 时直接显示登录面板，不再整块 skeleton。
- [x] Auth 错误解析增强：`parseAuthError` 支持 JSON 字符串/嵌套 error，避免显示原始 `{"code":"EMAIL_NOT_VERIFIED"...}`。
- [x] 回归测试已补充并执行：覆盖无 refresh token 不触发 fetch、`shouldClearAuthSessionAfterEnsureFailure`、LoginPanel/OTPForm 提交不冒泡外层 form、OTP `onSuccess` 失败错误回显（`submit-bubbling.test.tsx` / `auth-session.spec.ts` / `otp-form.test.tsx`）。
- [x] 回归测试增补：Token-first `auth-session`（body refreshToken + 无 Cookie fallback）、未登录 loading 不走全局 skeleton（`account-section.test.tsx`）、Auth 错误解析（`parse-auth-error.spec.ts`）。
- [x] 影响包类型检查已执行：`pnpm --filter @moryflow/pc typecheck` 通过。
- [x] 影响包单测已执行：`pnpm --filter @moryflow/pc test:unit -- src/renderer/lib/server/__tests__/auth-session.spec.ts src/renderer/components/auth/otp-form.test.tsx` 通过。
- [x] 长任务预刷新策略更新：`ACCESS_TOKEN_SKEW_MS` 已统一调整为 1h，并修正 PC `ensureAccessToken` 持久化 token 用例为 >1h 场景（`auth-session.spec.ts`）。
- [x] PC AuthProvider 副作用收敛：`loadUser` 与 `membershipEnabled` 同步副作用拆分，避免切换会员开关时重复触发会话加载。
- [x] Web/Admin 网络失败兜底补齐：Console/Admin/Moryflow Admin 在 refresh 网络失败时回退未过期 access token，不再把用户强制回登录态；并将 `user` 纳入持久化以覆盖刷新页瞬时抖动场景；已补充 store 回归测试。
- [x] 全仓 L2 校验已执行：`pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 全通过（存在测试日志噪音但非失败）。
- [ ] 待执行：桌面端手工回归（最新包验证登录/注册弹窗行为）。
- [ ] 待执行：线上入口 TLS/反代修复（`server.moryflow.com` 可用性恢复）。

## 实施进度（2026-02-25）

- [x] 后端路由前缀复核：Moryflow Auth 为固定 `POST /api/v1/auth/*`（`/api/v1/auth/sign-in/email`、`/api/v1/auth/email-otp/verify-email`、`/api/v1/auth/refresh`），并与业务 API 统一到 `/api/v1/*`。
- [x] PC 登录 404 根因修复：`auth-api` 改为显式请求 `/api/v1/auth/*`；不再依赖 `baseUrl + 相对 path` 的 URL 拼接语义。
- [x] PC Better Auth baseURL 修复：`createAuthClient` 从 `https://server.moryflow.com` 统一为 `https://server.moryflow.com/api/v1/auth`，避免注册/发码命中根路径。
- [x] Mobile 同类问题一并修复：`auth-api`、`auth-session` 的登录/验证/刷新/登出统一改为显式 `/api/v1/auth/*`。
- [x] 同类排查结果：Anyhunt Console/Admin/www 与 Moryflow Admin 已使用显式 `/api/v1/auth/*`，未发现同类路径缺失问题。
- [x] Moryflow 业务路由统一：`/api/v1/usage`、`/api/v1/payment/*`、`/api/v1/license/*`、`/api/v1/admin/*`、`/api/v1/storage/*`、`/api/v1/webhooks/creem` 已统一并完成调用侧同步。
- [x] Anyhunt 同步统一：`/api/v1/auth/*` 与 `/api/v1/webhooks/creem` 改为 `version: '1'`，`main.ts` 不再保留 webhook 版本中立排除。
- [x] 回归测试通过：
  - `pnpm --filter @moryflow/pc exec vitest run src/renderer/lib/server/__tests__/auth-api.spec.ts src/renderer/lib/server/__tests__/auth-methods.spec.ts src/renderer/lib/server/__tests__/auth-session.spec.ts`
  - `pnpm --filter @moryflow/mobile exec vitest run lib/server/__tests__/auth-api.spec.ts lib/server/__tests__/auth-session.spec.ts`
- [x] 服务端回归补跑通过：
  - `pnpm --filter @anyhunt/anyhunt-server exec vitest run src/auth/__tests__/auth.controller.spec.ts src/auth/__tests__/auth.tokens.controller.spec.ts`
  - `pnpm --filter @moryflow/server exec vitest run src/auth/__tests__/auth.controller.spec.ts src/auth/__tests__/auth.tokens.controller.spec.ts src/payment/payment.utils.spec.ts`
- [x] 请求传输层语义修复：`packages/api` `raw/stream` 在非 `ok` 响应时保持返回原始 `Response`，由调用方显式判断 `response.ok`，避免误抛异常破坏重定向/状态码判断链路。
- [x] Server 出站请求客户端修复：`apps/anyhunt/server` 与 `apps/moryflow/server` 的 `server-http-client` 改为“每次请求读取当前 `globalThis.fetch`”并支持显式 `fetcher` 注入，消除模块加载时固化 fetch 带来的 mock/运行时 hook 失效问题。
- [x] 受影响回归测试补齐并通过：
  - `src/search/__tests__/search.service.spec.ts`（autocomplete 走 `raw + response.json`，兼容响应头差异）
  - `src/digest/__tests__/services/rss.service.spec.ts`、`src/digest/__tests__/processors/webhook-delivery.processor.spec.ts`（`Headers` 实例断言）
  - `src/demo/__tests__/demo.service.spec.ts`（Turnstile mock 对齐统一 transport 语义）
- [x] 全仓质量校验通过：
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test:unit`

## 验收标准

- 未登录启动时：登录页应在 1s 内可交互，不再卡住 20s loading。
- 登录/注册失败时：显示明确错误，不出现设置弹窗异常关闭。
- 网络层恢复后：`/api/v1/auth/refresh` 返回 HTTP 响应（401/200 均可），不再 `ERR_CONNECTION_CLOSED`。
- 回归测试新增并通过。
