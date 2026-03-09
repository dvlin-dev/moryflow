# Moryflow WWW / Docs 下载面差异审计

**Goal:** 盘点 `moryflow www` 与 `moryflow docs` 中所有下载相关入口，找出它们与最新 PC 发布链路之间的不一致、缺失和误导项，作为后续改造清单。

**审计基线（目标事实）**

- 对外人工下载入口：GitHub Releases
- 客户端更新主源：`download.moryflow.com`
- 更新通道：`stable` / `beta`
- 当前已落地的首发平台：macOS `arm64` + `x64`
- 当前不应继续对外宣称已可下载：Windows
- 更新策略：自动检查、手动下载、手动重启安装

---

## 1. 涉及文件列表

### WWW

- `apps/moryflow/www/src/hooks/useDownload.ts`
- `apps/moryflow/www/src/routes/download.tsx`
- `apps/moryflow/www/src/components/landing/DownloadCTA.tsx`
- `apps/moryflow/www/src/components/layout/Header.tsx`
- `apps/moryflow/www/src/components/layout/Footer.tsx`
- `apps/moryflow/www/src/routes/features.tsx`

### Docs 站点

- `apps/moryflow/docs/src/components/download-buttons.tsx`
- `apps/moryflow/docs/src/routes/index.tsx`
- `apps/moryflow/docs/src/routes/$lang/index.tsx`
- `apps/moryflow/docs/src/lib/layout.shared.tsx`
- `apps/moryflow/docs/content/docs/getting-started/installation.mdx`
- `apps/moryflow/docs/content/docs/getting-started/installation.zh.mdx`
- `apps/moryflow/docs/content/docs/getting-started.mdx`
- `apps/moryflow/docs/content/docs/getting-started.zh.mdx`
- `apps/moryflow/docs/content/docs/faq.mdx`
- `apps/moryflow/docs/content/docs/faq.zh.mdx`

### Design / Runbook / 辅助事实源

- `docs/design/moryflow/runbooks/index.md`
- `docs/design/moryflow/runbooks/electron-auto-update-r2.md`
- `docs/design/moryflow/runbooks/macos-code-signing.md`
- `apps/moryflow/pc/docs/RELEASE.md`
- `apps/moryflow/pc/README.md`

---

## 2. 当前对外说明口径

### WWW 当前口径

- 官网 `/download` 页面和首页 CTA 都面向 `macOS + Windows`。
- 下载数据来源是 `https://download.moryflow.com/manifest.json`。
- 当前前端预期的 manifest 结构是旧格式：
  - `downloads.mac-arm64`
  - `downloads.win-x64`
  - `downloads.linux-x64`
  - 每个平台字段包含 `filename` 和 `cloudflare`
- 下载按钮直接发起静态安装包下载，不区分 `stable` / `beta`，也没有 GitHub Release / release notes 入口。
- 官网下载页系统要求写的是：
  - `macOS 12.0+`
  - Apple Silicon
  - Windows 10/11

### Docs 当前口径

- 文档首页、中英双语首页、顶部导航都把下载入口指向 `https://moryflow.com/download`。
- 文档内嵌下载按钮也直接读取 `https://download.moryflow.com/manifest.json`。
- 安装文档写的是：
  - MoryFlow 支持 `macOS + Windows`
  - macOS 支持 `M 系列 + Intel`
  - Windows 支持 `.exe` 安装包
- FAQ 写的是：
  - Windows 安装失败可“重新下载安装包”
  - 建议开启自动更新或定期从官网重下最新版

### Design / Runbook 当前口径

- `runbooks/index.md` 仍把 `electron-auto-update-r2.md` 作为 PC 发布/更新事实源。
- `electron-auto-update-r2.md` 仍是旧口径：
  - R2-only
  - Windows + macOS Apple Silicon
  - `/updates/**`
  - `latest.yml` / `latest-mac.yml`
- `macos-code-signing.md` 也仍引用旧 workflow 路径与旧发布认知。
- `apps/moryflow/pc/docs/RELEASE.md` 和 `apps/moryflow/pc/README.md` 仍在描述旧下载结构：
  - `releases.moryflow.com`
  - `download.moryflow.com/{version}/`
  - 根级 `manifest.json`
  - Windows / Linux 仍在说明范围内

---

## 3. 与最新发布链路不一致、缺失、会误导用户的点

### P0：必须先改

#### 3.1 `www` 与 `docs` 仍消费旧 manifest 契约

涉及文件：

- `apps/moryflow/www/src/hooks/useDownload.ts`
- `apps/moryflow/docs/src/components/download-buttons.tsx`

问题：

- 当前代码读取的是根级 `/manifest.json`，且类型假定为旧结构：
  - `mac-arm64`
  - `win-x64`
  - `linux-x64`
  - `cloudflare`
- 最新发布链路已经切换到按 channel 的 manifest/feed 组织，不再应把官网下载建立在旧的根级 manifest 形态之上。

影响：

- 官网和文档下载按钮无法稳定对接最新发布链路。
- 一旦线上只保留 channel manifest，现有下载按钮会直接失效。

建议：

- 统一改为消费稳定事实源：
  - 官网人工下载优先直接指向 GitHub Releases 或一层站点侧 download adapter
  - 若仍要动态展示版本，则应消费 `stable` 对应的新 manifest 结构，而不是旧根级 `manifest.json`
- 站点侧不要继续依赖 `cloudflare` 这种历史字段名。

#### 3.2 对外仍展示 Windows 下载，但当前首发不发 Windows

涉及文件：

- `apps/moryflow/www/src/routes/download.tsx`
- `apps/moryflow/www/src/components/landing/DownloadCTA.tsx`
- `apps/moryflow/docs/src/components/download-buttons.tsx`
- `apps/moryflow/docs/content/docs/getting-started/installation.mdx`
- `apps/moryflow/docs/content/docs/getting-started/installation.zh.mdx`
- `apps/moryflow/docs/content/docs/faq.mdx`
- `apps/moryflow/docs/content/docs/faq.zh.mdx`

问题：

- 页面、按钮、安装文档、FAQ 都仍然把 Windows 当成当前可下载平台。
- 最新发布链路当前只发 macOS `arm64 + x64`，Windows 已暂时下线。

影响：

- 用户会点到一个不存在或不再维护的下载路径。
- 文案与实际可发包范围冲突，属于明确误导。

建议：

- 官网和 docs 的所有 Windows 下载入口改为“暂未开放 / Coming soon”或直接移除。
- FAQ 里与 Windows 安装相关的对外支持说明先降级，直到 Windows 重新接入正式发布链路。

#### 3.3 Intel Mac 已支持，但站点仍只暴露单一 mac 下载语义

涉及文件：

- `apps/moryflow/www/src/routes/download.tsx`
- `apps/moryflow/www/src/components/landing/DownloadCTA.tsx`
- `apps/moryflow/docs/src/components/download-buttons.tsx`

问题：

- `www` 当前把 mac 下载按钮文案写成 `Apple Silicon (M1/M2/M3/M4)`。
- `docs` 按钮文案也是单一的 `Download for macOS`，但内部实际上只会取 `mac-arm64`。
- 最新发布链路已经同时支持 `darwin-arm64` 与 `darwin-x64`。

影响：

- Intel Mac 用户看文案会以为自己不受支持，或下载到错误架构。

建议：

- 官网下载页至少拆成两个明确入口：
  - `macOS (Apple Silicon)`
  - `macOS (Intel)`
- docs 的下载按钮也要同步支持双架构选择，或至少在下载页跳转后由官网统一分流。

#### 3.4 公开下载面缺少 GitHub Releases 作为人工下载事实源

涉及文件：

- `apps/moryflow/www/src/routes/download.tsx`
- `apps/moryflow/www/src/components/landing/DownloadCTA.tsx`
- `apps/moryflow/docs/src/components/download-buttons.tsx`
- `apps/moryflow/docs/content/docs/getting-started/installation.mdx`
- `apps/moryflow/docs/content/docs/getting-started/installation.zh.mdx`

问题：

- 当前所有公开下载入口都默认直接打下载域名，没有明确给用户“GitHub Releases / Release notes / 手动下载页”的官方入口。
- 最新发布链路中，GitHub Releases 已经是公开发布页和人工下载入口。

影响：

- 用户无法直达版本说明、历史版本和手工下载入口。
- 当应用内更新失败时，官网/文档没有统一兜底路径。

建议：

- 官网 `/download` 增加：
  - “Open latest release”
  - “View release notes”
- docs 安装文档增加：
  - GitHub Releases 是手动下载入口
  - `download.moryflow.com` 是客户端更新主源，不建议用户直接猜 URL

#### 3.5 Runbook 仍以旧的 R2-only 文档为事实源

涉及文件：

- `docs/design/moryflow/runbooks/index.md`
- `docs/design/moryflow/runbooks/electron-auto-update-r2.md`
- `docs/design/moryflow/runbooks/macos-code-signing.md`

问题：

- 当前 design/runbook 层还在描述旧模型：
  - R2-only
  - `/updates`
  - `latest.yml` / `latest-mac.yml`
  - Windows + Apple Silicon
- 这和最新已落地的“GitHub Releases 对人，download.moryflow.com 对客户端，stable/beta 双通道，macOS arm64+x64”不一致。

影响：

- 后续任何人根据仓库文档改官网或 docs，都很容易再次按旧结构实现。

建议：

- 删除或降级 `electron-auto-update-r2.md`
- 在 `runbooks/index.md` 中改为新的 PC 发布更新 runbook 作为唯一事实源
- `macos-code-signing.md` 同步对齐现行 workflow、Secrets、发布目标平台

### P1：高优先级一致性问题

#### 3.6 官网与 docs 的系统要求彼此不一致

涉及文件：

- `apps/moryflow/www/src/routes/download.tsx`
- `apps/moryflow/docs/content/docs/getting-started/installation.mdx`
- `apps/moryflow/docs/content/docs/getting-started/installation.zh.mdx`

问题：

- `www` 写的是 `macOS 12.0+`
- `docs` 写的是 `macOS 10.15+`
- `www` 写的是 Apple Silicon only
- `docs` 写的是 M 系列和 Intel 都支持

影响：

- 用户看到的系统要求前后矛盾，无法判断自己设备是否可用。

建议：

- 把平台/系统要求统一收敛到单一事实源。
- 官网和 docs 共用同一份下载元信息配置，不再各写一套。

#### 3.7 “无法验证开发者”仍被写成默认首装路径

涉及文件：

- `apps/moryflow/docs/content/docs/getting-started/installation.mdx`
- `apps/moryflow/docs/content/docs/getting-started/installation.zh.mdx`
- `apps/moryflow/docs/content/docs/faq.mdx`
- `apps/moryflow/docs/content/docs/faq.zh.mdx`

问题：

- 现有文档把“developer cannot be verified / 仍要打开”写成首装主流程。
- 最新发布链路已经把签名、公证纳入正式基线，这种文案更应该作为异常兜底，而不是默认预期。

影响：

- 会削弱用户对正式签名发布的信任。
- 与当前发布目标不匹配。

建议：

- 安装文档主流程去掉这条作为默认步骤。
- FAQ 保留为“若极少数情况下仍遇到 Gatekeeper 阻拦”的异常处理。

#### 3.8 FAQ 已提到自动更新，但站点没有解释通道与更新策略

涉及文件：

- `apps/moryflow/docs/content/docs/faq.mdx`
- `apps/moryflow/docs/content/docs/faq.zh.mdx`

问题：

- FAQ 写了“建议开启自动更新”。
- 但 docs 没有任何面向用户的说明解释：
  - 默认使用哪个通道
  - `stable` / `beta` 是什么关系
  - 更新是自动检查、手动下载、手动重启安装

影响：

- 用户知道“有自动更新”，但不知道行为边界。

建议：

- 增加一篇简短的用户向更新说明，或在安装文档 / FAQ 中补一节“Update behavior”。

### P2：可在第二批处理

#### 3.9 官网与 docs 没有 release notes / 历史版本入口

问题：

- 当前下载面只有“点按钮下载”。
- 对测试用户、beta 用户、问题排查用户来说，缺少 release notes 和历史版本入口。

建议：

- 官网 `/download` 加 “Release notes” / “All releases”
- docs 安装页加一个 “Looking for an older version?” 小节

#### 3.10 `pc` 内部说明文档仍会反向污染站点改造判断

涉及文件：

- `apps/moryflow/pc/docs/RELEASE.md`
- `apps/moryflow/pc/README.md`

问题：

- 这些文件仍在描述旧下载结构和旧域名策略。
- 虽然不是用户面页面，但它们常被开发者当作事实源。

建议：

- 改成跳转到新的统一 runbook，或整体收口成简短索引页。

---

## 4. 推荐改造顺序

### Phase 1：先修公开下载面

1. 统一 `www` 与 `docs` 的下载数据来源与平台口径
2. 下线 Windows 对外按钮与文案
3. 补上 Intel Mac 下载入口
4. 官网 `/download` 增加 GitHub Releases / release notes 入口

### Phase 2：再修安装文档与 FAQ

1. 收口系统要求
2. 把“无法验证开发者”改为异常处理而不是默认流程
3. 明确自动更新策略与 stable/beta 关系

### Phase 3：最后修事实源文档

1. 替换 `runbooks/index.md` 中的旧入口
2. 废弃 `electron-auto-update-r2.md`
3. 收口 `pc/docs/RELEASE.md` 与 `apps/moryflow/pc/README.md`

---

## 5. 推荐的最终状态

完成后，公开下载面应统一成以下口径：

- 官网 `/download` 只展示当前真正可下载的平台
- 当前平台明确为：
  - `macOS (Apple Silicon)`
  - `macOS (Intel)`
- GitHub Releases 是人工下载与 release notes 入口
- `download.moryflow.com` 只作为客户端更新与静态资产承载域
- `stable` 是默认公开下载通道
- `beta` 只在需要时通过单独文案或测试说明暴露，不默认出现在主下载入口

---

## 6. 具体实施步骤

### Step 1：抽离共享下载事实源

1. 新增一个共享下载配置模块，集中定义：
   - 当前公开版本
   - 当前公开 channel
   - GitHub Releases URL
   - Apple Silicon / Intel Mac 下载入口
   - Windows 当前状态
2. `www` 与 `docs` 都只从这一个模块读取下载信息。
3. 不再让任何公开页面直接依赖旧的根级 `download.moryflow.com/manifest.json` 契约。

### Step 2：修正 `www`

1. 重写 `apps/moryflow/www/src/hooks/useDownload.ts`
   - 改为读取共享下载配置
   - 移除旧 manifest 读取逻辑
2. 修改 `apps/moryflow/www/src/components/landing/DownloadCTA.tsx`
   - 去掉 Windows 下载按钮
   - 增加 Apple Silicon / Intel 两个入口
   - 增加 release notes 入口
3. 修改 `apps/moryflow/www/src/routes/download.tsx`
   - 平台卡片改为 Apple Silicon / Intel / Windows coming soon
   - 增加 GitHub Releases / release notes 入口
   - 增加下载策略说明
   - 收口系统要求

### Step 3：修正 `docs`

1. 重写 `apps/moryflow/docs/src/components/download-buttons.tsx`
   - 改为读取共享下载配置
   - 去掉 Windows 直接下载
   - 增加双架构 macOS 下载入口
   - 增加 release notes / all releases 入口
2. 修改安装文档：
   - `apps/moryflow/docs/content/docs/getting-started/installation.mdx`
   - `apps/moryflow/docs/content/docs/getting-started/installation.zh.mdx`
     收口到当前公开平台与 GitHub Releases 策略
3. 新增更新文档：
   - `apps/moryflow/docs/content/docs/getting-started/updates.mdx`
   - `apps/moryflow/docs/content/docs/getting-started/updates.zh.mdx`
4. 更新导航：
   - `apps/moryflow/docs/content/docs/getting-started/meta.json`
   - `apps/moryflow/docs/content/docs/getting-started/meta.zh.json`
5. 更新设置与 FAQ：
   - `apps/moryflow/docs/content/docs/settings.mdx`
   - `apps/moryflow/docs/content/docs/settings.zh.mdx`
   - `apps/moryflow/docs/content/docs/faq.mdx`
   - `apps/moryflow/docs/content/docs/faq.zh.mdx`

### Step 4：修正文档事实源

1. 更新 `docs/design/moryflow/runbooks/index.md`
   - 移除旧的 R2-only runbook 入口
   - 指向新的 PC 发布更新事实源
2. 删除或废弃 `docs/design/moryflow/runbooks/electron-auto-update-r2.md`
3. 更新：
   - `apps/moryflow/pc/docs/RELEASE.md`
   - `apps/moryflow/pc/README.md`
   - `docs/design/moryflow/runbooks/macos-code-signing.md`
     去掉旧域名、旧 manifest、旧平台说明

### Step 5：验证与收口

1. 运行 `typecheck`
2. 运行与 `www` 相关的单测 / 构建
3. 运行与 `docs` 相关的构建
4. 手动检查：
   - 官网下载页
   - 官网首页 CTA
   - docs 首页下载组件
   - docs 安装文档
   - docs 更新文档
5. 把所有变更加入暂存区
6. 做一次全量 code review，重点检查：
   - 是否仍有旧 manifest 依赖
   - 是否还有 Windows 公开下载承诺
   - 是否遗漏 Intel Mac 入口
   - 是否还有旧 runbook / 旧域名 / 旧 workflow 路径
