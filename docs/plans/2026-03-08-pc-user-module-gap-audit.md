# Moryflow PC 用户模块冻结方案（最终）

## 目标

在 Apple 登录下线的前提下，完成 Moryflow PC 用户模块当前高优先级缺口的根因修复，并冻结最终契约，避免后续再次回退到“前端补丁式补发验证码”或“半闭环账户流程”。

## 范围冻结

- Apple 登录本轮不做实现，也不再保留 disabled/coming soon 入口。
- 所有账户能力继续收敛在现有设置弹窗 `AccountSection` 内，不新增独立页面或路由。
- 本轮完成的能力仅包含：
  - OTP 验证页轻量化改版
  - 邮箱先验证、验证后定凭据的三段式注册
  - 忘记密码闭环
  - `displayName` 资料编辑首版
- 本轮仍不做：
  - Apple 登录恢复
  - 头像上传
  - 邮箱修改
  - 独立账号中心页面
  - 2FA
  - 数据导出

## 当前状态

### 已实现

- 邮箱密码登录
- 邮箱注册三段式（邮箱 -> OTP -> 设置密码）
- Google 登录
- 退出登录
- OTP 验证页极简单列版
- 忘记密码与 OTP 重置密码
- `displayName` 编辑
- 会员与积分展示
- 订阅升级与积分购买
- 删除账号

### 本轮已修复问题

#### 1. 邮箱验证码注册完成后，资料区仍显示“邮箱未验证”

- 根因：`/api/v1/user/me` 返回的当前用户摘要缺失 `emailVerified`。
- 修复：当前用户摘要统一由服务端 `UserService.getCurrentUserSummary()` 生成，稳定返回 `emailVerified`、`createdAt`、`image`，并优先使用 `profile.displayName` 作为展示名。
- 结果：注册 OTP 成功后，资料区会正确显示 `Email verified`。

#### 2. 注册在 OTP 之前不会创建真实 credential 账号

- 根因：旧注册流在邮箱验证前就把真实 `User/Account` 写入数据库，导致“谁先匿名写入密码”会污染最终账号语义。
- 修复：credential 注册改为 `PendingEmailSignup` 三段式，`/api/v1/auth/sign-up/email/start` 只创建 pending signup 并发送 OTP，`verify-otp` 只签发一次性 `signupToken`，`complete` 才原子创建真实账号。
- 结果：OTP 通过前数据库里不存在该邮箱的真实 credential 账号，只有拿到邮箱验证码的人才能决定最终密码。

#### 3. 注册进入 OTP 页时，验证码未确认发出却已开始倒计时

- 根因：旧实现把“注册成功”和“首发验证码发送成功”混为一件事，导致 UI 提前进入已发送状态。
- 修复：注册首发 OTP 改为服务端托管发送；`sign-up/email` 只有在用户创建或恢复成功且首发验证码实际发送成功后才返回成功。客户端不再在注册成功后额外补发首个验证码。
- 结果：OTP 页面和 60 秒倒计时只会出现在“首发验证码已确认发出”之后；若发送失败，注册表单保持可见并展示明确错误。

#### 4. 重复注册与验证码重发统一落在 pending signup 上

- 根因：旧恢复流既存在“第一次匿名写入赢”的问题，也存在“最后一次匿名覆盖赢”的问题。
- 修复：`start` 再次调用时只覆盖 pending signup 里的 OTP 和 completion token，不创建真实账号、不接受昵称、也不落永久密码。
- 结果：用户重新输入同邮箱时会重发 OTP 并使旧票据失效，最终生效的密码只会来自 OTP 通过后的 `complete` 请求。

#### 5. `PATCH /api/v1/user/profile` 空请求会意外清空昵称

- 根因：服务端把可选字段直接归一化为 `null`，空 PATCH 会落成“清空 displayName”。
- 修复：`updateProfileSchema` 明确要求至少携带一个支持字段；service 仅更新实际传入的字段。
- 结果：空 PATCH 会返回 `400`，只有显式传入 `displayName` 时才会更新或清空昵称。

#### 6. 忘记密码与资料编辑职责重新收口

- 登录页已接入忘记密码模式，支持发验证码和用 OTP 重置密码；成功后回到登录态并保留邮箱。
- 资料页不再提供“已登录未验证邮箱补救”入口；credential 注册成功即登录，未完成 OTP 前不会产生可登录账号。
- 资料页已接入 `displayName` 编辑，保存后会刷新当前用户状态，资料区与顶部账号展示保持一致。

## 关键契约冻结

### 认证与 OTP

- `/api/v1/auth/sign-up/email/start|verify-otp|complete` 是 credential 注册唯一正式入口；旧 `/api/v1/auth/sign-up/email` 固定返回 `410 LEGACY_SIGN_UP_DISABLED`。
- 注册成功的定义被冻结为：
  - `start` 成功且首发 OTP 已成功发出
  - `verify-otp` 成功且邮箱所有权已确认
  - `complete` 成功且真实 `User/Account/Subscription` 已创建并签发 token
- 若首发 OTP 发送失败，或 OTP/token 校验失败：
  - 接口返回错误，不返回“假成功”
  - 前端停留在当前步骤，不进入后续状态
- `forget-password/email-otp` 只服务真实已创建账号，不再承担“补完未验证注册”的语义。
- 服务端显式固定 `emailAndPassword.minPasswordLength = 8`；真实 credential 密码只会在 `complete` 步骤落库。

### 注册恢复

- 同邮箱重复调用 `start` 时：
  - 视为覆盖当前 pending signup
  - 重新发送首发验证 OTP
  - 旧 OTP 与旧 `signupToken` 全部失效
- OTP 通过前不创建真实 `User/Account`，也不存在“未验证 credential 账号恢复”语义。
- 昵称不再阻塞注册；完成注册时服务端按邮箱前缀生成默认名，后续在登录后的 profile 编辑。

### 资料与状态

- `/api/v1/user/me` 统一返回：
  - `id`
  - `email`
  - `emailVerified`
  - `name`
  - `image`
  - `createdAt`
  - `subscriptionTier`
  - `isAdmin`
  - `credits`
- 当前用户展示名优先级冻结为：`profile.displayName` > `user.name`。
- `PATCH /api/v1/user/profile` 当前只支持 `displayName`，且至少需要一个有效字段。
- `PATCH /api/v1/user/profile` 传入空字符串时，语义冻结为“清空 displayName”。

### OTP 页面

- OTP 页面视觉冻结为极简单列版：
  - 顶部说明文案
  - 突出显示目标邮箱
  - 单行验证码输入区
  - 单一主按钮 `Verify Email`
  - 底部弱化的 `Resend`
- `Back` 和 `Resend` 继续保留，但都降级为次级操作。
- OTP 组件继续同时服务于：
  - 注册验证
  - 忘记密码中的 OTP 校验链路

## 相关客户端对齐

- PC 注册编排层改为三步：输入邮箱 -> OTP -> 设置密码；不再展示昵称输入，也不再保留未验证账号恢复入口。
- mobile 注册编排层同步改为相同三段式，并删除 `pendingSignup` 状态与 `EMAIL_NOT_VERIFIED` 跳转补救。
- PC Electron E2E 已冻结为：
  - `start` 成功时进入 OTP 页
  - OTP 成功后进入设置密码页
  - `complete` 成功后直接建立登录态

## 当前验证基线

- `pnpm --filter @moryflow/server test -- src/auth/__tests__/auth-signup.controller.spec.ts src/auth/auth-signup.service.spec.ts src/auth/__tests__/auth.controller.spec.ts src/auth/auth.service.spec.ts src/auth/__tests__/auth.module.spec.ts`
- `pnpm --filter @moryflow/pc exec vitest run src/renderer/lib/server/__tests__/auth-api.spec.ts src/renderer/components/auth/otp-form.test.tsx src/renderer/components/auth/otp-form.visual.test.tsx src/renderer/components/settings-dialog/components/account/login-panel.test.tsx src/renderer/components/settings-dialog/components/account/user-profile.test.tsx`
- `pnpm --filter @moryflow/mobile test:unit -- lib/server/__tests__/auth-api.spec.ts lib/server/__tests__/auth-methods.spec.ts`
- `pnpm --filter @moryflow/server exec eslint src/auth/auth-signup.controller.ts src/auth/auth-signup.service.ts src/auth/auth-provisioning.service.ts src/auth/auth.controller.ts src/auth/auth.service.ts src/auth/better-auth.ts`
- `pnpm --filter @moryflow/pc exec eslint src/renderer/components/auth/otp-form.tsx src/renderer/components/settings-dialog/components/account/login-panel.tsx src/renderer/components/settings-dialog/components/account/user-profile.tsx src/renderer/lib/server/auth-api.ts src/renderer/lib/server/index.ts`
- `pnpm --filter @moryflow/mobile exec eslint components/auth/sign-up-form.tsx components/auth/verify-email-form.tsx components/auth/complete-sign-up-form.tsx lib/server/auth-api.ts lib/server/auth-methods.ts lib/server/context.tsx lib/contexts/auth.context.tsx`
- `git diff --check`

## 仍未覆盖的非阻断项

- 真实收件箱级邮件冒烟尚未执行；当前仅完成服务端聚焦回归、PC 聚焦单测、mobile 聚焦单测与改动文件静态检查。
- 仓库级全量 typecheck / E2E 未作为本轮必要阻断项执行；若合并前需要更高验证等级，可再单独升级。
