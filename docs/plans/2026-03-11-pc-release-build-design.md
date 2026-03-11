# PC Release 构建链修复设计

**问题**

当前桌面端发布链路有两个独立根因：

1. CI 中跳过了根级 `postinstall` 的共享包构建，又没有显式复用仓库标准的 `build:packages` 编排，导致 `@moryflow/agents-tools`、`@moryflow/agents-runtime`、`@moryflow/channels-telegram` 等 workspace 运行时包缺少 `dist/*.mjs`，最终发布包在 Electron 主进程启动时触发 `ERR_MODULE_NOT_FOUND`。
2. `electron-builder` 在 monorepo 打包时会额外做一次依赖树收集。仓库根 `.npmrc` 默认是 `node-linker=hoisted`，导致它在某些路径上错误走到 `NpmNodeModulesCollector`，进而在 workspace 依赖树上因 `npm ls` 输出异常失败，无法产出真正的 `dmg/zip` 安装包。

**方案对比**

1. 给 Electron 主进程加容错或回退导入。
   不采用。这样只能掩盖坏包，不能修复发布产物缺文件。
2. 给每个 runtime workspace 包分别补 `build` script，并继续让 workflow 用 `--if-present build`。
   不采用。仓库已经把这批包的真实构建编排集中在根级 `build:packages` / `build:agents`，逐包复制构建入口会引入第二套事实源。
3. 把 PC 构建入口和 release workflow 统一收口到根级 `build:packages`。
   采用。它直接复用仓库既有编排，也和 `docs/reference/testing-and-validation.md` 中的 PC 校验基线一致。
4. 为 `electron-builder` 增加专用 wrapper，在运行时强制 `node-linker=isolated`。
   采用。它把 packaging 期的包管理器视图固定下来，只影响桌面打包，不污染整个 monorepo 的日常开发基线。

**最终设计**

1. `@moryflow/pc` 的 `build` 生命周期前显式执行根级 `build:packages`，保证任何通过 `pnpm --dir apps/moryflow/pc build` 触发的桌面构建都先产出 workspace runtime `dist/*`。
2. `@moryflow/pc` 的所有打包脚本统一改走 `run-electron-builder.cjs` wrapper，在 wrapper 内固定 `npm_config_node_linker=isolated`。
3. `release-pc.yml` 不再执行那条只会跑 `--if-present build` 的局部依赖构建步骤，并在安装器产出阶段复用同一个 wrapper。
4. 补一个面向发布构建契约的回归测试，锁定三件事：
   - PC 构建入口必须先跑根级 `build:packages`
   - 本地打包脚本必须通过隔离 wrapper 调用 `electron-builder`
   - release workflow 不能再回到 `--if-present build` 的坏路径，也不能绕过 wrapper

**预期结果**

CI 和本地桌面构建都会在进入 `electron-vite build` 前先产出所有 externalized workspace 包的 `dist/*.mjs`，并在 packaging 期稳定使用 isolated linker 视图收集依赖树。最终发布产物既不会因为缺失 `@moryflow/agents-tools/dist/index.mjs` 之类文件在主进程启动阶段崩溃，也不会在 `electron-builder` 生成 `dmg/zip` 时中途失败。
