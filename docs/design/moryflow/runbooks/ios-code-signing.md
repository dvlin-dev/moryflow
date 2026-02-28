---
title: iOS 应用签名与发布（Expo + EAS）
date: 2026-01-22
scope: moryflow, mobile, release
status: draft
---

<!--
[INPUT]: Apple Developer 证书；Expo + EAS；构建签名
[OUTPUT]: 可照做的 iOS 签名、构建、提交流程（Moryflow Mobile）
[POS]: Runbook：Moryflow 移动端发布（iOS / Expo + EAS）

[PROTOCOL]: 本文件变更时同步更新 `docs/design/moryflow/runbooks/index.md`（索引）。
-->

# iOS 应用签名与发布（Expo + EAS）

本文档面向 `apps/moryflow/mobile`，目标是让任何团队成员在 **不手动拷贝证书文件** 的前提下完成：

- iOS build credentials（签名证书 / Provisioning Profile）的配置
- EAS Build 构建（staging / production）
- EAS Submit 提交 App Store Connect（推荐使用 **App Store Connect API Key**）
- OTA 更新（EAS Update）

> 约束：本 runbook 按“最佳实践 + 当前仓库现状”写；若你发现本文与仓库配置不一致，请优先以仓库为准并修正文档。

## 目录

- [TL;DR（推荐路径）](#tldr推荐路径)
- [项目事实（以仓库为准）](#项目事实以仓库为准)
- [推荐的证书与鉴权策略](#推荐的证书与鉴权策略)
- [一次性初始化（One-time Setup）](#一次性初始化one-time-setup)
- [日常发版流程（Day-to-day）](#日常发版流程day-to-day)
- [CI 配置建议](#ci-配置建议)
- [排障（Troubleshooting）](#排障troubleshooting)

---

## TL;DR（推荐路径）

1. **Build 签名**：使用 **EAS 托管（managed credentials）** 管理证书与 profile（团队不共享 `.p12`、不手动导出/导入）。
2. **提交 App Store**：优先使用 **App Store Connect API Key**（比 Apple ID + App 专用密码更稳，适合 CI）。
3. **日常命令**（示例）：
   - 构建：`cd apps/moryflow/mobile && pnpm eas:build:staging:ios`
   - 提交：`pnpm eas:submit:staging:ios`
   - OTA：`pnpm eas:update:staging:ios`

---

## 项目事实（以仓库为准）

| 项目                 | 值                                                                           |
| -------------------- | ---------------------------------------------------------------------------- |
| App 路径             | `apps/moryflow/mobile`                                                       |
| Bundle ID            | `com.dvlindev.mobile.v2`（见 `apps/moryflow/mobile/app.json`）               |
| EAS Project ID       | `228e8949-68aa-4b1e-9c92-3689e60d03c7`（见 `apps/moryflow/mobile/app.json`） |
| EAS 配置             | `apps/moryflow/mobile/eas.json`                                              |
| iOS 部署版本（当前） | `15.1`（见 `apps/moryflow/mobile/ios/moryflow.xcodeproj/project.pbxproj`）   |
| Expo SDK             | `expo@^54`（见 `apps/moryflow/mobile/package.json`）                         |

> 说明：最低 iOS 版本应以 Xcode 工程（或 `app.json` 的 deploymentTarget，如未来补充）为准，不要在文档里“拍脑袋写死”。

---

## 推荐的证书与鉴权策略

把 iOS 发布拆成两件事：

1. **Build credentials**（用于签名构建产物）：Distribution Certificate + Provisioning Profile
2. **Submit credentials**（用于把 `.ipa` 提交到 App Store Connect）：Apple 鉴权（推荐 ASC API Key）

### Build credentials：推荐 EAS 托管

- 优点：团队不需要共享/拷贝证书文件；证书续期/替换更集中；能在 `eas credentials` 里统一查看与管理。
- 不推荐：把 `.p12`、`.mobileprovision` 放在 Git 仓库或到处拷贝（容易泄漏、容易乱套）。

### Submit credentials：推荐 App Store Connect API Key

- 推荐：ASC API Key（`.p8` + Key ID + Issuer ID），适合 CI，无需依赖 Apple ID 的 2FA / 密码轮换。
- 备选：Apple ID + App 专用密码（可以用，但长期维护成本更高）。

---

## 一次性初始化（One-time Setup）

### 0. 账号与权限

你需要同时具备：

- Apple Developer Program 账号（能创建证书 / App ID）
- App Store Connect 权限（能创建 App、上传构建、提交审核）
- Expo/EAS 账号（能访问该 EAS 项目）

### 1. 本地工具

```bash
cd apps/moryflow/mobile

# 安装 EAS CLI（推荐跟随团队固定版本；此处略）
npm i -g eas-cli

# 登录（本地开发时用）
eas login
```

> CI 建议使用 `EXPO_TOKEN` 登录（见下文）。

### 2. Apple Developer：App ID 与能力（Capabilities）

至少确保 App ID（`com.dvlindev.mobile.v2`）启用了你需要的能力（按当前项目：Sign in with Apple、HealthKit；如未来用推送则开启 Push Notifications）。

### 3. App Store Connect：创建 App 记录并拿到 `ascAppId`

1. 在 App Store Connect 创建 iOS App（Bundle ID 选择 `com.dvlindev.mobile.v2`）
2. 记录 **Apple ID（纯数字）**，即 EAS `ascAppId`（提交需要）。

### 4. EAS：配置 iOS build credentials（托管证书）

```bash
eas credentials --platform ios
```

推荐操作（交互式）：

- 选择 iOS
- 选择 “Manage credentials”
- 让 EAS 创建/管理 Distribution Certificate 和 Provisioning Profile（managed）

### 5. EAS Submit：配置 App Store Connect API Key（推荐）

按 Expo 官方流程创建并使用 App Store Connect API Key：

你最终会有三样东西：

- `AuthKey_XXXXXX.p8`（只可下载一次）
- Key ID（短字符串）
- Issuer ID（UUID）

**本地提交**可以把 `.p8` 存在安全位置，并在 `eas.json` 的 submit profile 中配置 `ascApiKeyPath` / `ascApiKeyId` / `ascApiKeyIssuerId`。

**CI 提交**建议把 `.p8` 的内容 Base64 后放到 Secret，在 workflow 运行时写回文件（避免把 `.p8` 落在仓库里）。

---

## 日常发版流程（Day-to-day）

本仓库已经在 `apps/moryflow/mobile/eas.json` 定义了多个 profile；并在 `apps/moryflow/mobile/package.json` 封装了一些常用脚本。

### 1. 构建（Build）

```bash
cd apps/moryflow/mobile

# staging iOS（已封装）
pnpm eas:build:staging:ios

# production iOS（当前未封装脚本，直接用 EAS CLI）
pnpm with-env eas build --profile production --platform ios
```

可选：你也可以用 `--auto-submit` 在 build 成功后自动触发 submit（更省事，但要先把 submit credentials 配好）。

### 2. 提交（Submit to App Store Connect）

```bash
cd apps/moryflow/mobile

# staging iOS（已封装）
pnpm eas:submit:staging:ios

# production iOS（当前未封装脚本）
pnpm with-env eas submit --profile production --platform ios
```

### 3. OTA 更新（EAS Update）

本项目 build profile 使用 `channel`（见 `apps/moryflow/mobile/eas.json`），因此 OTA 更新建议也用 `--channel`。

```bash
cd apps/moryflow/mobile

# staging OTA（已封装）
pnpm eas:update:staging:ios

# production OTA（示例）
pnpm with-env eas update --channel production --platform ios --message "Bug fixes"
```

---

## CI 配置建议

### 1. Expo 鉴权：`EXPO_TOKEN`

CI 不建议交互式 `eas login`，而是使用 Expo token：

- 在 Expo 账号生成 token
- 将 token 写入 CI Secret：`EXPO_TOKEN`

EAS CLI 会自动读取。

### 2. App Store Connect API Key（推荐）

建议在 CI Secrets 保存：

- `ASC_API_KEY_P8_BASE64`：`.p8` 文件内容 base64
- `ASC_API_KEY_ID`：Key ID
- `ASC_API_ISSUER_ID`：Issuer ID

然后在 workflow 里临时写出 key 文件，并把路径传给 `eas submit`（`ascApiKeyPath`）。

### 3. Apple ID + App 专用密码（不推荐但可用）

如果你暂时不用 ASC API Key，可用：

```bash
export EXPO_APPLE_ID="your@email.com"
export EXPO_APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
```

注意环境变量名是 `EXPO_APPLE_APP_SPECIFIC_PASSWORD`（不是 `EXPO_APPLE_PASSWORD`）。

---

## 排障（Troubleshooting）

### Q: 构建失败，提示证书不匹配

常见原因：证书/Provisioning Profile 绑定的 Bundle ID 或 Team 不一致，或历史证书污染。

```bash
eas credentials --platform ios
# 选择删除/重建 Distribution Certificate 与 Provisioning Profile
```

### Q: 提交失败，提示 "No suitable application records were found"

**原因**：App Store Connect 中没有创建 App 记录，或 `ascAppId`/Bundle ID 不匹配。

**解决**：先在 ASC 创建 App，获取 Apple ID（纯数字）并配置到 submit profile。

### Q: 本地 Xcode 构建正常，EAS 构建失败

**检查项**：

1. `app.json` 中的 `bundleIdentifier` 是否正确
2. App ID 是否已在 Apple Developer 注册
3. 所需的 Capabilities 是否都已启用

### Q: 证书即将过期怎么办

推荐做法：在 `eas credentials --platform ios` 中创建/替换证书与 profile（不要到处拷贝旧 `.p12`）。

---

## 参考资料（官方）

- [Expo: Submit to the Apple App Store (EAS Submit)](https://docs.expo.dev/submit/ios/)
- [Expo: Environment variables and secrets](https://docs.expo.dev/build-reference/variables/)
- [Expo: Local credentials](https://docs.expo.dev/app-signing/local-credentials/)
- [`eas.json` schema (configuration)](https://docs.expo.dev/build-reference/eas-json/)
