---
title: macOS 桌面端签名与公证（Electron + electron-builder）
date: 2026-01-22
scope: moryflow, pc, release
status: draft
---

<!--
[INPUT]: Apple Developer 证书；electron-builder；公证流程；CI 配置
[OUTPUT]: 可照做的签名 + 公证 + 发版流水线（Moryflow PC）
[POS]: Runbook：Moryflow 桌面端发布（macOS / Electron）

[PROTOCOL]: 本文件变更时同步更新 `docs/design/moryflow/runbooks/index.md`（索引）。
-->

# macOS 桌面端签名与公证（Electron + electron-builder）

本文档面向 `apps/moryflow/pc`，目标是让 Desktop App 在 macOS 上：

- **签名（Code Signing）**：用户打开不会出现“无法验证开发者”类的阻断
- **公证（Notarization）**：通过 Gatekeeper 验证，适合在官网 / GitHub Release 分发
- **可自动化**：通过 tag 触发 CI 构建发布（对齐当前仓库已有的 `release.sh` + GitHub Actions）

> 重要：macOS 公证要求应用启用 Hardened Runtime；Electron 还需要合适的 entitlements。

## 目录

- [TL;DR（推荐路径）](#tldr推荐路径)
- [项目事实（以仓库为准）](#项目事实以仓库为准)
- [推荐的凭证策略](#推荐的凭证策略)
- [一次性初始化（One-time Setup）](#一次性初始化one-time-setup)
- [仓库配置（electron-builder）](#仓库配置electron-builder)
- [本地打包与验证](#本地打包与验证)
- [CI 发版（tag → GitHub Release）](#ci-发版tag--github-release)
- [排障（Troubleshooting）](#排障troubleshooting)

---

## TL;DR（推荐路径）

1. 日常发版入口使用：`./apps/moryflow/pc/scripts/release.sh <version>`（会 bump 版本、commit、打 tag、push）。
2. CI（macOS job）负责签名 + 公证 + 上传产物到 GitHub Release。
3. 认证/密钥推荐：
   - 签名证书：Developer ID Application（`.p12`）→ `CSC_LINK` + `CSC_KEY_PASSWORD`
   - 公证：优先 **App Store Connect API Key** → `APPLE_API_KEY` + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER`

---

## 项目事实（以仓库为准）

| 项目                  | 值                                                               |
| --------------------- | ---------------------------------------------------------------- |
| App 路径              | `apps/moryflow/pc`                                               |
| electron-builder 配置 | `apps/moryflow/pc/electron-builder.yml`                          |
| tag 发版脚本          | `apps/moryflow/pc/scripts/release.sh`                            |
| GitHub Actions        | `apps/moryflow/pc/.github/workflows/release.yml`                 |
| App ID（macOS）       | `com.moryflow.app`（见 `apps/moryflow/pc/electron-builder.yml`） |

> 注意：当前仓库的 `apps/moryflow/pc/electron-builder.yml` 里 `hardenedRuntime: false`，且未配置公证步骤；要实现“可分发且不被 Gatekeeper 拦截”，需要按本文补齐配置。

---

## 推荐的凭证策略

把 Desktop macOS 发布拆成两件事：

1. **Signing credentials（签名）**：Developer ID Application 证书（导出为 `.p12`）
2. **Notarization credentials（公证）**：推荐 App Store Connect API Key（`.p8`），备选 Apple ID + App 专用密码

### 为什么推荐 App Store Connect API Key

- 对 CI 更友好：不依赖 Apple ID 2FA、密码轮换等“人肉环节”
- electron-builder / @electron/notarize 都原生支持使用 API Key 进行 notarization

---

## 一次性初始化（One-time Setup）

### 0. 前置条件

- Apple Developer Program（可创建 Developer ID Application 证书）
- macOS（用于生成 CSR、导出 `.p12`）
- Xcode Command Line Tools（用于 codesign / stapler / notarytool 等工具）

```bash
xcode-select --install
```

### 1. 创建 Developer ID Application 证书（导出为 .p12）

你可以走两种路径：

#### 路径 A：Fastlane Match（团队更推荐）

- 优点：证书与 profile 由 Match 统一管理，团队协作更清晰
- 代价：需要一个私有证书仓库 + 维护 `MATCH_PASSWORD`

参考 Fastlane 官方 Match 文档（见本文末参考资料）。

#### 路径 B：手动申请并导出 `.p12`（最直接）

1. 钥匙串访问生成 CSR
2. Apple Developer 创建 **Developer ID Application** 证书
3. 导入证书到钥匙串后，连同私钥一起导出 `.p12` 并设置密码

最终你会得到：

- `Moryflow-Developer-ID.p12`
- `CSC_KEY_PASSWORD`（导出时设置的密码）

---

## 仓库配置（electron-builder）

### 1. electron-builder 基础签名参数（CI 必需）

electron-builder 支持用环境变量注入 macOS 签名证书：

- `CSC_LINK`：`.p12` 的 base64 内容（或文件路径，视配置而定）
- `CSC_KEY_PASSWORD`：`.p12` 密码

> 建议：把 `.p12` 放到密码管理器/离线安全存储，不要提交到仓库。

### 2. 启用 Hardened Runtime（公证必需）

要通过 Apple notarization，必须启用 Hardened Runtime。

请在 `apps/moryflow/pc/electron-builder.yml` 把 `hardenedRuntime` 改为 `true`：

```yaml
mac:
  hardenedRuntime: true
```

### 3. 添加 entitlements（Electron 常见需求）

建议新增 `apps/moryflow/pc/build/entitlements.mac.plist`（如果 `apps/moryflow/pc/build/` 目录不存在就创建）。

参考 @electron/notarize 对 Electron Hardened Runtime 的说明：

一个相对保守的起点如下：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <true/>
  </dict>
</plist>
```

> 注意：`com.apple.security.cs.allow-unsigned-executable-memory` 通常只在旧版 Electron（<=11）才需要；新版本 Electron 不建议默认加。

然后在 `apps/moryflow/pc/electron-builder.yml` 里引用：

```yaml
mac:
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
```

### 4. 启用公证（Notarization）

electron-builder 内置了对 `@electron/notarize` 的集成；只要提供 Apple 凭证就会在构建中执行 notarization。

推荐（App Store Connect API Key）环境变量：

- `APPLE_API_KEY`：API key（可为 base64 内容或文件路径）
- `APPLE_API_KEY_ID`：Key ID
- `APPLE_API_ISSUER`：Issuer ID

备选（Apple ID + App 专用密码）：

- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

---

## 本地打包与验证

### 1. 本地构建（macOS）

```bash
cd apps/moryflow/pc
pnpm dist:mac
```

如果你想在本地验证“签名 + 公证”是否生效，你需要在执行前设置 `CSC_*` 和 `APPLE_*` 相关环境变量（见上文）。

### 2. 验证签名 / 公证 / Staple

（示例命令，具体路径以产物为准）

```bash
# 1) 验证签名（deep 校验会更严格）
codesign --verify --deep --strict --verbose=2 /path/to/MoryFlow.app

# 2) Gatekeeper 验证
spctl -a -vv /path/to/MoryFlow.app

# 3) Staple 验证（确保离线也能通过验证）
xcrun stapler validate /path/to/MoryFlow.app
```

---

## CI 发版（tag → GitHub Release）

### 1. 发版入口：release.sh

当前仓库已经提供 `apps/moryflow/pc/scripts/release.sh`，会：

- 更新 `apps/moryflow/pc/package.json` 的 version
- 提交 `chore(release): bump version to x.y.z`
- 创建 annotated tag：`vX.Y.Z`
- push 分支和 tag 到远程（触发 GitHub Actions）

用法：

```bash
./apps/moryflow/pc/scripts/release.sh 0.2.16
```

### 2. GitHub Actions Secrets（macOS job）

建议在 GitHub 仓库 `Settings → Secrets and variables → Actions` 添加：

- `CSC_LINK`：`.p12` base64（建议去掉换行后再粘贴）
- `CSC_KEY_PASSWORD`
- `APPLE_API_KEY`（`.p8` base64 或者文件路径；推荐 base64）
- `APPLE_API_KEY_ID`
- `APPLE_API_ISSUER`

### 3. Workflow 注意事项（当前仓库的改进建议）

当前 `apps/moryflow/pc/.github/workflows/release.yml` 是三平台矩阵，但未配置签名/公证的 secrets 注入。

建议：

- 仅在 `macos-latest` job 注入 `CSC_*`/`APPLE_*`
- pnpm 版本与 monorepo 根保持一致（根 `packageManager` 是 `pnpm@9.12.2`）

---

## 排障（Troubleshooting）

### Q: 打包后仍提示“无法验证开发者”或被 Gatekeeper 拦截

检查：

1. `apps/moryflow/pc/electron-builder.yml` 是否设置 `hardenedRuntime: true`
2. 是否提供了 notarization 需要的 `APPLE_*` 环境变量
3. 产物是否 stapled（`xcrun stapler validate ...`）

### Q: notarization 失败（鉴权相关）

- 使用 Apple ID 流程：确认用的是 **App 专用密码**，不是 Apple ID 登录密码
- 使用 API Key 流程：确认 `.p8` 没过期、Key ID / Issuer ID 正确，且 key 有权限

### Q: codesign 报错 `errSecInternalComponent`

常见原因：

- 证书导出 `.p12` 时没有包含私钥
- `CSC_KEY_PASSWORD` 错误
- CI Runner 无法导入证书（`CSC_LINK` 有换行/截断）

---

## 参考资料（官方）

- [electron-builder: Code Signing](https://www.electron.build/code-signing)
- [electron-builder: macOS notarize options / env vars](https://www.electron.build/configuration/mac)
- [@electron/notarize: Hardened Runtime + notarization](https://github.com/electron/notarize)
- [Apple: notarytool](https://keith.github.io/xcode-man-pages/notarytool.1.html)

```bash
cd apps/moryflow/pc

# 初始化 match（会创建 Matchfile）
fastlane match init
```

选择存储方式：

- **git** - 存储到私有 Git 仓库（推荐）
- **google_cloud** - 存储到 Google Cloud Storage
- **s3** - 存储到 Amazon S3

输入私有 Git 仓库地址（如 `https://github.com/your-org/certificates.git`）

生成的 `apps/moryflow/pc/fastlane/Matchfile`：

```ruby
# Matchfile
git_url("https://github.com/your-org/certificates.git")

storage_mode("git")

# macOS App Store 外分发
type("developer_id")

# 应用标识符
app_identifier("com.moryflow.app")

# Apple Developer 账号
username("your@email.com")

# 可选：指定 Team ID
# team_id("XXXXXXXXXX")
```

### 创建证书

```bash
# 自动创建 Developer ID 证书
fastlane match developer_id
```

首次运行会：

1. 提示输入 Apple Developer 账号密码
2. 自动创建 Developer ID Application 证书
3. 使用密码加密后存储到 Git 仓库
4. 安装证书到本地钥匙串

> 首次运行会要求设置加密密码（MATCH_PASSWORD），请妥善保存。

### 清除旧证书重新申请

如果需要删除旧证书重新申请：

```bash
# 删除 Apple Developer 上的 Developer ID 证书
fastlane match nuke developer_id

# 确认删除后，重新创建
fastlane match developer_id
```

### 查看已有证书

```bash
# 查看本地已安装的代码签名证书
security find-identity -p codesigning -v
```

### 集成到构建流程

创建 `apps/moryflow/pc/fastlane/Fastfile`：

```ruby
default_platform(:mac)

platform :mac do
  desc "获取/同步证书"
  lane :certificates do
    match(
      type: "developer_id",
      readonly: is_ci  # CI 环境只读，不创建新证书
    )
  end

  desc "构建并签名"
  lane :build do
    # 先获取证书
    certificates

    # 导出证书信息到环境变量
    # match 会自动设置以下环境变量：
    # - sigh_com.moryflow.app_developer_id_path (Profile 路径)
    # - DEVELOPER_ID_APPLICATION (证书名称)

    # 使用 electron-builder 打包
    sh("cd .. && pnpm dist:mac")
  end

  desc "完整发布流程"
  lane :release do
    build
    # 可以添加上传到 GitHub Release 等步骤
  end
end
```

运行：

```bash
# 仅获取证书
fastlane certificates

# 构建（自动获取证书 + 打包 + 签名 + 公证）
fastlane build
```

### CI 环境配置

#### GitHub Actions Secrets

| Secret 名称                     | 说明                         | 获取方式                       |
| ------------------------------- | ---------------------------- | ------------------------------ |
| `MATCH_PASSWORD`                | Match 加密密码               | 初始化时设置的密码             |
| `MATCH_GIT_BASIC_AUTHORIZATION` | Git 仓库访问凭证             | Base64 编码的 `username:token` |
| `FASTLANE_USER`                 | Apple ID 邮箱                | -                              |
| `FASTLANE_PASSWORD`             | Apple ID 密码或 App 专用密码 | -                              |
| `APPLE_ID`                      | Apple ID 邮箱（公证用）      | -                              |
| `APPLE_PASSWORD`                | App 专用密码（公证用）       | appleid.apple.com 生成         |
| `APPLE_TEAM_ID`                 | Team ID（公证用）            | Apple Developer 会员页面       |

#### 生成 Git 凭证

```bash
# GitHub Personal Access Token（需要 repo 权限）
echo -n "your_github_username:your_personal_access_token" | base64
```

#### GitHub Actions 配置

```yaml
name: Release macOS

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: |
          pnpm install
          cd apps/moryflow/pc && bundle install

      - name: Build with Fastlane
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_BASIC_AUTHORIZATION }}
          FASTLANE_USER: ${{ secrets.FASTLANE_USER }}
          FASTLANE_PASSWORD: ${{ secrets.FASTLANE_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: |
          cd apps/moryflow/pc
          fastlane build

      - name: Upload to Release
        uses: softprops/action-gh-release@v1
        with:
          files: apps/moryflow/pc/release/**/*.dmg
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### 本地 Gemfile

创建 `apps/moryflow/pc/Gemfile`：

```ruby
source "https://rubygems.org"

gem "fastlane"
```

安装：

```bash
cd apps/moryflow/pc
bundle install
```

---

## 方式二：手动申请证书

如果不想使用 Fastlane，可以手动在 Apple Developer 网站申请证书。

### 步骤 1：创建证书签名请求

在 Mac 上使用钥匙串访问创建 CSR 文件：

1. 打开 **钥匙串访问**（`/Applications/Utilities/Keychain Access.app`）
2. 菜单栏选择：**钥匙串访问 → 证书助理 → 从证书颁发机构请求证书**
3. 填写信息：
   - **用户电子邮件地址**：你的邮箱
   - **常用名称**：`MoryFlow Dev Key`（可自定义）
   - **CA 电子邮件地址**：留空
4. 选择 **存储到磁盘**
5. 点击继续，保存 `CertificateSigningRequest.certSigningRequest` 文件

### 步骤 2：创建 Developer ID 证书

1. 登录 [Apple Developer](https://developer.apple.com/account)
2. 进入 **Certificates, Identifiers & Profiles**
3. 点击左侧 **Certificates**，然后点击 **+** 按钮
4. 选择 **Developer ID Application**
   - 用于 App Store 外分发的应用签名
5. 点击 Continue，上传步骤 1 生成的 `.certSigningRequest` 文件
6. 下载生成的 `developerID_application.cer` 证书

### 步骤 3：导出 .p12 文件

electron-builder 需要 `.p12` 格式的证书：

1. **双击**下载的 `.cer` 文件，将其导入到钥匙串
2. 打开 **钥匙串访问**
3. 左侧选择 **登录** 钥匙串，分类选择 **我的证书**
4. 找到 `Developer ID Application: Your Name (TEAM_ID)` 证书
5. 点击展开，会看到下面有一个**私钥**
6. 按住 **Cmd** 键，同时选中证书和私钥
7. **右键 → 导出 2 个项目**
8. 保存为 `.p12` 文件（如 `MoryFlow-Developer-ID.p12`）
9. **设置一个强密码**，妥善保存

### 步骤 4：创建 App 专用密码

公证过程需要 App 专用密码进行身份验证：

1. 访问 [appleid.apple.com](https://appleid.apple.com)
2. 使用 Apple ID 登录
3. 进入 **登录与安全** → **App 专用密码**
4. 点击 **生成 App 专用密码**
5. 输入标签名称：`MoryFlow Notarize`
6. 点击创建，**保存生成的密码**（格式如 `xxxx-xxxx-xxxx-xxxx`）

> ⚠️ 此密码只显示一次，请立即保存。如果丢失需要重新生成。

### 步骤 5：获取 Team ID

1. 访问 [developer.apple.com/account/#/membership](https://developer.apple.com/account/#/membership)
2. 找到 **Team ID** 字段
3. 复制这个 10 位字母数字组合

---

## 项目配置

### 创建 entitlements 文件

创建 `apps/moryflow/pc/build/entitlements.mac.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <!-- 允许 JIT 编译（Electron 需要） -->
    <key>com.apple.security.cs.allow-jit</key>
    <true/>

    <!-- 允许未签名的可执行内存（Electron 需要） -->
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>

    <!-- 允许 DYLD 环境变量 -->
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <true/>

    <!-- 允许网络客户端连接 -->
    <key>com.apple.security.network.client</key>
    <true/>

    <!-- 允许网络服务器监听 -->
    <key>com.apple.security.network.server</key>
    <true/>
  </dict>
</plist>
```

### 修改 electron-builder 配置

修改 `apps/moryflow/pc/electron-builder.yml`：

```yaml
appId: com.moryflow.app
productName: MoryFlow

directories:
  output: release/${version}
  buildResources: build

files:
  - dist/**/*
  - package.json
  - node_modules/**/*

# 签名后执行公证
afterSign: scripts/notarize.js

# macOS 配置
mac:
  icon: build/icon.icns
  artifactName: ${productName}-${version}-${arch}.${ext}
  target:
    - target: dmg
      arch:
        - arm64
  category: public.app-category.productivity
  # 启用加固运行时（公证必需）
  hardenedRuntime: true
  gatekeeperAssess: false
  # 权限配置
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  # Deep Link 支持
  extendInfo:
    CFBundleURLTypes:
      - CFBundleURLName: MoryFlow URL
        CFBundleURLSchemes:
          - moryflow

dmg:
  background: build/dmg-background.png
  title: ${productName}
  iconSize: 100
  contents:
    - x: 160
      y: 200
    - x: 500
      y: 200
      type: link
      path: /Applications
  window:
    width: 660
    height: 400

# Windows 配置
win:
  icon: build/icon.ico
  target:
    - nsis
  protocols:
    - name: MoryFlow URL
      schemes:
        - moryflow

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  deleteAppDataOnUninstall: true

# Linux 配置
linux:
  target:
    - AppImage
  category: Utility

# 发布配置
publish:
  - provider: github
    owner: dvlin-dev
    repo: moryflow
    releaseType: release
  - provider: generic
    url: https://download.moryflow.com/${version}
```

### 创建公证脚本

创建 `apps/moryflow/pc/scripts/notarize.js`：

```javascript
/**
 * macOS 应用公证脚本
 * 在签名完成后自动上传到 Apple 进行公证
 */
const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // 仅在 macOS 上执行公证
  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization: not macOS');
    return;
  }

  // 检查必需的环境变量
  if (!process.env.APPLE_ID || !process.env.APPLE_PASSWORD || !process.env.APPLE_TEAM_ID) {
    console.log('Skipping notarization: missing credentials');
    console.log('Required: APPLE_ID, APPLE_PASSWORD, APPLE_TEAM_ID');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`Notarizing ${appPath}...`);

  try {
    await notarize({
      appBundleId: 'com.moryflow.app',
      appPath: appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });
    console.log('Notarization complete!');
  } catch (error) {
    console.error('Notarization failed:', error);
    throw error;
  }
};
```

### 安装依赖

```bash
cd apps/moryflow/pc
pnpm add -D @electron/notarize
```

---

## 本地打包

### 设置环境变量

```bash
# Apple ID 邮箱
export APPLE_ID="your@email.com"

# App 专用密码（不是 Apple ID 密码）
export APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx"

# Team ID
export APPLE_TEAM_ID="XXXXXXXXXX"

# .p12 证书（base64 编码）
export CSC_LINK=$(base64 -i /path/to/MoryFlow-Developer-ID.p12)

# .p12 证书密码
export CSC_KEY_PASSWORD="your-p12-password"
```

### 执行打包

```bash
cd apps/moryflow/pc
pnpm dist:mac
```

打包过程：

1. electron-vite 构建应用
2. electron-builder 打包并签名
3. 自动上传到 Apple 进行公证（约 2-5 分钟）
4. 公证完成后生成 DMG 文件

输出位置：`apps/moryflow/pc/release/{version}/MoryFlow-{version}-arm64.dmg`

---

## GitHub Actions 配置

### 添加 Repository Secrets

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中添加：

| Secret 名称        | 值                    | 说明          |
| ------------------ | --------------------- | ------------- |
| `APPLE_ID`         | `your@email.com`      | Apple ID 邮箱 |
| `APPLE_PASSWORD`   | `xxxx-xxxx-xxxx-xxxx` | App 专用密码  |
| `APPLE_TEAM_ID`    | `XXXXXXXXXX`          | Team ID       |
| `CSC_LINK`         | base64 编码内容       | .p12 证书内容 |
| `CSC_KEY_PASSWORD` | 证书密码              | .p12 文件密码 |

### 生成 CSC_LINK

```bash
# 生成 base64 并复制到剪贴板
base64 -i MoryFlow-Developer-ID.p12 | pbcopy
```

### 修改 CI 配置

修改 `apps/moryflow/pc/.github/workflows/release.yml`：

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build and sign
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
        run: |
          cd apps/moryflow/pc
          pnpm dist:mac

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: MoryFlow-macOS
          path: apps/moryflow/pc/release/**/*.dmg

      - name: Upload to Release
        uses: softprops/action-gh-release@v1
        with:
          files: apps/moryflow/pc/release/**/*.dmg
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 常见问题

### Q: 公证失败，提示 "The software is not signed"

**原因**：证书未正确配置或 `hardenedRuntime` 未启用

**解决**：

1. 确认 `hardenedRuntime: true` 已设置
2. 检查 `CSC_LINK` 和 `CSC_KEY_PASSWORD` 是否正确
3. 验证证书是否有效：
   ```bash
   security find-identity -p codesigning -v
   ```

### Q: 提示 "xcrun: error: unable to find utility altool"

**解决**：

```bash
sudo xcode-select --reset
```

### Q: App 专用密码无效

**原因**：密码可能已过期或输入错误

**解决**：

1. 访问 [appleid.apple.com](https://appleid.apple.com)
2. 撤销旧密码，重新生成新密码

### Q: 公证超时

**原因**：Apple 服务器繁忙或应用体积过大

**解决**：

1. 重试打包命令
2. 检查网络连接
3. Apple 限制每天最多 75 次公证

### Q: 本地打包正常，CI 失败

**检查项**：

1. GitHub Secrets 是否正确设置
2. `CSC_LINK` 是否是完整的 base64 内容（无换行）
3. 确认使用的是 `macos-latest` runner

### Q: 如何验证签名是否成功

```bash
# 检查签名
codesign -dv --verbose=4 /path/to/MoryFlow.app

# 检查公证状态
spctl -a -vv /path/to/MoryFlow.app
```

---

## 证书信息汇总

完成上述流程后，你应该拥有以下信息：

| 项目                          | 来源                     | 用途                  |
| ----------------------------- | ------------------------ | --------------------- |
| Developer ID Application 证书 | Apple Developer 网站     | 签名应用              |
| .p12 文件                     | 钥匙串导出               | electron-builder 使用 |
| .p12 密码                     | 导出时设置               | 解密证书              |
| App 专用密码                  | appleid.apple.com        | 公证身份验证          |
| Team ID                       | Apple Developer 会员页面 | 标识开发团队          |
| Apple ID                      | 你的账号邮箱             | 公证身份验证          |

---

## 参考资料

- [Fastlane Match](https://docs.fastlane.tools/actions/match/) - 自动化证书管理
- [Fastlane Codesigning Guide](https://codesigning.guide/) - 代码签名最佳实践
- [Electron Forge - Signing a macOS app](https://www.electronforge.io/guides/code-signing/code-signing-macos)
- [electron-builder - Code Signing](https://www.electron.build/code-signing)
- [@electron/notarize](https://github.com/electron/notarize)
- [Apple Developer - Notarizing macOS Software](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
