# Deep Link 打开 Electron 而非 MoryFlow 应用

## 问题描述

支付成功后，服务器页面跳转到 `moryflow://payment/success` Deep Link 时，系统打开的是 Electron 而不是 MoryFlow 应用。

## 背景

为解决 Creem 支付页面因 CSP `frame-ancestors 'self'` 限制无法在 iframe 中嵌入的问题，改用 Deep Link 方案：

1. 点击订阅 → 创建 checkout → `shell.openExternal()` 在系统浏览器打开支付链接
2. 支付完成 → Creem 跳转到 `https://server.moryflow.com/payment/success`
3. 服务器成功页面 → 自动跳转到 `moryflow://payment/success` Deep Link
4. 应用收到 Deep Link → 刷新用户信息

## 已完成的改动

### 主进程 (`apps/pc/src/main/index.ts`)
- 注册 `moryflow://` 协议
- 监听 `open-url` 事件（macOS）和 `second-instance` 事件（Windows/Linux）
- 收到 `moryflow://payment/success` 时广播 `payment:success` 到渲染进程

### electron-builder 配置 (`apps/pc/electron-builder.yml`)
- macOS: 添加 `CFBundleURLTypes` 关联 `moryflow` 协议
- Windows: 添加 `protocols` 配置

### IPC 通道
- `preload/index.ts`: 添加 `payment.openCheckout()` 和 `payment.onSuccess()`
- `shared/ipc/desktop-api.ts`: 添加类型定义

### PaymentDialog (`apps/pc/src/renderer/components/payment-dialog/index.tsx`)
- 改用 `shell.openExternal()` 打开支付链接
- 监听 `payment:success` 事件

### 服务端 (`apps/server/src/payment/payment-success.controller.ts`)
- 成功页面自动跳转到 `moryflow://payment/success`

## 可能的原因

1. **开发环境问题**：开发环境下 `app.setAsDefaultProtocolClient()` 注册的是 Electron 可执行文件路径，而非打包后的应用
2. **协议未正确关联**：macOS 上需要打包安装后才能正确关联 URL Scheme
3. **缓存问题**：系统可能缓存了旧的协议关联

## 排查方向

1. **打包测试**：打包后安装测试，看协议是否正确关联到 MoryFlow
2. **检查协议注册**：
   ```bash
   # macOS 查看 URL Scheme 关联
   /System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister -dump | grep moryflow
   ```
3. **开发环境处理**：开发环境可能需要特殊处理，参考 Electron 官方文档的 `process.defaultApp` 判断

## 相关代码位置

- `apps/pc/src/main/index.ts:86-124` - Deep Link 注册逻辑
- `apps/pc/electron-builder.yml:30-35` - macOS 协议配置
- `apps/pc/electron-builder.yml:58-62` - Windows 协议配置

## 参考资料

- [Electron Deep Linking](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app)
