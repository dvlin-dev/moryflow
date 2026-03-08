# MoryFlow WWW / Docs 下载链路对齐清单

## 目标

对齐 `moryflow.com`、`moryflow.com/download`、`docs.moryflow.com` 与当前 PC 发布链路，避免对外下载口径继续滞后于最新实现。

这份文档只回答两件事：

- 当前外部页面哪些地方已经和最新 PC 发布链路不一致
- 接下来 `www` 与 `docs` 哪些模块需要修改

## 当前 PC 发布基线

以下基线以当前仓库的 PC 发布实现为准：

- 人工下载与 release notes 入口：GitHub Releases
- 客户端自动更新主源：`download.moryflow.com`
- 更新通道：`stable` + `beta`
- 当前已验证的公开发布链路：`v0.2.17-beta.1`
- 当前公开可用产物：macOS `arm64`、macOS `x64`
- Windows 包当前不应继续对外承诺

对应事实源：

- `/.github/workflows/release-pc.yml`
- `/docs/design/moryflow/runbooks/pc-release-and-auto-update.md`

## 已确认的对外失真点

以下问题已经可以从线上页面直接确认，不依赖源码猜测。

### 1. 首页与下载页仍在承诺 Windows

`moryflow.com` 与 `docs.moryflow.com` 当前仍显示：

- `Windows 10/11 (64-bit)`

但当前发布链路已经收口到 macOS-only。继续公开承诺 Windows 会直接误导用户。

### 2. 首页与下载页缺少 Intel Mac 支持说明

当前公开文案仍强调：

- `Apple Silicon (M1/M2/M3/M4)` 或 `Apple Silicon (M1/M2/M3)`

但当前发布链路已经支持：

- macOS `arm64`
- macOS `x64`

也就是 Intel Mac 已支持，但对外页面没有说明。

### 3. 下载页没有把 beta 作为下载语义讲清楚

当前 `moryflow.com/download` 页面已有：

- `Beta · Free forever`

但没有明确说明：

- 当前默认下载的是哪个 channel
- beta 与 stable 的差异
- 当前是否只有 beta 对外开放
- release notes 在哪里

这会让 `Beta` 只停留在营销标签，而不是可执行的下载说明。

### 4. 页面没有解释 GitHub Releases 与 `download.moryflow.com` 的职责分工

当前发布链路已经固定为：

- GitHub Releases：人工下载、release notes、公开发布页
- `download.moryflow.com`：客户端自动更新 feed

但对外站点没有把这个分工讲清楚，后续会导致：

- 用户找不到 release notes
- 用户不理解网页下载与应用内更新为什么不是同一个域名
- 站点未来容易错误公开 `download.moryflow.com` 作为普通下载页

### 5. 文档站没有一页明确说明“下载与更新”

当前公开 docs 已有首页与基础内容，但还缺少一页专门说明：

- 下载入口
- 支持平台
- 手动更新
- 应用内检查更新
- `stable / beta` 切换
- 更新失败时的手动下载 fallback

这会让下载、安装、升级、回退说明继续分散甚至缺失。

## 需要修改的模块

以下按模块归类。由于本轮本地执行器异常，`apps/moryflow/www` 与 `apps/moryflow/docs` 的精确文件路径需要在开工前再做一次代码级确认；但模块边界已经足够用于排期和拆任务。

### WWW：P0

#### 1. 首页 Hero 的平台支持文案

需要改：

- 去掉 Windows 承诺
- 补充 Intel Mac 支持
- 如果当前公开分发仍是 beta，要明确标注当前公开下载为 beta

建议口径：

- `macOS: Apple Silicon and Intel`
- 如当前没有 stable，则增加 `Current public build: Beta`

#### 2. `/download` 页面的平台卡片与系统要求

需要改：

- 去掉 Windows 下载块，或改成 `Coming soon`
- macOS 区块拆成：
  - Apple Silicon
  - Intel Mac
- 系统要求同步为最新事实
- 明确当前默认指向的是 stable 还是 beta

当前页面最大问题不是样式，而是平台矩阵失真。

#### 3. 下载按钮的数据来源

需要改：

- 不再靠页面硬编码平台、链接或版本
- 统一从单一配置读取“当前公开下载入口”

建议规则：

- 如果存在公开 stable：默认 CTA 指向 stable GitHub Release
- 如果当前只开放 beta：CTA 必须显式写 `Download Beta`
- 架构级直链只作为二级入口，不作为唯一入口

#### 4. Footer / Nav 中的 Download 入口

需要改：

- 确认所有 `Download` 入口统一跳到同一个下载页
- 不允许一部分跳 `moryflow.com/download`，另一部分跳旧直链或失真的平台页

### WWW：P1

#### 5. 下载页补充 release notes 与版本信息

建议增加：

- `View release notes`
- `View all releases`
- 当前公开版本号
- 当前 channel

如果后续继续做 beta 测试，这一层信息很有必要。

#### 6. 下载页增加“应用内更新”说明

建议增加短说明：

- 应用默认自动检查更新
- 下载与安装是手动确认
- 也可以在应用内切换 `stable / beta`

这能减少“网页下的是一个版本，应用内看到的是另一个版本”的疑惑。

### Docs：P0

#### 7. Docs 首页下载文案

需要改：

- 去掉 Windows 承诺
- 补充 Intel Mac 支持
- 把 `Download` 入口和当前下载策略对齐

当前 docs 首页已经直接暴露平台文案，所以优先级很高。

#### 8. `Getting Started / 下载安装` 页面

需要新增或重写成一页完整的安装文档，至少包含：

- 下载入口：GitHub Releases
- 当前支持平台：macOS `arm64` / `x64`
- 如何判断自己是 Apple Silicon 还是 Intel
- 如何安装 `.dmg`
- Gatekeeper / 签名 / 公证的正常提示长什么样
- Windows 当前状态

### Docs：P1

#### 9. 新增“下载与更新”文档

建议新增独立文档页，作为对外唯一事实源，内容包含：

- 手动下载
- release notes
- 应用内检查更新
- `Download update`
- `Restart to update`
- `stable / beta` 切换
- 更新失败时的手动下载 fallback

#### 10. Settings 文档补充更新设置

应补充：

- `Update channel`
- `Check for updates`
- `Download update`
- `Restart to update`
- `Skip this version`（如果最终对外保留）

否则 docs 对用户而言看不到新加的更新能力。

#### 11. Docs 导航与 cross-link

需要改：

- 首页 `下载安装`
- Settings
- FAQ / Troubleshooting（如果有）

都应回链到新的“下载与更新”文档，避免说明分散。

## 推荐的统一口径

### 公开下载

- 官方下载页：`moryflow.com/download`
- 官方发布页与 release notes：GitHub Releases

### 客户端更新

- 客户端自动更新只使用 `download.moryflow.com`
- 不把 `download.moryflow.com` 当作普通营销下载页

### 平台说明

当前建议统一写成：

- `macOS (Apple Silicon)`
- `macOS (Intel)`
- `Windows: coming soon`

只有当 Windows 重新纳入发布 workflow 后，才恢复公开承诺。

### Channel 说明

当前建议统一规则：

- 用户默认看到的是 `stable`
- 如果当前只开放 beta，则页面必须明确写 `Beta`
- 不要在没有解释的情况下只写一个 `Beta` 标签

## 建议的实现方式

为避免 `www` 与 `docs` 以后再次漂移，建议增加一个统一的“下载口径配置”层，让两个站点共享：

- 当前公开 channel
- 当前公开版本
- 支持平台列表
- 每个平台的下载入口
- release notes URL
- `coming soon` 平台列表

最差也应该抽成共享常量；更稳的是由一个轻量配置或构建时产物生成。

## 实施计划入口

本 runbook 只保留下载面对齐的固定口径，不再承载执行过程或时间线。

如需查看本轮实施拆解与执行清单，统一参考：

- `docs/plans/2026-03-09-moryflow-download-surfaces-audit.md`

当前固定事实仍以以下来源为准：

- `/.github/workflows/release-pc.yml`
- `/docs/design/moryflow/runbooks/pc-release-and-auto-update.md`
- `/apps/moryflow/shared/public-download.ts`
