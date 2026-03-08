---
title: Moryflow PC 发布与双通道更新基线
date: 2026-03-08
scope: moryflow, pc, release, updater
status: active
---

<!--
[INPUT]: Moryflow PC 当前 Electron 打包事实；GitHub Releases 发布诉求；stable/beta 双通道；应用内手动更新能力
[OUTPUT]: 统一的发布、分发、签名、更新、灰度与回滚方案
[POS]: Runbook：Moryflow PC 发布与自动更新事实源

[PROTOCOL]: 仅在相关索引、跨文档事实引用或发布/更新契约失真时，才同步更新对应文档。
-->

# Moryflow PC 发布与双通道更新基线

## 目标与范围

- 面向 `apps/moryflow/pc` 建立统一的桌面端发布与更新方案。
- 支持渠道：`stable`、`beta`。
- 支持平台：macOS Apple Silicon、macOS Intel、Windows x64。
- GitHub Releases 作为公开发布页、版本说明与手动下载安装入口。
- `download.moryflow.com` 作为客户端更新主源，承载更新元数据与安装包分发。
- 应用内支持：
  - 自动检查更新
  - 左下角非打扰式提示新版本
  - 用户手动下载更新
  - 下载完成后用户手动重启安装

非目标：

- 当前阶段不包含 Linux 正式发布。
- 当前阶段不做“无提示强制自动下载”。
- 当前阶段不做“稳定版与 Beta 之间自动降级”。

## 当前仓库现状

截至 2026-03-08，仓库已有以下事实：

- PC 端打包由 `electron-builder` 驱动，配置位于 `apps/moryflow/pc/electron-builder.yml`。
- 本地发版入口为 `apps/moryflow/pc/scripts/release.sh`。
- 仓库已经补齐独立 Release workflow：`.github/workflows/release-pc.yml`。
- 主进程已经接入 `electron-updater`，并通过 IPC/preload 暴露 `stable + beta` 更新能力。
- 渲染层已经提供左下角更新入口、General 更新通道设置、About 手动检查/下载/重启安装入口。
- `apps/moryflow/pc/docs/RELEASE.md` 已收口为指向本文的入口页。

这意味着当前状态已经进入“发布流水线 + 客户端更新入口均已落地，剩余主要是生产 secrets 与签名材料配置”的阶段。

## 固定架构

Moryflow PC 的发布与更新固定采用“GitHub Releases 对人、下载域名对客户端”的双源分工：

- GitHub Releases：
  - 官方版本页
  - Release notes
  - 手动下载安装入口
  - Beta/Stable 可见性管理
- `download.moryflow.com`：
  - 客户端轮询的唯一入口
  - 渠道 manifest
  - `electron-updater` 所需 `latest*.yml`
  - 安装包/CDN 缓存/灰度与回滚控制
- Cloudflare + R2：
  - 作为 `download.moryflow.com` 的对象存储与缓存层
  - 承载所有客户端更新资产

固定采用该架构的原因：

- 客户端不直接依赖 GitHub API、Rate Limit 与 Release 页面结构变化。
- 可以在不改 GitHub Release 的情况下单独做灰度、暂停、回滚、封禁版本。
- 国内外下载链路都能统一收敛到自有域名，便于缓存、观测和后续迁移。

## 渠道模型

### Stable

- 默认渠道。
- 面向绝大多数用户。
- 仅接收稳定版本：如 `1.4.0`、`1.4.1`。
- GitHub Release 类型：正式发布，`prerelease=false`。

### Beta

- 用户显式加入后才使用。
- 接收预发布版本：如 `1.5.0-beta.1`、`1.5.0-beta.2`。
- GitHub Release 类型：预发布，`prerelease=true`。
- Beta 用户允许看到高于 Stable 的预发布版本。

### 渠道切换规则

- 新安装默认 `stable`。
- 用户可在设置中切换到 `beta`。
- 从 `beta` 切回 `stable` 后，只影响后续检查来源，不自动降级已安装版本。
- 若当前 Beta 版本号高于 Stable 最新版本，应用显示“当前版本高于 stable channel”，并保留手动去官网重装 stable 的说明入口。

## 版本、Tag 与 Release 规则

### 版本号

- Stable：`x.y.z`
- Beta：`x.y.z-beta.n`

### Git Tag

- Stable：`v1.4.0`
- Beta：`v1.5.0-beta.1`

### GitHub Release 规则

- 每个 tag 对应一个 GitHub Release。
- Stable Release 必须是正式发布。
- Beta Release 必须标记为预发布。
- Release notes 为对外唯一版本说明来源。
- 所有最终产物同时上传到 GitHub Release，便于用户手动下载安装和支持排障。

## 产物策略

### macOS

每个版本都产出两套架构：

- `darwin/arm64`
- `darwin/x64`

每套至少包含：

- `dmg`：给人工下载安装
- `zip`：给 `electron-updater` 使用
- `blockmap`：增量更新支持

当前不使用 `universal` 包。

原因：

- 签名、公证、体积、更新包组织更复杂
- 双架构分离更利于渠道 feed 管理与故障定位

### Windows

- `win32/x64`
- 安装包格式：`NSIS`
- 产物包含：
  - `.exe`
  - `.exe.blockmap`
  - `latest.yml`

### GitHub Release 资产

每次发布必须上传：

- macOS arm64：`dmg`、`zip`、对应 blockmap
- macOS x64：`dmg`、`zip`、对应 blockmap
- Windows x64：`exe`、对应 blockmap

## 下载域名与目录结构

下载域名固定拆成“版本归档”和“渠道入口”两层。

### 1. 版本归档

```text
/releases/
  /v1.4.0/
    /darwin/arm64/...
    /darwin/x64/...
    /win32/x64/...
  /v1.5.0-beta.1/
    /darwin/arm64/...
    /darwin/x64/...
    /win32/x64/...
```

用途：

- 所有安装包、zip、blockmap 的长期归档地址
- `latest*.yml` 直接引用这里的版本化 URL
- 回滚时只需切换 manifest / latest 文件，不需要重传大文件

### 2. 渠道入口

```text
/channels/
  /stable/
    manifest.json
    /darwin/arm64/latest-mac.yml
    /darwin/x64/latest-mac.yml
    /win32/x64/latest.yml
  /beta/
    manifest.json
    /darwin/arm64/latest-mac.yml
    /darwin/x64/latest-mac.yml
    /win32/x64/latest.yml
```

用途：

- 客户端先读 `manifest.json`
- 真正下载时再使用对应平台/架构的 `latest*.yml`

这样比把所有平台塞到同一层目录更稳，因为：

- macOS arm64 / x64 不会互相污染 feed
- stable / beta 不会共享元数据
- 后续接 Linux 或 nightly 也不用改客户端契约

## 客户端更新协议

客户端更新协议固定分成两层：

### 第一层：Moryflow 自定义 manifest

用途：

- 控制左下角 UI
- 返回 release notes 摘要
- 控制灰度、最低支持版本、封禁版本、下载页 fallback
- 决定是否展示 “Download update” / “Restart to update”

固定字段如下：

```json
{
  "channel": "stable",
  "version": "1.4.0",
  "publishedAt": "2026-03-08T10:00:00Z",
  "notesUrl": "https://github.com/dvlin-dev/moryflow/releases/tag/v1.4.0",
  "notesSummary": [
    "Faster workspace startup",
    "Improved cloud sync stability"
  ],
  "rolloutPercentage": 100,
  "minimumSupportedVersion": "1.3.0",
  "blockedVersions": ["1.3.2"],
  "downloads": {
    "darwin-arm64": {
      "feedUrl": "https://download.moryflow.com/channels/stable/darwin/arm64/latest-mac.yml",
      "directUrl": "https://download.moryflow.com/releases/v1.4.0/darwin/arm64/MoryFlow-1.4.0-arm64.dmg"
    },
    "darwin-x64": {
      "feedUrl": "https://download.moryflow.com/channels/stable/darwin/x64/latest-mac.yml",
      "directUrl": "https://download.moryflow.com/releases/v1.4.0/darwin/x64/MoryFlow-1.4.0-x64.dmg"
    },
    "win32-x64": {
      "feedUrl": "https://download.moryflow.com/channels/stable/win32/x64/latest.yml",
      "directUrl": "https://download.moryflow.com/releases/v1.4.0/win32/x64/MoryFlow-1.4.0-Setup.exe"
    }
  }
}
```

### 第二层：`electron-updater` feed

用途：

- 负责包下载、sha512 校验、下载进度、下载完成、重启安装

客户端流程：

1. 启动后读取当前 channel 的 `manifest.json`
2. 根据平台与架构挑选对应 `feedUrl`
3. 若 manifest 判定存在新版本，则更新左下角状态
4. 用户点击 `Download update` 后，再调用 `electron-updater`
5. 下载完成后显示 `Restart to update`

客户端默认策略：

- `autoCheck=true`
- `autoDownload=false`
- `autoInstallOnAppQuit=false`

原因：

- 满足“支持用户手动更新”的产品要求
- 降低大包静默下载带来的带宽与干扰
- 首版体验更可控，问题更好排查

## 应用内更新体验

### 左下角入口

更新入口固定放在工作区左下角状态区域，保持常驻但非打扰：

- 默认：显示当前版本或 `Up to date`
- 有新版本：显示轻提示徽标
- 下载中：显示进度
- 下载完成：显示 `Restart to update`
- 出错：显示 `Update failed`

用户可见文案保持英文，例如：

- `Check for updates`
- `You're up to date`
- `Update available`
- `Download update`
- `Downloading update...`
- `Restart to update`
- `View release notes`
- `Download from browser`

### 交互状态

- `idle`
- `checking`
- `available`
- `downloading`
- `downloaded`
- `error`

### 固定动作

- `Check for updates`
- `Download update`
- `Restart to update`
- `Skip this version`
- `View release notes`
- `Download from browser`

### 设置项

设置页固定提供：

- `Update channel`: `stable | beta`
- `Check for updates automatically`: default `on`
- `Download updates automatically`: default `off`

## 检查频率与通知策略

- 启动后延迟 30-60 秒执行首次检查，避免抢占冷启动资源。
- 应用运行中每 6 小时检查一次。
- 用户手动点击 `Check for updates` 时立即检查。
- 同一版本的“可更新提示”每天最多主动打扰一次；左下角入口常驻可见，不重复弹 toast。
- 对下载完成状态可以允许一次显式 toast，随后收口到左下角状态项。

## 灰度发布

灰度能力作为基线字段保留在 manifest 中：

- `manifest.json` 中保留 `rolloutPercentage`
- 客户端基于稳定设备标识做 hash 分桶
- 只有命中桶的设备才认为该版本可用

这样做的好处：

- 不依赖 `electron-updater` 内部灰度实现细节
- stable 与 beta 都可独立灰度
- 回滚时只需改 manifest，不需要改客户端

## 回滚与事故止血

### 未广泛放量前

- 把 `rolloutPercentage` 调回 `0`
- 或把 manifest 重新指回上一个稳定版本

### 已经发布错误版本后

- 不复用同版本号
- 在 manifest 中把问题版本加入 `blockedVersions`
- 尽快发布更高版本 hotfix

### 客户端兜底

- 当 manifest 声明当前版本在 `blockedVersions` 中时，客户端立即进入强制升级态，不允许跳过当前版本
- 当当前版本低于 `minimumSupportedVersion` 时，客户端立即进入强制升级态，不允许跳过当前版本
- 强制升级态仍保留 release notes 与浏览器下载 fallback，便于用户手动拉起更新

## 签名与安全要求

### macOS

- arm64 与 x64 产物都必须完成 Developer ID 签名
- 两套产物都必须完成 notarization
- `hardenedRuntime` 必须开启
- 详细流程以 `macos-code-signing.md` 为准

### Windows

- 公开发布前必须补齐 Authenticode 代码签名证书
- 未签名版本不得作为正式对外发布基线

### 通用要求

- 客户端只访问 `download.moryflow.com`，不直接携带 GitHub Token
- 所有更新请求仅走 HTTPS
- GitHub Release 上传、R2 上传、manifest 生成都仅在 CI 内执行
- 任何回滚、封禁、最低版本策略都由服务端元数据控制，不内嵌死在客户端

## GitHub Actions 发布流水线

发布必须使用独立 Release workflow，和现有 `CI` 分离。

### 触发条件

- 推送 stable tag：`v*.*.*`
- 推送 beta tag：`v*.*.*-beta.*`
- 保留 `workflow_dispatch` 作为人工补发入口，但版本号固定取 `apps/moryflow/pc/package.json`

### 工作流阶段

1. 解析 package version / tag，识别 channel、version、release type
2. 拉取代码、安装依赖、跑最小发布前校验
3. matrix 构建：
   - macOS arm64
   - macOS x64
   - Windows x64
4. macOS 产物签名、公证、staple
5. 生成 GitHub Release（stable=release，beta=prerelease）
6. 上传全部安装包到 GitHub Release
7. 生成并上传 R2 版本归档目录
8. 生成并上传 channel `manifest.json`
9. 生成并上传各平台 `latest*.yml`
10. 对 `manifest.json` 与 `latest*.yml` 做缓存刷新或旁路缓存策略校验
11. 执行 smoke check
12. 发布完成

### Runner 基线

发布工作流按目标平台分别在原生 runner 构建：

- macOS arm64 runner 构建 arm64
- macOS x64 runner 构建 x64
- Windows x64 runner 构建 x64

- 签名、公证、原生模块、更新包生成都更稳定
- 避免跨架构构建引入额外不确定性

## 缓存策略

`download.moryflow.com` 固定采用分层缓存：

- 版本化安装包、zip、blockmap：长缓存
- `manifest.json`：短缓存或 bypass
- `latest*.yml`：短缓存或 bypass

原则：

- 大文件追求 CDN 命中率
- 控制面元数据追求实时性

## QA 与验收基线

每次正式发版至少验证：

- 全新安装可用
- 从上一个 stable 升级到当前 stable 成功
- 从上一个 beta 升级到当前 beta 成功
- macOS arm64 更新成功
- macOS x64 更新成功
- Windows x64 更新成功
- `Skip this version` 生效
- 更新失败后可回退到浏览器下载
- 左下角状态在 `checking / available / downloading / downloaded / error` 之间切换正确

## 固定结论

Moryflow PC 的发布与更新固定采用以下策略：

- GitHub Releases 是官方发布页和人工下载入口
- `download.moryflow.com` 是客户端唯一更新入口
- stable / beta 独立 manifest、独立 feed、独立发布语义
- 默认自动检查、默认手动下载、默认手动重启安装
- macOS arm64 / x64 分架构构建、签名、公证
- Windows x64 在公开发布前补齐代码签名
- 从第一版起就保留并执行灰度、封禁版本、最低版本门禁字段

这是当前唯一执行口径。

## 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Moryflow PC 落地可对外发布的 GitHub Releases 流水线，以及 stable/beta 双通道的应用内手动更新能力。

**Architecture:** 发布面与客户端更新面分离。GitHub Releases 承担公开版本页与手动下载，`download.moryflow.com` 承担 manifest、`latest*.yml` 与安装包分发；客户端通过主进程更新服务统一管理检查、下载、重启安装与状态广播。

**Tech Stack:** Electron 31、electron-builder、electron-updater、GitHub Actions、Cloudflare R2、Electron IPC、React、Zustand、Vitest。

---

### Task 1: 建立 Release Workflow 与发布 secrets 基线

**Files:**
- Create: `.github/workflows/release-pc.yml`
- Modify: `apps/moryflow/pc/scripts/release.sh`
- Modify: `apps/moryflow/pc/package.json`
- Modify: `docs/design/moryflow/runbooks/macos-code-signing.md`

**Step 1: 新建 PC 独立发布工作流**

目标：

- 仅处理 `v*.*.*` 与 `v*.*.*-beta.*` tag
- 与现有 `CI` 工作流分离
- 支持 `workflow_dispatch`

工作流最少包含：

1. 解析 tag，识别 `channel=stable|beta`
2. 安装依赖并执行最小发布前校验
3. matrix 构建 `macOS arm64`、`macOS x64`、`Windows x64`
4. 上传 GitHub Release 资产
5. 上传 `download.moryflow.com` 所需元数据与安装包
6. 执行 smoke check

**Step 2: 收紧 `release.sh` 输出与帮助信息**

保留现有版本 bump/tag 入口，但输出必须明确：

- stable 与 beta tag 格式
- 触发的 workflow 名称
- 发布后的两个固定入口：
  - GitHub Releases
  - `download.moryflow.com`

不在脚本里增加发布逻辑；脚本只负责准备版本并触发 CI。

**Step 3: 补齐发布期环境变量约定**

在 workflow 注释与 runbook 中固定以下 secrets/vars：

- GitHub：`GITHUB_TOKEN`
- R2：`R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET`
- macOS signing/notarization：`CSC_LINK`、`CSC_KEY_PASSWORD`、`APPLE_API_KEY`、`APPLE_API_KEY_ID`、`APPLE_API_ISSUER`
- Windows signing：`WIN_CSC_LINK`、`WIN_CSC_KEY_PASSWORD`
- 更新分发域名：`MORYFLOW_UPDATE_BASE_URL=https://download.moryflow.com`

**Step 4: 验证 workflow 可被解析**

Run:

```bash
git diff -- .github/workflows/release-pc.yml apps/moryflow/pc/scripts/release.sh apps/moryflow/pc/package.json
```

Expected:

- diff 只包含 PC release 相关文件
- tag 触发条件与 matrix 平台完整

### Task 2: 固化 electron-builder 产物与签名配置

**Files:**
- Modify: `apps/moryflow/pc/electron-builder.yml`
- Create: `apps/moryflow/pc/build/entitlements.mac.plist`
- Modify: `docs/design/moryflow/runbooks/macos-code-signing.md`

**Step 1: 调整 macOS 产物矩阵**

`electron-builder.yml` 固定为：

- macOS 产出 `dmg + zip`
- macOS 同时支持 `arm64 + x64`
- Windows 使用 `nsis`
- Linux 不进入正式发布矩阵

**Step 2: 打开 macOS notarization 前置条件**

在 `electron-builder.yml` 中：

- `hardenedRuntime: true`
- 引入 `build/entitlements.mac.plist`
- 保持 `appId` 与产物命名规则稳定

**Step 3: 移除与新分发结构冲突的旧 publish 假设**

不要继续依赖当前静态 `${version}` 目录式 publish 配置作为最终事实源。发布 workflow 应明确接管：

- GitHub Release 上传
- R2 版本归档上传
- channel `latest*.yml` 上传

`electron-builder` 只负责生成产物与更新元数据，不负责发布策略。

**Step 4: 本地验证构建配置可用**

Run:

```bash
cd apps/moryflow/pc
pnpm build
pnpm exec electron-builder --mac --dir
pnpm exec electron-builder --win --dir
```

Expected:

- 配置解析成功
- 不出现缺失 target 或非法 publish 配置错误

### Task 3: 落地更新元数据生成与上传工具

**Files:**
- Create: `apps/moryflow/pc/scripts/prepare-release-artifacts.ts`
- Create: `apps/moryflow/pc/scripts/smoke-check-update-feed.ts`
- Modify: `apps/moryflow/pc/package.json`

**Step 1: 编写 release 资产整理脚本**

`prepare-release-artifacts.ts` 负责：

1. 从构建产物目录读取：
   - macOS arm64 / x64 `dmg`、`zip`、`blockmap`
   - Windows x64 `exe`、`blockmap`
   - `latest.yml` / `latest-mac.yml`
2. 解析 tag 与 channel
3. 生成版本归档目录结构：
   - `/releases/vX.Y.Z/darwin/arm64/...`
   - `/releases/vX.Y.Z/darwin/x64/...`
   - `/releases/vX.Y.Z/win32/x64/...`
4. 生成 channel 入口：
   - `/channels/stable/...`
   - `/channels/beta/...`
5. 生成固定结构的 `manifest.json`

**Step 2: 让脚本覆盖双通道与三平台组合**

脚本必须显式处理：

- stable 正式版
- beta 预发布
- macOS arm64
- macOS x64
- Windows x64

不允许从文件名“猜一个大概平台”；必须基于明确规则解析。

**Step 3: 编写 smoke-check 脚本**

`smoke-check-update-feed.ts` 至少校验：

- `manifest.json` 可解析
- `downloads` 中 3 个目标存在
- 各平台 `feedUrl` 与 `directUrl` 都是 HTTPS
- `latest*.yml` 可下载
- `latest*.yml` 中 version 与 tag 一致

**Step 4: 把脚本注册到 package scripts**

在 `apps/moryflow/pc/package.json` 中新增：

- `release:prepare-assets`
- `release:smoke-check`

**Step 5: 本地验证脚本参数与输出**

Run:

```bash
cd apps/moryflow/pc
pnpm exec tsx scripts/prepare-release-artifacts.ts --help
pnpm exec tsx scripts/smoke-check-update-feed.ts --help
```

Expected:

- CLI 帮助可用
- 参数中包含 `--version`、`--channel`、`--base-url`、`--input-dir` 等必要选项

### Task 4: 落地主进程更新服务与 IPC 合同

**Files:**
- Add File: `apps/moryflow/pc/src/shared/ipc/app-update.ts`
- Modify: `apps/moryflow/pc/src/shared/ipc/desktop-api.ts`
- Modify: `apps/moryflow/pc/src/shared/ipc/app-runtime.ts`
- Add File: `apps/moryflow/pc/src/main/app/update-service.ts`
- Add File: `apps/moryflow/pc/src/main/app/update-service.test.ts`
- Modify: `apps/moryflow/pc/src/main/app/app-runtime-settings.ts`
- Modify: `apps/moryflow/pc/src/main/app/ipc-handlers.ts`
- Modify: `apps/moryflow/pc/src/main/index.ts`
- Modify: `apps/moryflow/pc/src/preload/index.ts`
- Modify: `apps/moryflow/pc/src/preload/index.test.ts`

**Step 1: 设计更新 IPC 合同**

新增 `app-update.ts`，定义：

- `UpdateChannel = 'stable' | 'beta'`
- `UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'`
- 更新快照结构
- 更新设置结构
- 手动动作输入：
  - `checkForUpdates`
  - `downloadUpdate`
  - `restartToInstall`
  - `skipVersion`
  - `openReleaseNotes`
  - `openDownloadPage`

**Step 2: 扩展运行时设置存储**

在 `app-runtime-settings.ts` 中新增持久化字段：

- `updateChannel`
- `autoCheckForUpdates`
- `autoDownloadUpdates`
- `skippedUpdateVersion`
- `lastUpdateCheckAt`

要求：

- 新安装默认 `stable`
- 默认 `autoCheckForUpdates=true`
- 默认 `autoDownloadUpdates=false`

**Step 3: 实现主进程更新服务**

`update-service.ts` 负责：

1. 拉取 channel `manifest.json`
2. 根据平台/架构选取正确 feed
3. 接入 `electron-updater`
4. 统一管理下载状态、错误、下载进度、下载完成
5. 广播状态到渲染进程
6. 提供定时轮询与手动触发入口

要求：

- 启动后延迟首次检查
- 不在应用冷启动最早阶段阻塞主线程
- 手动下载与自动检查解耦

**Step 4: 接入主进程生命周期**

在 `src/main/index.ts` 中初始化更新服务，并在主窗口可用后启动：

- 首次延迟检查
- 定时检查
- 应用退出前安全清理监听器

**Step 5: 暴露 preload API**

在 `desktop-api.ts` / `preload/index.ts` 中新增 `updates` 命名空间，而不是把更新接口继续堆进 `appRuntime`：

- `getState`
- `getSettings`
- `setChannel`
- `setAutoCheck`
- `setAutoDownload`
- `checkForUpdates`
- `downloadUpdate`
- `restartToInstall`
- `skipVersion`
- `openReleaseNotes`
- `openDownloadPage`
- `onStateChange`

**Step 6: 先写测试再实现**

先补：

- `src/main/app/update-service.test.ts`
- `src/preload/index.test.ts`

覆盖：

- channel 选择
- manifest 解析
- feed 路由
- `autoDownload=false` 时不会自动拉包
- 下载完成后状态切到 `downloaded`

**Step 7: 运行测试**

Run:

```bash
cd apps/moryflow/pc
pnpm exec vitest run src/main/app/update-service.test.ts src/preload/index.test.ts
```

Expected:

- 新增更新服务与 preload API 测试通过

### Task 5: 落地左下角更新入口与侧栏状态

**Files:**
- Add File: `apps/moryflow/pc/src/renderer/hooks/use-app-update.ts`
- Add File: `apps/moryflow/pc/src/renderer/hooks/use-app-update.test.tsx`
- Add File: `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/update-status-card.tsx`
- Add File: `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/update-status-card.test.tsx`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/sidebar/index.tsx`

**Step 1: 新建渲染层更新 hook**

`use-app-update.ts` 负责：

- 拉取初始更新状态
- 订阅主进程状态广播
- 包装按钮动作
- 合并 loading / error / progress 展示态

**Step 2: 新建左下角状态组件**

`update-status-card.tsx` 固定展示：

- 当前状态
- 版本号
- `Check for updates`
- `Download update`
- `Restart to update`
- `View release notes`
- `Download from browser`

要求：

- 文案使用英文
- 非打扰式常驻
- `available`、`downloading`、`downloaded` 三个状态必须清晰可辨

**Step 3: 接入 Sidebar 底部区域**

在 `sidebar/index.tsx` 中，将更新状态组件放在底部主操作上方，保证：

- 不影响现有 `New chat` 主按钮
- 不被 `PublishDialog`、模块导航或文件树滚动吞掉

**Step 4: 为 hook 与组件补测试**

覆盖：

- 初始 `idle`
- 可更新态按钮切换
- 下载进度显示
- 下载完成显示 `Restart to update`
- error fallback 到浏览器下载

**Step 5: 运行测试**

Run:

```bash
cd apps/moryflow/pc
pnpm exec vitest run src/renderer/hooks/use-app-update.test.tsx src/renderer/workspace/components/sidebar/components/update-status-card.test.tsx
```

Expected:

- hook 与左下角组件测试通过

### Task 6: 落地设置页与 About 页更新控制

**Files:**
- Modify: `apps/moryflow/pc/src/renderer/components/settings-dialog/components/general-section.tsx`
- Modify: `apps/moryflow/pc/src/renderer/components/settings-dialog/components/general-section.test.tsx`
- Modify: `apps/moryflow/pc/src/renderer/components/settings-dialog/components/about-section.tsx`
- Modify: `apps/moryflow/pc/src/renderer/components/settings-dialog/components/section-content.tsx`

**Step 1: 在 General Section 增加更新设置块**

直接复用现有 runtime-settings 模式，不把更新设置塞进 AgentSettings 表单。

新增控件：

- `Update channel`
- `Check for updates automatically`
- `Download updates automatically`

要求：

- 读取/写入 `window.desktopAPI.updates.*`
- 更新失败时使用现有 toast 模式提示

**Step 2: 在 About Section 增加版本与动作**

保留当前版本展示，并新增：

- `Check for updates`
- `View release notes`
- `Download from browser`

如果存在新版本，在 About 页面同步展示：

- 最新版本号
- 当前状态

**Step 3: 为 General / About 视图补测试**

优先补 `general-section.test.tsx`；如果 About 区块逻辑明显增多，则新增：

- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/about-section.test.tsx`

**Step 4: 运行测试**

Run:

```bash
cd apps/moryflow/pc
pnpm exec vitest run src/renderer/components/settings-dialog/components/general-section.test.tsx
```

Expected:

- channel 切换
- auto-check / auto-download 开关
- 手动检查动作

### Task 7: 端到端联调、发布冒烟与文档收口

**Files:**
- Modify: `docs/design/moryflow/runbooks/macos-code-signing.md`
- Modify: `docs/design/moryflow/runbooks/pc-release-and-auto-update.md`
- Modify: `apps/moryflow/pc/docs/RELEASE.md`
- Optional Create: `apps/moryflow/pc/tests/update-flow.spec.ts`

**Step 1: 本地静态验证**

Run:

```bash
cd apps/moryflow/pc
pnpm typecheck
pnpm build
pnpm exec vitest run
```

Expected:

- 类型检查通过
- 渲染/主进程测试通过
- 构建无新增发布相关错误

**Step 2: 本地产物验证**

Run:

```bash
cd apps/moryflow/pc
pnpm dist:mac
pnpm dist:win
```

Expected:

- 产出 `dmg + zip + blockmap`
- 产出 `exe + blockmap + latest.yml`

**Step 3: 发布前 smoke checklist**

实际推 tag 前，至少确认：

1. GitHub Release 页面能区分 stable / beta
2. `manifest.json` 指向正确平台资产
3. `latest-mac.yml` 同时覆盖 `darwin/arm64` 与 `darwin/x64`
4. `latest.yml` 指向 Windows x64 NSIS 包
5. macOS 签名/公证完成
6. Windows 签名已生效
7. 左下角状态能完成 `check -> available -> downloading -> downloaded`

**Step 4: 首次线上验证**

按以下顺序执行：

1. 先发 `beta`
2. 在 3 台机器验证：
   - macOS arm64
   - macOS x64
   - Windows x64
3. 确认应用内手动更新成功
4. 再发首个 `stable`

**Step 5: 文档最终收口**

实现完成后，只保留：

- 本 runbook 作为发布/更新事实源
- `macos-code-signing.md` 作为签名公证事实源
- `apps/moryflow/pc/docs/RELEASE.md` 继续只做跳转页，不再恢复旧说明
