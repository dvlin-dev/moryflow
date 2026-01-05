# MoryFlow 发布指南

## 概述

MoryFlow 使用 GitHub Actions 自动化发布流程，同时发布到：

- **GitHub Releases** (`releases.moryflow.com`) - 海外用户
- **Cloudflare R2** (`2c15b2378d6a15c79459ded5a908974a.r2.cloudflarestorage.com/moryflow-releases`) - 国内加速

## 配置步骤

### 1. GitHub Secrets 配置

在仓库 Settings → Secrets and variables → Actions 中添加以下 Secrets：

| Secret 名称            | 说明                  | 获取方式                           |
| ---------------------- | --------------------- | ---------------------------------- |
| `R2_ACCOUNT_ID`        | Cloudflare Account ID | Cloudflare Dashboard 右侧栏        |
| `R2_ACCESS_KEY_ID`     | R2 API Token ID       | R2 → Manage R2 API Tokens → Create |
| `R2_SECRET_ACCESS_KEY` | R2 API Token Secret   | 创建 Token 时显示（只显示一次）    |

> `GITHUB_TOKEN` 由 GitHub Actions 自动提供，无需手动配置。

### 2. Cloudflare R2 配置

#### 创建 Bucket

```bash
# 安装 wrangler CLI
pnpm add -g wrangler

# 登录 Cloudflare
wrangler login

# 创建 bucket
wrangler r2 bucket create moryflow-releases
```

#### 配置自定义域名 (2c15b2378d6a15c79459ded5a908974a.r2.cloudflarestorage.com/moryflow-releases)

1. 进入 Cloudflare Dashboard → R2 → `moryflow-releases`
2. Settings → Public access → Custom Domains
3. 添加域名: `2c15b2378d6a15c79459ded5a908974a.r2.cloudflarestorage.com/moryflow-releases`
4. 确保该域名的 DNS 已在 Cloudflare 管理

#### 创建 R2 API Token

1. Cloudflare Dashboard → R2 → Overview
2. 点击右上角 "Manage R2 API Tokens"
3. Create API Token
4. 权限选择: `Object Read & Write`
5. 指定 bucket: `moryflow-releases`
6. 保存 `Access Key ID` 和 `Secret Access Key`

### 3. 域名配置

#### releases.moryflow.com (指向 GitHub)

在 DNS 中添加 CNAME 记录：

```
releases.moryflow.com → dvlin-dev.github.io
```

或者使用 Cloudflare 重定向规则将 `releases.moryflow.com/*` 302 重定向到：

```
https://github.com/dvlin-dev/moryflow/releases/$1
```

#### 2c15b2378d6a15c79459ded5a908974a.r2.cloudflarestorage.com/moryflow-releases (指向 R2)

在 R2 bucket 设置中配置自定义域名即可（见上文）。

## 发布流程

### 方式一：使用发布脚本（推荐）

```bash
# 在项目根目录执行
# 发布正式版本
./apps/pc/scripts/release.sh 0.2.0

# 发布预发布版本
./apps/pc/scripts/release.sh 0.2.0-beta.1
```

脚本会自动：

1. 更新 `apps/pc/package.json` 版本号
2. 提交版本更新
3. 创建 Git tag
4. 推送到远程仓库
5. 触发 GitHub Actions 构建

### 方式二：手动触发

1. 进入 GitHub 仓库 → Actions → Release
2. 点击 "Run workflow"
3. 输入版本号（如 `0.2.0`）
4. 点击 "Run workflow"

### 方式三：推送 Tag

```bash
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0
```

## 构建产物

| 平台    | 架构  | 文件                               |
| ------- | ----- | ---------------------------------- |
| macOS   | arm64 | `MoryFlow-x.x.x-arm64.dmg`         |
| Windows | x64   | `MoryFlow-x.x.x-Setup.exe`         |
| Linux   | x64   | `MoryFlow-x.x.x.AppImage` (暂禁用) |

## 下载链接格式

### GitHub Releases

```
https://github.com/dvlin-dev/moryflow/releases/download/v{VERSION}/{FILENAME}
```

### Cloudflare R2

```
https://download.moryflow.com/{VERSION}/{FILENAME}
https://download.moryflow.com/latest/{FILENAME}
```

### Manifest API

```
https://download.moryflow.com/manifest.json
```

返回格式：

```json
{
  "version": "0.2.0",
  "releaseDate": "2025-01-15T10:00:00Z",
  "downloads": {
    "mac-arm64": {
      "filename": "MoryFlow-0.2.0-arm64.dmg",
      "cloudflare": "https://download.moryflow.com/0.2.0/MoryFlow-0.2.0-arm64.dmg",
      "github": "https://github.com/dvlin-dev/moryflow/releases/download/v0.2.0/MoryFlow-0.2.0-arm64.dmg"
    },
    "win-x64": { ... },
    "linux-x64": { ... }
  }
}
```

## 故障排除

### 构建失败

1. 检查 GitHub Actions 日志
2. 确认所有依赖正确安装
3. 本地测试构建：`cd apps/pc && pnpm dist:mac`

### R2 上传失败

1. 检查 Secrets 是否正确配置
2. 确认 R2 API Token 权限
3. 确认 bucket 名称正确

### 版本冲突

如果 tag 已存在：

```bash
# 删除本地 tag
git tag -d v0.2.0

# 删除远程 tag
git push origin :refs/tags/v0.2.0
```

## 成本

| 项目            | 费用                           |
| --------------- | ------------------------------ |
| GitHub Actions  | 免费（公开仓库）               |
| GitHub Releases | 免费                           |
| Cloudflare R2   | 免费（10GB 存储 + 无出站费用） |
| **总计**        | **$0/月**                      |
