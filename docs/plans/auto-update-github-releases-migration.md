---
title: 自动更新与下载统一迁移到 GitHub Releases
scope: moryflow, pc, www, release, updater
status: draft
---

# 自动更新与下载统一迁移到 GitHub Releases

## 动机

当前自动更新依赖 Cloudflare R2（`download.moryflow.com`）托管自定义 `manifest.json` 和按 arch 拆分的 `latest-mac.yml`。同时 GitHub Releases 存放同一批产物。这导致：

1. **双写**：CI 同时上传 GitHub Releases + R2；`prepare-release-artifacts.ts` 需生成 manifest 并改写 yml 中的 URL
2. **自定义中间层**：`update-service.ts` 先 fetch manifest → 解析 target → prime feed URL → 再调 `checkForUpdates()`；多出 ~300 行逻辑
3. **R2 运维**：bucket + DNS + AWS CLI secrets + cache-control 策略
4. **源不一致**：update-service 读 R2，www latest-release API 读 GitHub Releases，两个源可能不同步

`electron-updater` 原生支持 `github` provider，可直接通过 GitHub API 获取 release 并解析 `latest-mac.yml`，无需任何自定义分发层。参考 claude-code-debug 项目验证可行。

## 目标

- GitHub Releases 作为下载和自动更新的**唯一源**
- 移除 R2 分发（bucket / upload / manifest.json / URL 改写 / feed 校验脚本）
- `electron-updater` 直接使用 `github` provider
- 重写 `update-service.ts`，基于 electron-updater 事件驱动而非自定义 manifest
- 简化 CI workflow

## 非目标

- 不改变 code signing / notarization 流程
- 不新增 Windows/Linux 平台（后续独立处理）

---

## 更新策略（综合最佳实践）

综合 claude-code-debug（薄服务、事件驱动、deferred promise、toast 通知）与 Moryflow 当前实现（定时检查、双通道、skip version、sidebar 持久入口）的优点，定义以下策略。

### 单通道策略

只保留一个更新通道，不区分 stable / beta。所有发布都是正式发布，GitHub Release 不标记 prerelease。electron-updater 使用默认 channel（`latest`），始终读取 `latest-mac.yml`。

移除的概念：`UpdateChannel` 类型、`channel` 字段、`setChannel` IPC、Settings 中的 channel 选择器、beta-mac.yml、CI 中的 channel 检测与 beta tag 处理。

### 检查策略

| 参数 | 值 | 说明 |
|------|-----|------|
| 启动延迟 | 20s | 避免阻塞首屏渲染 |
| 定时间隔 | 6h | 后台静默检查，无打扰 |
| 用户手动检查 | 随时 | Settings → About 手动触发，无频率限制 |

定时检查为**静默检查**：如果发现的新版本已被 skip，不改变 UI 状态（不弹 toast、不显示 sidebar card）。手动检查为**交互式检查**：忽略 skip，始终展示结果。

### 下载策略

| 参数 | 值 | 说明 |
|------|-----|------|
| autoDownload | 默认 ON，用户可在 Settings 关闭 | 检查到更新后自动静默下载 |
| autoInstallOnAppQuit | OFF（硬编码） | 不在退出时静默安装 |

**autoDownload = ON（默认）**：检查到更新后立即进入 `downloading`，`available` 是瞬态，用户通常只看到下载进度或 "ready to install"。

**autoDownload = OFF**：检查到更新后停在 `available` 状态，sidebar card 显示 Download 按钮，toast 弹出 "{version} is available" 带 Download action，等用户手动触发。

### 安装策略

下载完成后进入 `downloaded` 状态，**不自动重启**。用户在准备好时点击 Restart to install（sidebar card + toast 均提供入口），调用 `updater.quitAndInstall()`。

理由：自动安装会中断用户工作流（编辑中的笔记、进行中的对话），桌面端生产力工具必须由用户控制安装时机。

### Skip version

- 用户在 sidebar card 中可以 skip 当前展示的版本
- skip 后该版本在**静默检查**中不再触发 UI 状态变更
- **手动检查**忽略 skip，始终展示

### 通知策略（结合两者优点）

**Sidebar card**（保留自 Moryflow）：
- 状态为 `available` / `downloading` / `downloaded` 时在左侧栏底部显示
- `available`（仅 autoDownload OFF 时停留）：显示 Download / Skip 按钮
- `downloading`：显示进度百分比
- `downloaded`：提供 Restart to install / Skip 操作
- 持久可见，不会因为用户忽略而消失

**Toast 通知**（新增，学习自 claude-code-debug）：
- `available`（仅 autoDownload OFF 时触发）→ info toast："{version} is available"，带 Download action
- `downloaded` → success toast："{version} is ready to install"，带 Restart action
- `error` → error toast：显示错误信息
- 使用 signature 去重（`status:version:message` 组合），避免重复弹出

两种通知互补：toast 在用户不看侧栏时提供即时感知，sidebar card 在用户忽略 toast 后提供持久入口。

### 状态模型

```typescript
type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

type AppUpdateState = {
  status: UpdateStatus;
  currentVersion: string;
  availableVersion: string | null;     // update-available 事件中获取
  downloadedVersion: string | null;    // update-downloaded 事件中获取
  releaseNotesUrl: string | null;      // 从版本号构建 GitHub release URL
  errorMessage: string | null;
  downloadProgress: AppUpdateProgress | null;
  lastCheckedAt: string | null;
};
```

8 个字段。对比 claude-code-debug 的 6 字段，多出 `downloadedVersion`、`releaseNotesUrl`、`downloadProgress`（claude-code-debug 只有一个 `downloadPercent: number`，Moryflow 保留含 transferred/total/bytesPerSecond 的 progress 对象）。

对比当前 Moryflow 的 17 字段，砍掉 9 个：`latestVersion`、`channel`、`downloadUrl`、`notesSummary`、`minimumSupportedVersion`、`blockedVersions`、`requiresImmediateUpdate`、`currentVersionBlocked`。

### 服务架构

学习 claude-code-debug 的 **deferred promise + 事件驱动** 模式：

```
┌─────────────────────────────────────────────────────────┐
│  update-service（事件驱动，~200 行）                       │
│                                                         │
│  checkForUpdates()                                      │
│    → 创建 checkDeferred                                 │
│    → updater.checkForUpdates()                          │
│    → 返回 checkDeferred.promise                         │
│    → 事件触发时 resolve                                  │
│                                                         │
│  事件监听:                                               │
│    update-available    → resolve check / setState        │
│    update-not-available → resolve check / setState       │
│    download-progress   → setState                       │
│    update-downloaded   → resolve download / setState     │
│    error               → resolve both / setState         │
│                                                         │
│  定时检查:                                               │
│    scheduleAutomaticChecks(20s, 6h)                     │
│    → 每次静默调用 checkForUpdates({ interactive: false })│
│    → skip version 逻辑在 update-available handler 中处理 │
└─────────────────────────────────────────────────────────┘
```

与 claude-code-debug 的核心差异：
1. 多了 `scheduleAutomaticChecks`（定时检查 20s + 6h）
2. 多了 `skipVersion`（静默检查跳过已 skip 的版本）
3. `downloadProgress` 更丰富（含 transferred/total/bytesPerSecond）

与当前 Moryflow 的核心差异：
1. 去掉 manifest fetch + feed URL prime 中间层
2. 去掉 channel / rollout / blocked / minimumSupported / autoCheck
3. autoDownload 默认 ON（当前默认 OFF）
4. 事件驱动 + deferred promise 替代手动状态编排
5. 代码量从 ~825 行降到 ~200 行

---

## 一、electron-builder.yml

```yaml
# before
publish:
  - provider: generic
    url: https://download.moryflow.com

# after
publish:
  - provider: github
    owner: dvlin-dev
    repo: moryflow
```

electron-builder 构建后自动生成 `latest-mac.yml`，该文件作为 release asset 上传后，`electron-updater` 的 GitHub provider 会通过 GitHub API (`api.github.com/repos/{owner}/{repo}/releases`) 定位 latest release 并下载 `latest-mac.yml`。

version 格式只允许 `x.y.z`（不含 prerelease 后缀），确保 electron-builder 始终生成 `latest-mac.yml`。

## 二、多 arch latest-mac.yml 合并

当前 arm64 和 x64 分别在不同 runner 构建，各自生成独立的 `latest-mac.yml`。GitHub Release 上只能有一个 `latest-mac.yml`，必须包含两个 arch 的 `files` 条目。

electron-builder 生成的单 arch yml 结构：

```yaml
version: 0.3.0
files:
  - url: MoryFlow-0.3.0-arm64.zip
    sha512: <hash>
    size: 12345
  - url: MoryFlow-0.3.0-arm64.dmg
    sha512: <hash>
    size: 67890
path: MoryFlow-0.3.0-arm64.zip
sha512: <hash>
releaseDate: '2026-03-15T10:00:00.000Z'
```

合并后：

```yaml
version: 0.3.0
files:
  - url: MoryFlow-0.3.0-arm64.zip
    sha512: <hash-arm64-zip>
    size: 12345
  - url: MoryFlow-0.3.0-arm64.dmg
    sha512: <hash-arm64-dmg>
    size: 67890
  - url: MoryFlow-0.3.0-x64.zip
    sha512: <hash-x64-zip>
    size: 23456
  - url: MoryFlow-0.3.0-x64.dmg
    sha512: <hash-x64-dmg>
    size: 78901
path: MoryFlow-0.3.0-arm64.zip
sha512: <hash-arm64-zip>
releaseDate: '2026-03-15T10:00:00.000Z'
```

`electron-updater` 根据当前 `process.arch` 匹配文件名中的 arch 后缀，自动选择正确的条目下载。

**新增脚本** `scripts/merge-update-yml.ts`：

- 输入：两个 arch 目录（`.artifacts/darwin-arm64`、`.artifacts/darwin-x64`）和 yml 文件名（固定 `latest-mac.yml`）
- 逻辑：解析两个 yml，合并 `files` 数组，`path` / `sha512` 取 arm64 zip（electron-updater 用 `files` 匹配，`path` 只是 fallback），`version` / `releaseDate` 取任一
- 输出：合并后的 yml 写入指定目录
- 包含单元测试覆盖合并逻辑

## 三、update-service.ts 重写

### 当前架构（移除）

```
checkForUpdates()
  → fetchManifest(baseUrl, channel)         ← 自定义 manifest.json
  → resolveTarget(manifest, platform, arch) ← 手动选 arch
  → ensureUpdaterFeedPrimed(target)         ← setFeedURL + checkForUpdates
  → 读 manifest 字段设置 state             ← version/notesSummary/rollout/blocked
```

### 新架构（事件驱动）

```
checkForUpdates()
  → updater.checkForUpdates()
  → electron-updater 自动:
      1. 调 GitHub API 获取 latest release
      2. 下载 latest-mac.yml
      3. 按 process.arch 匹配 files 条目
      4. 发射事件

事件处理:
  update-available    → setState({ status: 'available', availableVersion: info.version })
  update-not-available → setState({ status: 'idle' })
  download-progress   → setState({ status: 'downloading', downloadProgress })
  update-downloaded   → setState({ status: 'downloaded', downloadedVersion })
  error               → setState({ status: 'error', errorMessage })
```

### 移除的概念

| 概念 | 原因 |
|------|------|
| `AppUpdateManifest` | 不再需要自定义 manifest.json |
| `AppUpdateDownloadTarget` / `feedUrl` / `directUrl` | electron-updater github provider 内部处理 |
| `ensureUpdaterFeedPrimed` / `primedTargetKey` / `setFeedURL` | 不再动态切换 feed |
| `fetchManifest` / `defaultFetchManifest` | 不再 fetch manifest |
| `rolloutPercentage` / `rolloutId` / `isRolloutEligible` / `hashRolloutBucket` | 灰度用 GitHub Release draft 替代 |
| `blockedVersions` / `minimumSupportedVersion` / `requiresImmediateUpdate` / `currentVersionBlocked` | 过度设计，无实际场景 |
| `UpdateChannel` / `channel` / `setChannel` / `getStoredChannel` / `setStoredChannel` | 单通道，不需要 |
| `autoCheck` / `getAutoCheckEnabled` / `setAutoCheckEnabled` | 始终自动检查，不提供关闭配置 |
| `updateBaseUrl` / `DEFAULT_UPDATE_BASE_URL` | 不再需要 |
| `notesSummary` | 直接链接到 GitHub release page |
| `latestVersion` | 与 `availableVersion` 语义重叠 |
| `downloadUrl` | 不再暴露直接下载链接 |

### 保留的核心能力

- 定时自动检查（启动 20s 延迟 + 6h 间隔）
- 自动下载（检查到更新后静默下载，用户只需点 Restart）
- 手动检查（交互式，忽略 skip）/ 手动重启安装
- skip version（静默检查跳过，手动检查不跳过）
- 事件驱动 + deferred promise（学习 claude-code-debug）
- 状态机 + 事件广播到 renderer
- Sidebar card + Toast 双通知（结合两个项目的优点）

### UpdaterLike 接口

与 claude-code-debug 完全一致：

```typescript
interface UpdaterLike {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  on: (event: string, listener: (payload?: unknown) => void) => UpdaterLike;
  removeListener: (event: string, listener: (payload?: unknown) => void) => UpdaterLike;
  checkForUpdates: () => Promise<unknown>;
  downloadUpdate: () => Promise<unknown>;
  quitAndInstall: () => void;
}
```

移除 `setFeedURL`（R2 时代产物）和 `channel`（单通道不需要）。

### CreateUpdateServiceOptions

```typescript
type CreateUpdateServiceOptions = {
  currentVersion: string;
  platform?: NodeJS.Platform;
  isPackaged?: boolean;
  getAutoDownloadEnabled: () => boolean;
  setAutoDownloadEnabled: (enabled: boolean) => void;
  getSkippedVersion: () => string | null;
  setSkippedVersion: (version: string | null) => void;
  getLastCheckAt: () => string | null;
  setLastCheckAt: (value: string | null) => void;
  updater?: UpdaterLike;
  scheduleTimeout?: (callback: () => void, delayMs: number) => TimerLike;
  clearScheduledTimeout?: (timer: TimerLike | null) => void;
};
```

对比当前 Moryflow 的 16 个选项字段，砍到 11 个。移除：`arch`、`updateBaseUrl`、`fetchManifest`、`getRolloutId`、`getStoredChannel`/`setStoredChannel`、`getAutoCheckEnabled`/`setAutoCheckEnabled`。

保留 `scheduleTimeout` / `clearScheduledTimeout` 注入以维持测试可控性。

## 四、IPC 类型变更

### app-update.ts

```typescript
// 删除 UpdateChannel
// 删除 AppUpdateDownloadTarget
// 删除 AppUpdateManifest

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export type AppUpdateProgress = {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
};

export type AppUpdateSettings = {
  autoDownload: boolean;
  skippedVersion: string | null;
  lastCheckAt: string | null;
};

export type AppUpdateState = {
  status: UpdateStatus;
  currentVersion: string;
  availableVersion: string | null;
  downloadedVersion: string | null;
  releaseNotesUrl: string | null;
  errorMessage: string | null;
  downloadProgress: AppUpdateProgress | null;
  lastCheckedAt: string | null;
};

export type AppUpdateStateChangeEvent = {
  state: AppUpdateState;
  settings: AppUpdateSettings;
};
```

移除的类型/字段：`UpdateChannel`、`AppUpdateManifest`、`AppUpdateDownloadTarget`、`latestVersion`、`channel`、`downloadUrl`、`notesSummary`、`minimumSupportedVersion`、`blockedVersions`、`requiresImmediateUpdate`、`currentVersionBlocked`。

`AppUpdateSettings` 从 5 字段砍到 3 字段：移除 `channel`、`autoCheck`。

### IPC handler 变更

**移除的 IPC：**
- `updates:setChannel`
- `updates:setAutoCheck`

**保留的 IPC：**
- `updates:getState` / `updates:getSettings` — 读取
- `updates:checkForUpdates` — 手动检查
- `updates:downloadUpdate` — 手动下载
- `updates:restartToInstall` — 重启安装
- `updates:setAutoDownload` — 切换自动下载（默认 ON）
- `updates:skipVersion` — 跳过版本
- `updates:openReleaseNotes` — `releaseNotesUrl` 从 `https://github.com/dvlin-dev/moryflow/releases/tag/v{version}` 构建
- `updates:openDownloadPage` — 打开 `https://www.moryflow.com/download`

### Sidebar update card 变更

```typescript
// before
const version = state.availableVersion ?? state.downloadedVersion ?? state.latestVersion;
const isMandatoryUpdate = state.requiresImmediateUpdate || state.currentVersionBlocked;

// after
const version = state.availableVersion ?? state.downloadedVersion;
// 移除 isMandatoryUpdate、channel badge
// autoDownload ON → sidebar card 在 downloading / downloaded 时出现
// autoDownload OFF → sidebar card 在 available / downloading / downloaded 时出现，available 时显示 Download 按钮
```

## 五、CI workflow 简化

### 保留

- `metadata` job（解析 tag / version，简化：去掉 channel / prerelease / latest_channel_tag / publish_channel_feed）
- `build-macos-arm64` / `build-macos-x64` jobs（构建 + smoke check packaged app）
- GitHub Release 发布

### 移除

- `UPDATE_BASE_URL` env
- `GITHUB_REPO` env（不再需要传给 prepare 脚本）
- `R2_*` secrets / env
- `prepare-release-artifacts.ts` 调用
- `smoke-check-update-feed.ts` 调用
- `Upload versioned assets to R2` step
- `Upload channel feeds to R2` step
- metadata 中的 `channel` / `prerelease` / `publish_channel_feed` / `latest_channel_tag` 输出
- metadata 中的 beta tag 检测逻辑
- version 格式校验中的 `-beta.N` 分支

metadata job 简化为：从 tag 解析 version（`v0.3.0` → `0.3.0`），校验格式（仅 `x.y.z`），校验 tag 与 package.json 一致。

### publish job 重写

```yaml
publish:
  name: Publish Release
  needs: [metadata, build-macos-arm64, build-macos-x64]
  runs-on: ubuntu-latest
  permissions:
    contents: write
  steps:
    - uses: actions/checkout@v4
      with:
        ref: ${{ needs.metadata.outputs.tag }}
    - uses: pnpm/action-setup@v4
      with:
        version: ${{ env.PNPM_VERSION }}
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
    - run: pnpm install --frozen-lockfile --prefer-offline
    - uses: actions/download-artifact@v4
      with:
        path: .artifacts

    - name: Merge update yml across architectures
      run: |
        pnpm --dir apps/moryflow/pc exec tsx scripts/merge-update-yml.ts \
          --arm64-dir ".artifacts/darwin-arm64" \
          --x64-dir ".artifacts/darwin-x64" \
          --feed-file "latest-mac.yml" \
          --output-dir ".release-assets"
        cp .artifacts/darwin-arm64/*.dmg .artifacts/darwin-arm64/*.zip .artifacts/darwin-arm64/*.blockmap .release-assets/ 2>/dev/null || true
        cp .artifacts/darwin-x64/*.dmg .artifacts/darwin-x64/*.zip .artifacts/darwin-x64/*.blockmap .release-assets/ 2>/dev/null || true

    - name: Publish GitHub release
      uses: softprops/action-gh-release@v2
      with:
        tag_name: ${{ needs.metadata.outputs.tag }}
        target_commitish: ${{ needs.metadata.outputs.tag_sha }}
        generate_release_notes: true
        files: .release-assets/*
```

不再标记 `prerelease`——所有发布都是正式发布。

关键产物清单（以 v0.3.0 为例）：

```
latest-mac.yml              ← 合并后的，包含 arm64 + x64 entries
MoryFlow-0.3.0-arm64.dmg    ← 手动下载用
MoryFlow-0.3.0-arm64.zip    ← electron-updater 增量更新用
MoryFlow-0.3.0-arm64.zip.blockmap
MoryFlow-0.3.0-arm64.dmg.blockmap
MoryFlow-0.3.0-x64.dmg
MoryFlow-0.3.0-x64.zip
MoryFlow-0.3.0-x64.zip.blockmap
MoryFlow-0.3.0-x64.dmg.blockmap
```

## 六、www 下载模块

`apps/moryflow/www/server/routes/api/v1/latest-release.ts` 需小幅改动：

- 移除 `channel` 字段和 `parseVersion` 中的 beta 检测逻辑
- `isPrerelease` 字段可移除（所有发布都是正式发布）
- 其余不变（仍从 GitHub Releases API 获取数据，10 分钟缓存）

下载页需移除 channel 展示：`useDownload` 中的 `channel` / `channelLabel` 字段，下载页中的 "Channel: Stable" 显示行。

`public-download.ts`、`manual-download.ts` 无需改动。

## 七、删除的文件

| 文件 | 原因 |
|------|------|
| `apps/moryflow/pc/scripts/prepare-release-artifacts.ts` | manifest.json + URL 改写不再需要 |
| `apps/moryflow/pc/scripts/smoke-check-update-feed.ts` | 自定义 feed 校验不再需要 |
| `apps/moryflow/pc/src/main/app/update-payload-validation.ts` | 仅校验 skipVersion payload，逻辑内联到 ipc-handlers 即可 |
| `apps/moryflow/pc/src/main/app/update-payload-validation.test.ts` | 同上 |
| `apps/moryflow/pc/src/preload/update-payloads.ts` | 仅 createSkipVersionPayload，逻辑内联 |

## 八、需更新的文件

| 文件 | 变更 |
|------|------|
| `apps/moryflow/pc/electron-builder.yml` | publish provider generic → github |
| `apps/moryflow/pc/src/main/app/update-service.ts` | 重写：事件驱动，移除 manifest/feed/rollout |
| `apps/moryflow/pc/src/main/app/update-service.test.ts` | 重写：匹配新的事件驱动架构 |
| `apps/moryflow/pc/src/shared/ipc/app-update.ts` | 精简类型 |
| `apps/moryflow/pc/src/main/app/ipc-handlers.ts` | 更新 openReleaseNotes/openDownloadPage 逻辑 |
| `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/sidebar-update-card.tsx` | 移除 `latestVersion` 和 `isMandatoryUpdate` |
| `apps/moryflow/pc/src/renderer/hooks/use-app-update.ts` | 适配精简后的 state 类型 |
| `.github/workflows/release-pc.yml` | 移除 R2，添加 yml 合并 |
| `docs/design/moryflow/runbooks/pc-release-and-auto-update.md` | 重写为新方案 |
| `docs/design/moryflow/runbooks/www-and-docs-download-alignment.md` | 合并到上面的 runbook 或删除 |

## 九、新增的文件

| 文件 | 说明 |
|------|------|
| `apps/moryflow/pc/scripts/merge-update-yml.ts` | 合并多 arch yml 脚本 |
| `apps/moryflow/pc/scripts/merge-update-yml.test.ts` | 合并脚本单测 |
| `apps/moryflow/pc/src/renderer/components/update-toast-listener.tsx` | Toast 通知组件（available/downloaded/error） |

## 十、实施步骤

1. **精简 `app-update.ts` 类型**（状态模型是所有层的基础，先定义；移除 channel / manifest / 配置项类型）
2. **重写 `update-service.ts`**（事件驱动 + deferred promise + 定时检查 20s/6h + skip）+ 重写测试
3. **更新 `ipc-handlers.ts`**（移除 setChannel/setAutoCheck，适配新 service 接口）
4. **更新 preload + desktop-api 类型**（移除 channel / autoCheck / autoDownload 相关 IPC）
5. **更新 `sidebar-update-card.tsx`**（移除 latestVersion / isMandatoryUpdate / channel badge）
6. **更新 `use-app-update.ts`**（移除 setChannel / setAutoCheck 方法）
7. **新增 `update-toast-listener.tsx`**（available/downloaded/error 三种 toast，signature 去重）
8. **修改 `electron-builder.yml`**（github provider）
9. **新增 `merge-update-yml.ts`**（含单测）
10. **重写 CI workflow**（移除 R2 / channel / prerelease + 添加 yml 合并）
11. **删除废弃文件**（prepare-release-artifacts / smoke-check-update-feed / update-payload-validation / update-payloads）
12. **重写 runbook 文档**
13. **推送测试 tag 验证端到端流程**

## 十一、风险

| 风险 | 缓解 |
|------|------|
| GitHub API rate limit（未认证 60 req/h） | 检查频率 6h/次，单用户远低于限制。高并发场景可通过 env 注入 `GH_TOKEN`（electron-updater 支持） |
| 中国大陆 GitHub 下载速度 | 与 R2 相比，GitHub Releases CDN（Fastly）覆盖更广；如需进一步优化后续可接入 proxy |
| 多 arch yml 合并出错 | 单测覆盖 + CI 中 smoke check（验证合并后 yml 包含两个 arch 的条目） |
| version 格式不再支持 beta 后缀 | 预期行为：只发布 `x.y.z` 格式的版本，不再支持 prerelease |
