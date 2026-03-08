# MoryFlow PC 发布与自动更新基线

## 目标

统一 MoryFlow PC 的发布、公开下载与应用内更新口径，避免官网、文档站、桌面端说明继续漂移。

## 当前基线

- 公开手动下载与 release notes：GitHub Releases
- 客户端自动更新主源：`download.moryflow.com`
- 更新通道：`stable` / `beta`
- 当前公开下载平台：macOS `arm64`、macOS `x64`
- Windows：暂不作为公开下载承诺

## 事实源

- 发布 workflow：`/.github/workflows/release-pc.yml`
- 桌面端 release 脚本：`/apps/moryflow/pc/scripts/release.sh`
- 官网与 docs 公开下载事实源：`/apps/moryflow/shared/public-download.ts`
- 下载面对齐说明：`/docs/design/moryflow/runbooks/www-and-docs-download-alignment.md`
- macOS 签名与公证：`/docs/design/moryflow/runbooks/macos-code-signing.md`

## 职责分工

### GitHub Releases

- 公开发布页
- release notes
- 手动下载安装入口
- 历史版本浏览

### download.moryflow.com

- 客户端自动更新 feed
- update manifest / `latest*.yml`
- 应用内下载分发

不把 `download.moryflow.com` 当作普通营销下载页。

## 官网与 Docs 维护规则

`www` 与 `docs` 只允许从一个公开事实源读取当前公开下载信息：

- `apps/moryflow/shared/public-download.ts`

其中维护内容包括：

- 当前公开 channel
- 当前公开版本
- GitHub Releases / release notes URL
- Apple Silicon / Intel Mac 下载入口
- Windows 当前状态

如果公开版本、公开 channel 或公开平台发生变化，必须同步更新：

1. `apps/moryflow/shared/public-download.ts`
2. `docs/design/moryflow/runbooks/www-and-docs-download-alignment.md`
3. `apps/moryflow/pc/docs/RELEASE.md`（如对外口径变化）

## 当前发布策略

- 应用自动检查更新
- 用户手动下载更新
- 用户手动重启安装更新
- 若公开下载当前只开放 beta，官网与 docs 必须明确标注 `Beta`

## 发布后最低检查项

1. GitHub Release 已创建，且 release notes 可访问
2. `download.moryflow.com/channels/<channel>/...` feed 可访问
3. 官网 `/download` 与 docs 下载按钮链接到当前公开版本
4. 应用内更新能正确发现当前 channel 的新版本
