---
title: iOS 应用证书申请与签名指南
date: 2026-01-12
scope: moryflow, mobile, release
status: draft
---

<!--
[INPUT]: Apple Developer 证书；Expo + EAS；构建签名
[OUTPUT]: 可照做的 iOS 证书与签名步骤（Moryflow Mobile）
[POS]: Runbook：Moryflow 移动端发布（iOS）

[PROTOCOL]: 本文件变更时同步更新 `docs/products/moryflow/index.md`（索引）。
-->

# iOS 应用证书申请与签名指南

本文档提供 MoryFlow 移动端（apps/moryflow/mobile）iOS 证书申请、配置和构建签名的完整流程。项目使用 **Expo + EAS** 进行构建。

## 目录

- [前置要求](#前置要求)
- [证书类型说明](#证书类型说明)
- [方式一：EAS 托管证书（推荐）](#方式一eas-托管证书推荐)
- [方式二：手动管理证书](#方式二手动管理证书)
  - [步骤 1：删除旧证书](#步骤-1删除旧证书)
  - [步骤 2：创建 App ID](#步骤-2创建-app-id)
  - [步骤 3：创建分发证书](#步骤-3创建分发证书)
  - [步骤 4：创建 Provisioning Profile](#步骤-4创建-provisioning-profile)
  - [步骤 5：配置 EAS 使用自有证书](#步骤-5配置-eas-使用自有证书)
- [EAS 构建配置](#eas-构建配置)
- [App Store 提交配置](#app-store-提交配置)
- [常用命令](#常用命令)
- [常见问题](#常见问题)

---

## 前置要求

| 项目                 | 说明                     |
| -------------------- | ------------------------ |
| Apple Developer 账号 | $99/年                   |
| Expo 账号            | 免费，用于 EAS 构建      |
| EAS CLI              | `npm install -g eas-cli` |

### 当前项目配置

| 配置项        | 值                       |
| ------------- | ------------------------ |
| Bundle ID     | `com.dvlindev.mobile.v2` |
| 最低 iOS 版本 | 12.0                     |
| 框架          | Expo 54 + React Native   |

---

## 证书类型说明

iOS 开发和分发涉及多种证书：

| 证书类型           | 用途           | 有效期   |
| ------------------ | -------------- | -------- |
| Apple Development  | 本地开发调试   | 1 年     |
| Apple Distribution | App Store 上架 | 1 年     |
| APNs Key (.p8)     | 推送通知       | 永不过期 |

| Provisioning Profile 类型 | 用途                          |
| ------------------------- | ----------------------------- |
| Development               | 开发调试，绑定测试设备        |
| Ad Hoc                    | 内部测试分发（限 100 台设备） |
| App Store                 | 正式上架 App Store            |

---

## 方式一：EAS 托管证书（推荐）

EAS 可以自动创建和管理所有证书，**无需手动操作**。

### 首次配置

```bash
cd apps/moryflow/mobile

# 登录 EAS
eas login

# 配置项目（首次运行）
eas build:configure

# 构建时会自动提示创建证书
eas build --platform ios --profile production
```

首次构建时，EAS 会提示：

1. 登录 Apple Developer 账号
2. 选择 Team
3. 自动创建 Distribution Certificate
4. 自动创建 Provisioning Profile

### 查看已托管的证书

```bash
# 查看所有证书
eas credentials

# 交互式管理
eas credentials --platform ios
```

### 优点

- 无需手动管理证书文件
- 证书自动续期
- 团队成员无需共享证书
- 避免证书冲突

---

## 方式二：手动管理证书

如果需要完全控制证书，可以手动申请并配置。

### 步骤 1：删除旧证书

#### 在 Apple Developer 网站删除

1. 登录 [Apple Developer](https://developer.apple.com/account)
2. 进入 **Certificates, Identifiers & Profiles**
3. **Certificates** → 找到要删除的证书 → **Revoke**
4. **Profiles** → 删除关联的 Provisioning Profile

#### 在本地钥匙串删除

1. 打开 **钥匙串访问**
2. 搜索 `Apple Distribution` 或 `iPhone Distribution`
3. 右键删除证书和关联的私钥

#### 在 EAS 删除托管证书

```bash
eas credentials --platform ios
# 选择 "Remove a certificate" 或 "Remove a provisioning profile"
```

### 步骤 2：创建 App ID

1. 登录 [Apple Developer](https://developer.apple.com/account)
2. 进入 **Certificates, Identifiers & Profiles** → **Identifiers**
3. 点击 **+** 创建新 App ID
4. 选择 **App IDs** → Continue
5. 选择 **App** → Continue
6. 填写信息：
   - **Description**: `MoryFlow Mobile`
   - **Bundle ID**: 选择 **Explicit**，填入 `com.dvlindev.mobile.v2`
7. 勾选需要的 Capabilities：
   - ✅ Sign In with Apple
   - ✅ HealthKit（如需要）
   - ✅ Push Notifications（如需要）
8. 点击 **Continue** → **Register**

### 步骤 3：创建分发证书

#### 3.1 创建证书签名请求 (CSR)

1. 打开 **钥匙串访问**（`/Applications/Utilities/Keychain Access.app`）
2. 菜单：**钥匙串访问 → 证书助理 → 从证书颁发机构请求证书**
3. 填写：
   - **用户电子邮件地址**：你的邮箱
   - **常用名称**：`MoryFlow iOS Distribution`
   - **CA 电子邮件地址**：留空
4. 选择 **存储到磁盘**
5. 保存 `.certSigningRequest` 文件

#### 3.2 在 Apple Developer 创建证书

1. 进入 **Certificates** → 点击 **+**
2. 选择 **Apple Distribution**（用于 App Store 和 Ad Hoc）
3. 点击 **Continue**
4. 上传 CSR 文件
5. 下载生成的 `.cer` 证书

#### 3.3 导出 .p12 文件

1. **双击** `.cer` 文件导入钥匙串
2. 打开 **钥匙串访问** → **我的证书**
3. 找到 `Apple Distribution: xxx` 证书
4. 展开，同时选中证书和私钥
5. **右键 → 导出 2 个项目**
6. 保存为 `.p12` 文件，设置密码

### 步骤 4：创建 Provisioning Profile

1. 进入 **Profiles** → 点击 **+**
2. 选择分发类型：
   - **App Store** - 正式上架
   - **Ad Hoc** - 内部测试（需要先注册测试设备）
3. 选择 App ID：`com.dvlindev.mobile.v2`
4. 选择证书：刚创建的 Distribution 证书
5. 填写 Profile Name：`MoryFlow AppStore Distribution`
6. 下载 `.mobileprovision` 文件

### 步骤 5：配置 EAS 使用自有证书

```bash
cd apps/moryflow/mobile

# 进入证书管理
eas credentials --platform ios

# 选择以下选项：
# 1. "Use my own credentials"
# 2. "Set up a distribution certificate"
# 3. 上传 .p12 文件和密码
# 4. "Set up a provisioning profile"
# 5. 上传 .mobileprovision 文件
```

或者在 `eas.json` 中指定：

```json
{
  "build": {
    "production": {
      "ios": {
        "credentialsSource": "local"
      }
    }
  }
}
```

然后创建 `credentials.json`：

```json
{
  "ios": {
    "provisioningProfilePath": "./certs/MoryFlow_AppStore.mobileprovision",
    "distributionCertificate": {
      "path": "./certs/distribution.p12",
      "password": "your-password"
    }
  }
}
```

> ⚠️ 将 `credentials.json` 和证书文件添加到 `.gitignore`

---

## EAS 构建配置

### eas.json 完整配置

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development:simulator": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "development:device": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "staging": {
      "distribution": "store",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  },
  "submit": {
    "staging": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "XXXXXXXXXX"
      }
    },
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "XXXXXXXXXX"
      }
    }
  }
}
```

### 配置项说明

| 字段          | 说明                          | 获取方式                                                       |
| ------------- | ----------------------------- | -------------------------------------------------------------- |
| `appleId`     | Apple Developer 账号邮箱      | -                                                              |
| `ascAppId`    | App Store Connect 中的 App ID | ASC → App 信息 → Apple ID                                      |
| `appleTeamId` | 开发者 Team ID                | [Membership](https://developer.apple.com/account/#/membership) |

---

## App Store 提交配置

### 获取 ASC App ID

1. 登录 [App Store Connect](https://appstoreconnect.apple.com)
2. 进入 **我的 App**
3. 如果没有，点击 **+** 创建新 App：
   - 平台：iOS
   - 名称：MoryFlow
   - 主要语言：简体中文
   - Bundle ID：选择 `com.dvlindev.mobile.v2`
   - SKU：`moryflow-ios`
4. 创建后，进入 App → **App 信息**
5. 找到 **Apple ID**（纯数字，如 `1234567890`）

### 创建 App 专用密码

用于自动提交到 App Store：

1. 访问 [appleid.apple.com](https://appleid.apple.com)
2. **登录与安全** → **App 专用密码**
3. 生成新密码，标签：`EAS Submit`
4. 保存密码

### 配置环境变量

```bash
# 在 CI 或本地设置
export EXPO_APPLE_ID="your@email.com"
export EXPO_APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # App 专用密码
```

---

## 常用命令

### 构建命令

```bash
cd apps/moryflow/mobile

# 开发版（模拟器）
pnpm eas:build:dev:simulator:ios
# 或
eas build --platform ios --profile development:simulator

# 开发版（真机）
pnpm eas:build:dev:device:ios

# Staging 版本
pnpm eas:build:staging:ios

# 生产版本
eas build --platform ios --profile production
```

### 提交到 App Store

```bash
# 提交最新构建
eas submit --platform ios --profile production

# 提交指定构建
eas submit --platform ios --id BUILD_ID
```

### 证书管理

```bash
# 查看当前证书
eas credentials --platform ios

# 同步证书到本地
eas credentials --platform ios
# 选择 "Download credentials from EAS"

# 清除所有证书重新开始
eas credentials --platform ios
# 选择 "Remove a certificate" 和 "Remove a provisioning profile"
```

### OTA 更新

```bash
# 发布 OTA 更新（不需要重新构建）
eas update --branch production --message "Bug fixes"
```

---

## 常见问题

### Q: 构建失败，提示证书不匹配

**解决**：

```bash
# 清除 EAS 托管的证书
eas credentials --platform ios
# 选择清除证书和 profile，重新构建时会自动创建
```

### Q: 提交失败，提示 "No suitable application records were found"

**原因**：App Store Connect 中没有创建 App

**解决**：先在 ASC 创建 App，获取 Apple ID 填入 `eas.json`

### Q: 本地 Xcode 构建正常，EAS 构建失败

**检查项**：

1. `app.json` 中的 `bundleIdentifier` 是否正确
2. App ID 是否已在 Apple Developer 注册
3. 所需的 Capabilities 是否都已启用

### Q: 证书即将过期怎么办

**EAS 托管证书**：

```bash
eas credentials --platform ios
# 选择 "Create a new certificate" 替换旧证书
```

**手动管理证书**：重复步骤 3-4 创建新证书和 Profile

### Q: 如何添加测试设备

```bash
# 注册新设备
eas device:create

# 或在 Apple Developer 手动添加
# Devices → + → 填入 UDID
```

获取设备 UDID：

- 连接 iPhone 到 Mac
- 打开 Finder，选择设备
- 点击设备信息区域，显示 UDID

### Q: 推送通知证书怎么配置

推荐使用 APNs Key（.p8），一个 Key 可用于所有 App：

1. Apple Developer → **Keys** → **+**
2. 勾选 **Apple Push Notifications service (APNs)**
3. 下载 `.p8` 文件（只能下载一次）
4. 在推送服务中配置 Key ID 和 Team ID

---

## 证书信息汇总

完成配置后，你应该拥有以下信息：

| 项目                     | 说明               | 存储位置                    |
| ------------------------ | ------------------ | --------------------------- |
| Apple Distribution 证书  | 用于签名分发包     | EAS 或本地 .p12             |
| Provisioning Profile     | 关联 App ID 和证书 | EAS 或本地 .mobileprovision |
| App Store Connect App ID | 提交时标识 App     | eas.json                    |
| Team ID                  | 标识开发团队       | eas.json                    |
| App 专用密码             | 自动提交认证       | 环境变量                    |

---

## 参考资料

- [Expo - App Signing](https://docs.expo.dev/app-signing/app-credentials/)
- [EAS Build - iOS Credentials](https://docs.expo.dev/build/introduction/)
- [Apple - Certificates Overview](https://developer.apple.com/support/certificates/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
