# Moryflow PC 用户模块冻结方案（最终）

## 目标

在 Apple 登录下线的前提下，完成 Moryflow PC 用户模块当前高优先级缺口的根因修复，并冻结最终契约，避免后续再次回退到“前端补丁式补发验证码”或“半闭环账户流程”。

## 范围冻结

- Apple 登录本轮不做实现，也不再保留 disabled/coming soon 入口。
- 所有账户能力继续收敛在现有设置弹窗 `AccountSection` 内，不新增独立页面或路由。
- 本轮完成的能力仅包含：
  - OTP 验证页轻量化改版
  - 注册中断恢复
  - 忘记密码闭环
  - 已登录未验证邮箱补救
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
- 邮箱注册
- 注册后 OTP 验证
- Google 登录
- 退出登录
- OTP 验证页极简单列版
- 忘记密码与 OTP 重置密码
- 已登录未验证邮箱补验证
- `displayName` 编辑
- 会员与积分展示
- 订阅升级与积分购买
- 删除账号

### 本轮已修复问题

#### 1. 邮箱验证码注册完成后，资料区仍显示“邮箱未验证”

- 根因：`/api/v1/user/me` 返回的当前用户摘要缺失 `emailVerified`。
- 修复：当前用户摘要统一由服务端 `UserService.getCurrentUserSummary()` 生成，稳定返回 `emailVerified`、`createdAt`、`image`，并优先使用 `profile.displayName` 作为展示名。
- 结果：注册 OTP 成功后，资料区会正确显示 `Email verified`。

#### 2. 注册停在 OTP 步骤后，用户无法通过正常入口恢复

- 根因：重复注册遇到未验证账号时，系统既不允许登录，也没有继续验证入口。
- 修复：`/api/v1/auth/sign-up/email` 在进入 Better Auth 前增加未验证 credential 账号恢复分支；同邮箱、未验证、未删除时，按“幂等注册成功”处理，并继续验证流程。
- 结果：用户重新走注册入口并输入相同邮箱时，会继续进入 OTP 验证，不再卡死。

#### 3. 注册进入 OTP 页时，验证码未确认发出却已开始倒计时

- 根因：旧实现把“注册成功”和“首发验证码发送成功”混为一件事，导致 UI 提前进入已发送状态。
- 修复：注册首发 OTP 改为服务端托管发送；`sign-up/email` 只有在用户创建或恢复成功且首发验证码实际发送成功后才返回成功。客户端不再在注册成功后额外补发首个验证码。
- 结果：OTP 页面和 60 秒倒计时只会出现在“首发验证码已确认发出”之后；若发送失败，注册表单保持可见并展示明确错误。

#### 4. 重复注册恢复分支会忽略最新输入的密码和昵称

- 根因：旧恢复逻辑只复用已有未验证用户，不会应用用户这次重新提交的凭据。
- 修复：恢复分支会把最新密码写回 credential 账号，把最新昵称写回用户记录，并与 Better Auth 的最小密码长度规则保持一致。
- 结果：用户完成 OTP 后，使用这次重新输入的密码即可登录，不会残留旧密码。

#### 5. `PATCH /api/v1/user/profile` 空请求会意外清空昵称

- 根因：服务端把可选字段直接归一化为 `null`，空 PATCH 会落成“清空 displayName”。
- 修复：`updateProfileSchema` 明确要求至少携带一个支持字段；service 仅更新实际传入的字段。
- 结果：空 PATCH 会返回 `400`，只有显式传入 `displayName` 时才会更新或清空昵称。

#### 6. 忘记密码、未验证邮箱补救、资料编辑缺失

- 登录页已接入忘记密码模式，支持发验证码和用 OTP 重置密码；成功后回到登录态并保留邮箱。
- 资料页未验证状态下已接入补验证入口，发送验证码后复用同一 OTP 组件完成验证。
- 资料页已接入 `displayName` 编辑，保存后会刷新当前用户状态，资料区与顶部账号展示保持一致。

## 关键契约冻结

### 认证与 OTP

- `/api/v1/auth/sign-up/email` 是注册首发 OTP 的唯一正式入口。
- 注册成功的定义被冻结为：
  - 用户创建成功，或命中未验证账号恢复分支
  - 且首发 `email-verification` OTP 已成功写入并成功发出
- 若首发 OTP 发送失败：
  - 接口返回错误，不返回“假成功”
  - 前端停留在注册表单，不进入 OTP 页面
- `send-verification-otp` 与 `forget-password/email-otp` 统一走服务端托管发送逻辑，避免依赖 Better Auth 的后台异步发送吞错语义。
- 服务端显式固定 `emailAndPassword.minPasswordLength = 8`，恢复注册分支必须遵守相同密码约束，不能绕过正常注册规则。

### 注册恢复

- 同邮箱二次注册且账号 `emailVerified=false`、存在 credential 账号、未软删除时：
  - 视为继续注册
  - 返回与正常注册同类的成功语义
  - 应用用户本次重新输入的密码和昵称
  - 重新发送首发验证 OTP
- 不新增“恢复注册”专用入口，用户继续从原注册入口进入。

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
  - 已登录未验证邮箱补验证
  - 忘记密码中的 OTP 校验链路

## 相关客户端对齐

- PC 注册编排层不再在 `signUpWithEmail()` 成功后额外调用一次 `sendVerificationOTP(...)`。
- mobile 注册编排层已同步对齐相同服务端契约，避免 desktop/mobile 两端出现不同的首发 OTP 语义。
- PC Electron E2E 已冻结为：
  - 注册接口成功时进入 OTP 页
  - 注册接口因首发 OTP 发送失败而报错时，停留在注册表单

## 当前验证基线

- `pnpm --filter @moryflow/server test -- better-auth auth.service auth.sign-up-recovery auth.controller user.controller`
- `CI=1 pnpm --filter @moryflow/pc test:unit src/main/app/update-service.test.ts src/renderer/lib/server/__tests__/auth-api.spec.ts src/renderer/components/auth/otp-form.test.tsx src/renderer/components/auth/otp-form.visual.test.tsx src/renderer/components/settings-dialog/components/account/login-panel.test.tsx src/renderer/components/settings-dialog/components/account/password-reset-panel.test.tsx src/renderer/components/settings-dialog/components/account/email-verification-recovery.test.tsx src/renderer/components/settings-dialog/components/account/profile-editor.test.tsx src/renderer/components/settings-dialog/components/account/user-profile.test.tsx src/renderer/components/settings-dialog/components/providers/submit-bubbling.test.tsx`
- `pnpm --filter @moryflow/pc exec playwright test tests/account-auth.spec.ts`
- `CI=1 pnpm --filter @moryflow/pc typecheck`
- `pnpm --filter @moryflow/mobile test:unit lib/server/__tests__/auth-api.spec.ts lib/server/__tests__/auth-methods.spec.ts`
- `git diff --check`

## 仍未覆盖的非阻断项

- 真实收件箱级邮件冒烟尚未执行；当前仅完成服务端回归、PC 单测、Electron E2E、PC typecheck 与 mobile 聚焦单测。
- mobile 仓库历史 `check:type` 问题未在本轮清理；它们不是本轮用户模块修复引入的问题。
