---
title: Moryflow PC 自动更新（R2-only）
date: 2026-01-22
scope: moryflow/pc
status: active
---

<!--
[INPUT]: Electron 自动更新需求（Windows + macOS Apple Silicon，仅 R2 托管）
[OUTPUT]: 可直接执行的发布与更新 Runbook
[POS]: Moryflow PC 发布/签名/更新手册

[PROTOCOL]: 本文件变更需同步更新 docs/index.md 与 docs/CLAUDE.md。
-->

# Moryflow PC 自动更新（R2-only）Runbook

## 目标与边界

- 目标：后台静默下载更新，下载完成提示用户重启后完成更新。
- 平台：Windows + macOS（仅 Apple Silicon）。
- 托管：仅使用 Cloudflare R2 作为下载源（不使用自建服务器托管安装包）。
- 约束：macOS 自动更新必须完成签名与公证，遵循 `macos-code-signing.md`。

## 方案概述（推荐）

- 构建与更新：`electron-builder` + `electron-updater`。
- 发布源：`generic` provider + R2 公共桶（绑定自定义域名）。
- 更新体验：`autoDownload=true`，`update-downloaded` 事件提示重启。

## R2 存储与访问结构

### 1) Bucket 与域名

- 建议使用独立 bucket，例如 `moryflow-updates`。
- 使用自定义域名（例如 `download.moryflow.com`）接入 R2，便于缓存规则与统一入口。

### 2) 目录结构（建议）

```
/updates/
  /win/
    latest.yml
    Moryflow-Setup-<version>.exe
    Moryflow-Setup-<version>.exe.blockmap
  /mac/
    latest-mac.yml
    Moryflow-<version>-arm64.dmg
    Moryflow-<version>-arm64.zip
    Moryflow-<version>-arm64.dmg.blockmap
    Moryflow-<version>-arm64.zip.blockmap
```

### 3) 缓存策略（Cloudflare Rules）

- 大文件（dmg/exe/zip/blockmap）：强缓存（Cache Everything）。
- 元数据（`latest*.yml`）：禁缓存或短缓存（避免拿到旧版本）。

建议规则（示意）：

- `download.moryflow.com/updates/**` → Cache Everything
- `download.moryflow.com/updates/**/latest*.yml` → Cache Level: Bypass

## Electron 构建配置（最小可用）

> 仅示意，最终配置以 `apps/moryflow/pc` 的实际构建脚本为准。

```json
{
  "build": {
    "publish": {
      "provider": "generic",
      "url": "https://download.moryflow.com/updates"
    },
    "mac": {
      "target": ["dmg", "zip"],
      "arch": ["arm64"]
    },
    "win": {
      "target": ["nsis"],
      "arch": ["x64"]
    }
  }
}
```

注意：

- `generic` provider 不会自动上传产物，需在 CI 中手动上传到 R2。
- Windows 推荐 NSIS（Squirrel 已不作为首选方案）。

## Electron 更新逻辑（最小实现）

```ts
import { autoUpdater } from 'electron-updater';

autoUpdater.autoDownload = true;

autoUpdater.on('update-downloaded', () => {
  // 用户可见提示请使用英文文案
  // e.g. "Update ready. Restart to apply."
  // 用户确认后调用 autoUpdater.quitAndInstall()
});

autoUpdater.checkForUpdatesAndNotify();
```

## 发布流程（R2-only）

### 1) 构建产物

- 生成 Windows 与 macOS 的安装包与 `latest.yml` / `latest-mac.yml`。

### 2) 上传到 R2

示例（使用 AWS CLI S3 兼容 API）：

```bash
aws s3 sync dist/ s3://moryflow-updates/updates/ \
  --endpoint-url https://<r2-endpoint>
```

### 3) 线上验证

- 访问以下 URL 检查可达性：
  - `https://download.moryflow.com/updates/win/latest.yml`
  - `https://download.moryflow.com/updates/mac/latest-mac.yml`
- 验证 `latest*.yml` 指向的文件路径与实际对象一致。

## 版本与回滚

- 自动更新必须使用递增版本号。
- 回滚做法：发布更高版本号并修复问题（不要重发同版本）。

## 灰度发布（可选）

- 通过 `latest*.yml` 的 `stagingPercentage` 控制灰度比例。
- 或按目录拆分（`/stable`、`/beta`）并在客户端指定不同 `publish.url`。

## 常见问题

### Q1：只用 R2 会不会慢？

- 只用 R2 可行，但大陆速度主要依赖 Cloudflare 的缓存与线路质量。
- 通过自定义域名 + Cache Everything + Tiered Cache 可显著改善体验。

### Q2：macOS 为什么必须签名？

- 未签名/未公证将导致更新失败或被系统阻止。
- 具体流程见 `docs/design/moryflow/runbooks/macos-code-signing.md`。

### Q3：Windows 没有签名证书可以吗？

- 可以运行，但用户可能遇到 SmartScreen 警告。
- 建议尽早补齐 Windows 代码签名证书。

## 验证清单（发布前）

- `latest.yml` / `latest-mac.yml` 可访问且路径正确。
- 新版本号递增，签名/公证完成。
- 客户端可完成“静默下载 → 提示重启 → 重启更新”。
