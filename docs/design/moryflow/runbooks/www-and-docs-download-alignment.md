---
title: Moryflow WWW / Docs 公开下载口径基线
date: 2026-03-09
scope: moryflow, www, docs, download
status: active
---

<!--
[INPUT]:
- `apps/moryflow/www`、`apps/moryflow/docs` 当前公开下载入口实现
- `apps/moryflow/shared/public-download.ts`
- PC 发布与双通道更新基线

[OUTPUT]:
- 官网与文档站公开下载入口、平台口径、release links 与更新职责分工的稳定事实源

[POS]:
- Runbook：Moryflow WWW / Docs 下载口径与对外说明基线

[PROTOCOL]: 仅在公开平台矩阵、公开 channel、下载入口职责或跨站对齐规则失真时更新本文件。
-->

# Moryflow WWW / Docs 公开下载口径基线

## 1. 目标

对齐以下公开入口的下载说明、平台口径与 release links：

- `www.moryflow.com`
- `www.moryflow.com/download`
- `docs.moryflow.com`

本文只回答当前真相，不保留整改清单或审计时间线。

## 2. 当前公开下载基线

当前对外固定口径：

- 手动下载与 release notes：GitHub Releases
- 客户端自动更新主源：`download.moryflow.com`
- 更新通道：`stable` / `beta`
- 当前公开平台：macOS Apple Silicon、macOS Intel
- Windows 当前只允许写 `coming soon` / `即将恢复`，不得继续承诺可下载

PC 发布与双通道更新的更完整规则，统一参考：

- `docs/design/moryflow/runbooks/pc-release-and-auto-update.md`

## 3. 单一事实源

官网与文档站只允许从以下文件读取当前公开下载事实：

- `apps/moryflow/shared/public-download.ts`

该文件当前承担的职责：

- 当前公开版本号
- 当前公开 channel
- Apple Silicon / Intel Mac 的公开手动下载入口
- GitHub Release / release notes 链接
- 当前不应公开承诺的平台

`www`、`docs` 不得再各自维护：

- 版本号
- 平台列表
- 架构下载直链
- release notes URL

## 4. 对外职责分工

面向用户的下载与更新职责固定分成两层：

### 4.1 GitHub Releases

负责：

- 手动下载安装
- Release notes
- 所有公开版本列表

### 4.2 `download.moryflow.com`

负责：

- 应用内自动更新 feed
- 渠道 manifest
- `electron-updater` 所需元数据与安装包分发

约束：

- 不把 `download.moryflow.com` 当作营销下载页
- 用户可见文案必须明确“网页手动下载”与“应用内自动更新”是两套入口

## 5. WWW 基线

### 5.1 下载页

`/{-$locale}/download` 当前必须满足：

- 只展示两个可下载平台：
  - macOS Apple Silicon
  - macOS Intel
- Windows 只作为 `coming soon` 信息块出现
- 页面同时显示：
  - 当前公开版本
  - 当前 channel
  - release notes 链接
  - all releases 链接
- 页面文案必须解释：
  - 手动下载走 GitHub Releases
  - 应用内自动更新走 `download.moryflow.com`

### 5.2 首页与中段 CTA

首页 Hero 与最终 `DownloadCTA` 必须遵守：

- 不自行硬编码平台矩阵与版本号
- 当前仅暴露公开平台
- Windows 只允许作为 `coming soon` 辅助信息出现
- release notes 链接只能指向 `public-download.ts` 给出的公开 release

### 5.3 站内 Download 入口

Header / Footer / 其他产品页中的 `Download` 导航入口必须统一跳转下载页，不得跳旧直链或历史平台页。

## 6. Docs 基线

文档站中的下载按钮、首页下载块与安装入口必须遵守：

- 平台与版本信息只读 `apps/moryflow/shared/public-download.ts`
- 公开平台仅为 macOS Apple Silicon 与 Intel
- Windows 只允许作为 `coming soon` 说明出现
- 必须同时提供：
  - release notes 链接
  - all releases 链接
  - 自动更新与手动下载的职责分工说明

如果 docs 内新增“下载与更新”专页，该专页应视为 docs 内的说明事实源，但仍不得绕开 `public-download.ts` 维护版本与平台。

## 7. 更新触发条件

当以下任一事实变化时，必须同步检查本文件与公开入口：

1. 当前公开版本变化
2. 当前公开 channel 变化
3. Apple Silicon / Intel / Windows 平台口径变化
4. GitHub Releases 或 `download.moryflow.com` 的职责分工变化

最少同步检查以下文件：

1. `apps/moryflow/shared/public-download.ts`
2. `apps/moryflow/www/src/routes/{-$locale}/download.tsx`
3. `apps/moryflow/www/src/components/landing/DownloadCTA.tsx`
4. `apps/moryflow/docs/src/components/download-buttons.tsx`
5. `docs/design/moryflow/runbooks/pc-release-and-auto-update.md`

## 8. 当前验证基线

当前公开下载口径由以下文件共同锁定：

- `apps/moryflow/shared/public-download.ts`
- `apps/moryflow/shared/manual-download.ts`
- `apps/moryflow/www/src/hooks/useDownload.ts`
- `apps/moryflow/www/src/routes/{-$locale}/download.tsx`
- `apps/moryflow/www/src/components/landing/DownloadCTA.tsx`
- `apps/moryflow/docs/src/components/download-buttons.tsx`
- `docs/design/moryflow/runbooks/pc-release-and-auto-update.md`

后续若再出现“官网 / 文档站 / 发布链路”三方漂移，必须先回到上述文件定位单一事实源，再修改公开入口。
