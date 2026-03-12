# /agents-tools

> Agent 工具集：文件/搜索/网络/任务/图片工具 + Web/RN 双端入口

## 职责范围

- 文件工具：read/write/edit/delete/move/ls
- 搜索工具：glob/grep/search_in_file
- 网络工具：web_fetch/web_search
- 任务工具：`task` / `subagent`
- 任务状态规范：`TaskStateService` 接口 + task snapshot 规范化/校验
- 图片工具：generate_image
- 平台 toolset 装配：`createPcBashFirstToolset` / `createMobileFileToolsToolset`

## 入口与关键文件

- `src/index.ts`：默认入口（Node/Electron）
- `src/index.react-native.ts`：React Native 入口（不引入 Node 依赖）
- `src/toolset/shared.ts`：平台 toolset 共享上下文
- `src/toolset/pc-bash-first.ts`：PC Bash-First toolset
- `src/toolset/mobile-file-tools.ts`：移动端文件工具 toolset
- `src/shared.ts`：工具共用常量与帮助函数
- `src/task/task-state.ts`：`TaskStateService` 接口与 task snapshot 规范化/校验
- `src/task/task-tool.ts`：单一 `task` 工具（`get/set/clear_done`）
- `src/task/task-labels.ts`：task 状态展示文案映射（PC/Mobile 共享）
- `src/search/`：搜索工具实现与运行时共享路径策略接入点

## 约束与约定

- 文件操作必须通过 `VaultUtils` 解析路径，不允许直接拼接；路径边界由运行时 mode 决定（ask=VaultOnly，full_access=Unrestricted）
- 覆盖写入必须携带 `base_sha`，删除必须 `confirm: true`
- `glob/grep` 必须复用 `@moryflow/agents-runtime` 的共享搜索 pattern 解析结果，确保权限 target 与实际执行语义一致；ask 下前导 `/` 视为 vault-relative，含 `..` 的 pattern 直接拒绝执行
- `web_fetch` 必须阻断私有 IP/localhost/metadata
- 移动端必须先调用 `initMobileGlob` 初始化 glob 实现
- 工具集必须按平台模块拆分；禁止在单个 builder 中混写 PC/Mobile 规则
- `agents-tools` 不提供 bash 工具；桌面端 bash 统一由 `@moryflow/agents-sandbox` 注入

## 变更同步

- 仅在目录职责、入口、关键协议或跨包边界失真时更新本文件
- 如影响跨包依赖，更新根 `CLAUDE.md`
