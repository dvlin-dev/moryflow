# PC Release 发布门禁设计

**问题**

当前桌面端发布链路已经能稳定产出安装包和更新 feed，但仍然缺少“最终产物可启动”的发布门禁，导致坏包可以通过 CI 正常发布。已经暴露出的两个故障都属于这个缺陷：

1. workspace runtime 包 `dist/*` 缺失，主进程启动即 `ERR_MODULE_NOT_FOUND`
2. `@openai/agents-extensions` 的运行时依赖 `@openai/agents` 未被最终产物带入，应用启动即崩溃

根因不是单个依赖声明，而是当前发布流程把“构建成功”和“feed 元数据正确”误当成了“可发布”。

**方案对比**

1. 继续依赖人工验收。
   不采用。runbook 已经要求手工验收，但它没有变成 CI 门禁，历史上已经证明这种约束会失效。
2. 仅增加 `app.asar` 依赖扫描。
   不采用。它能覆盖缺包，但覆盖不了主进程早期崩溃、错误配置、原生模块装载失败等真实启动问题。
3. 在发布 workflow 中加入“打包产物启动 smoke test”，并把它放在 GitHub Release / R2 上传之前。
   采用。这是最直接的发布口径：产物先验证，再对外发布。
4. 保留 `workflow_dispatch`，但改成只允许基于既有 tag 重放。
   采用。手动补发依然可用，但发布对象必须是不可变的 tag，而不是任意 branch/ref 上的工作树状态。
5. 让本地 `release.sh` 在打 tag 前强制跑最小发布前校验。
   采用。这样问题会在推 tag 前暴露，而不是等 CI 产物发布后才被用户发现。

**最终设计**

1. 新增一个桌面发布 smoke 脚本，职责固定为：
   - 检查打包后的 `app.asar` 中是否存在关键运行时包
   - 直接启动 `.app/Contents/MacOS/MoryFlow`
   - 在限定时间内确认进程未提前退出
   - 将 `Uncaught Exception`、`ERR_MODULE_NOT_FOUND`、`A JavaScript error occurred in the main process` 视为失败信号
2. `release-pc.yml` 在两个 macOS 构建 job 中都执行该 smoke 脚本，只有通过后才允许上传 artifact。
3. `publish` job 只消费已经通过 smoke 的 artifact，不再承担首次发现坏包的职责。
4. `workflow_dispatch` 增加 `tag` 输入，并统一从该 tag checkout；所有 job 都基于 metadata 解析出的 tag 运行。
5. `release.sh` 在更新版本、打 tag 之前先执行最小发布前校验：
   - `pnpm --filter @moryflow/pc exec vitest run src/main/app/release-build-contract.test.ts`
   - `CI=1 pnpm --dir apps/moryflow/pc build`
6. 补回归契约测试，锁定三件事：
   - workflow 的手动发布必须基于 tag 输入
   - workflow 必须在 publish 前执行 packaged app smoke step
   - `release.sh` 必须先跑发布前校验再 commit/tag/push

**预期结果**

修复后，发布链会从当前的：

`version/tag -> build -> feed-check -> publish`

收紧为：

`version/tag -> build -> packaged-app smoke -> feed-check -> publish`

这样即使再出现新的缺包、错误 externalize、原生模块装载异常或主进程初始化崩溃，也会在 CI 构建阶段被阻断，不会再流入 GitHub Releases 和 `download.moryflow.com`。
