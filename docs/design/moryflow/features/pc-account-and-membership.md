---
title: PC 账号与会员
date: 2026-03-12
scope: apps/moryflow/pc
status: active
---

# PC 账号与会员

本文记录 Moryflow PC 设置弹窗里 `Account` 分区的当前事实，包括登录、注册、会员购买、积分购买和账号删除。

## 1. 入口与分流

- 设置弹窗的账号页入口是 `account` section。
- `AccountSection` 只做一层分流：
  - 未登录：显示 `LoginPanel`
  - 已登录：显示 `UserProfile`
- 已登录加载中才展示 skeleton；未登录不会因为鉴权请求闪整块 loading。

## 2. 未登录态

未登录页不是单一登录框，而是一组连续的账号流程。

### 2.1 登录

- 支持邮箱 + 密码登录。
- 支持 Google 登录。
- 登录成功后刷新鉴权状态，并回到账号页已登录态。
- 桌面端 refresh/access token 通过独立本地凭据 store 持久化，不再依赖 Keychain；详细约束见 `moryflow-pc-local-credential-storage.md`。

### 2.2 注册

注册是三步流程，不是一个长表单。

1. 输入邮箱并发起注册。
2. 输入 OTP 完成邮箱校验。
3. 设置密码，完成建号并刷新当前会话。

约束：

- 密码最短 8 位。
- OTP 校验完成前不会进入密码步骤。

### 2.3 找回密码

找回密码和注册分开维护，流程为：

1. 输入邮箱并发送 OTP。
2. 输入 6 位验证码。
3. 输入新密码并提交重置。

成功后会回到登录态，并把邮箱带回登录表单。

## 3. 已登录态

已登录页由 `UserProfile` 承载，内容分成四块。

### 3.1 基本资料

- 头像
- 昵称
- 邮箱
- 邮箱验证状态
- 当前订阅等级 badge
- 编辑资料入口
- 退出登录

资料编辑是单独的 `ProfileEditor` 流程，不和会员、积分混在一起。

### 3.2 积分余额

账号页直接展示四类积分：

- `daily`
- `subscription`
- `purchased`
- `total`

购买积分入口在这一块，点击后打开 `CreditPacksDialog`。

### 3.3 会员权益

会员区域展示：

- 当前 tier
- tier 对应功能列表
- 非 `pro` 用户的升级入口

升级按钮会打开 `SubscriptionDialog`。计费周期支持月付和年付切换，产品列表从服务端拉取，不写死在前端文档里。

### 3.4 危险操作

当前危险区只有删号。

删号前必须完成三件事：

1. 选择删除原因。
2. 可选填写补充反馈。
3. 输入当前账号邮箱作为确认文本。

删除成功后会退出登录。

## 4. 购买链路

账号页的付费相关动作分成两类。

### 4.1 订阅升级

- 入口：`SubscriptionDialog`
- 周期：`monthly` / `yearly`
- 数据源：`fetchProducts()`
- 支付承接：`PaymentDialog`
- 支付成功后：清理 checkout URL、刷新用户信息、关闭弹窗

### 4.2 积分包购买

- 入口：`CreditPacksDialog`
- 当前固定展示三档积分包：`5000`、`10000`、`50000`
- 数据源：`fetchProducts()` 过滤 `credits` 产品
- 支付承接：`PaymentDialog`
- 支付成功后：刷新用户信息并关闭弹窗

## 5. 当前边界

- 账号页负责“身份、资料、会员、积分、删号”。
- Provider、MCP、Cloud Sync 不属于账号页职责。
- 账号页不直接解释积分计算规则；积分定价和消耗规则继续以 `credits-system-tech.md` 为准。

## 6. 代码入口

- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account-section.tsx`
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/login-panel.tsx`
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/password-reset-panel.tsx`
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/user-profile.tsx`
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/subscription-dialog.tsx`
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/credit-packs-dialog.tsx`
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/delete-account-dialog.tsx`
