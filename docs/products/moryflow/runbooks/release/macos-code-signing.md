---
title: macOS 桌面端代码签名指南
date: 2026-01-12
scope: moryflow, pc, release
status: draft
---

<!--
[INPUT]: Apple Developer 证书；electron-builder；公证流程；CI 配置
[OUTPUT]: 可照做的代码签名与公证步骤（Moryflow PC）
[POS]: Runbook：Moryflow 桌面端发布（macOS）

[PROTOCOL]: 本文件变更时同步更新 `docs/products/moryflow/index.md`（索引）。
-->

# macOS 桌面端代码签名指南

本文档提供 MoryFlow 桌面端（apps/moryflow/pc）在 macOS 上的代码签名和公证流程，使打包后的应用不会显示"无法验证开发者"警告。

## 目录

- [前置要求](#前置要求)
- [方式选择](#方式选择)
- [方式一：Fastlane Match 自动化（推荐）](#方式一fastlane-match-自动化推荐)
  - [安装 Fastlane](#安装-fastlane)
  - [初始化 Match](#初始化-match)
  - [创建证书](#创建证书)
  - [清除旧证书重新申请](#清除旧证书重新申请)
  - [集成到构建流程](#集成到构建流程)
  - [CI 环境配置](#ci-环境配置)
- [方式二：手动申请证书](#方式二手动申请证书)
  - [步骤 1：创建证书签名请求](#步骤-1创建证书签名请求)
  - [步骤 2：创建 Developer ID 证书](#步骤-2创建-developer-id-证书)
  - [步骤 3：导出 .p12 文件](#步骤-3导出-p12-文件)
  - [步骤 4：创建 App 专用密码](#步骤-4创建-app-专用密码)
  - [步骤 5：获取 Team ID](#步骤-5获取-team-id)
- [项目配置](#项目配置)
  - [创建 entitlements 文件](#创建-entitlements-文件)
  - [修改 electron-builder 配置](#修改-electron-builder-配置)
  - [创建公证脚本](#创建公证脚本)
  - [安装依赖](#安装依赖)
- [本地打包](#本地打包)
- [GitHub Actions 配置](#github-actions-配置)
- [常见问题](#常见问题)

---

## 前置要求

### 必需条件

| 项目                 | 说明                                 |
| -------------------- | ------------------------------------ |
| Apple Developer 账号 | $99/年，用于获取代码签名证书         |
| macOS 系统           | 用于创建证书签名请求和导出 .p12 文件 |
| Xcode                | 安装命令行工具，公证需要             |

### 安装 Xcode 命令行工具

```bash
xcode-select --install
```

如遇到 `xcrun: error: unable to find utility "altool"` 错误：

```bash
sudo xcode-select --reset
```

---

## 方式选择

macOS 代码签名有两种方式：

| 方式               | 优点                           | 缺点                   | 推荐场景           |
| ------------------ | ------------------------------ | ---------------------- | ------------------ |
| **Fastlane Match** | 全自动、团队共享、证书统一管理 | 需要额外配置 Git 仓库  | 团队协作、CI/CD    |
| **手动申请**       | 简单直接、无额外依赖           | 手动操作、证书不易共享 | 个人开发、快速上手 |

---

## 方式一：Fastlane Match 自动化（推荐）

Fastlane Match 可以自动在 Apple Developer 申请证书，并安全存储到 Git 仓库，类似 Expo 的 EAS Credentials。

### 安装 Fastlane

```bash
# 使用 Homebrew 安装
brew install fastlane

# 或使用 gem
sudo gem install fastlane
```

### 初始化 Match

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
