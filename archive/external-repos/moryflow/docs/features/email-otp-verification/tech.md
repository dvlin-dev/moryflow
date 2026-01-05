# 邮箱验证码验证

## 需求描述

在用户注册时添加邮箱验证码验证，确保邮箱真实有效。

**用户流程**：

1. 用户输入邮箱 + 密码，点击注册
2. 后端创建账户并发送 6 位验证码到邮箱
3. 用户输入验证码完成验证
4. 验证通过后进入应用

---

## 技术方案

### 技术选型

| 组件     | 技术                        | 版本     |
| -------- | --------------------------- | -------- |
| 认证框架 | better-auth `emailOTP` 插件 | 现有版本 |
| 邮件服务 | resend                      | ^6.6.0   |
| UI 组件  | 复用 `otp-form.tsx`         | -        |

### 架构设计

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Server    │────▶│   Resend    │
│  (PC/Mobile)│     │  (NestJS)   │     │   (Email)   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │
      │  1. signUp        │
      │──────────────────▶│
      │                   │  2. 生成 OTP + 发送邮件
      │                   │─────────────────────────▶
      │  3. 跳转验证页面   │
      │◀──────────────────│
      │                   │
      │  4. verifyEmail   │
      │──────────────────▶│
      │                   │  5. 验证 OTP
      │  6. 验证成功       │
      │◀──────────────────│
```

### 模块划分

#### 1. 后端 `apps/server`

**邮件服务模块** `src/email/`

- `email.module.ts` - 模块定义
- `email.service.ts` - Resend 封装，提供 `sendOTP(email, otp)` 方法

**认证模块** `src/auth/`

- `better-auth.ts` - 添加 `emailOTP` 插件配置

#### 2. 前端 `apps/pc`

**验证码表单组件** `src/renderer/components/auth/`

- 基于现有 `otp-form.tsx` 改造，添加：
  - 倒计时重发
  - 错误提示
  - 加载状态

#### 3. 前端 `apps/mobile`

**验证码表单组件** `components/auth/`

- 复用 mobile 已有的 `verify-email-form.tsx`，改造为验证码输入

---

## 执行计划

### Step 1: 后端 - 邮件服务

1. 安装依赖：`pnpm -C apps/server add resend`
2. 添加环境变量：`RESEND_API_KEY`、`EMAIL_FROM`
3. 创建 `src/email/` 模块

### Step 2: 后端 - 集成 Email OTP 插件

1. 在 `better-auth.ts` 中添加 `emailOTP` 插件
2. 配置 `sendVerificationOnSignUp: true`
3. 在 `sendVerificationOTP` 回调中调用邮件服务

### Step 3: 前端 PC - 验证码页面

1. 改造 `otp-form.tsx` 为可复用组件
2. 添加注册成功后跳转验证页面的逻辑
3. 集成 `emailOTPClient` 插件

### Step 4: 前端 Mobile - 验证码页面

1. 改造 `verify-email-form.tsx`
2. 添加验证码输入组件
3. 集成 `emailOTPClient` 插件

### Step 5: 测试验证

1. 本地测试完整注册流程
2. 验证邮件发送和验证码校验
