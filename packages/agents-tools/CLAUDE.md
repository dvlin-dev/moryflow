# /agents-tools

> Agent 工具集：文件/搜索/网络/任务/图片工具 + Web/RN 双端入口

## 职责范围

- 文件工具：read/write/edit/delete/move/ls
- 搜索工具：glob/grep/search_in_file
- 网络工具：web_fetch/web_search
- 任务工具：`task` / `subagent`
- 任务状态规范：`TaskStateService` 接口 + task snapshot 规范化/校验
- 图片工具：generate_image
- 工具集装配：`createMobileTools` / `createPcTools`

## 入口与关键文件

- `src/index.ts`：默认入口（Node/Electron）
- `src/index.react-native.ts`：React Native 入口（不引入 Node 依赖）
- `src/create-tools.ts`：PC 工具集（Bash-First 非重叠工具）
- `src/create-tools-mobile.ts`：移动端工具集
- `src/shared.ts`：工具共用常量与帮助函数
- `src/task/task-state.ts`：`TaskStateService` 接口与 task snapshot 规范化/校验
- `src/task/task-tool.ts`：单一 `task` 工具（`get/set/clear_done`）
- `src/task/task-labels.ts`：task 状态展示文案映射（PC/Mobile 共享）

## 约束与约定

- 文件操作必须通过 `VaultUtils` 解析路径，不允许直接拼接；路径边界由运行时 mode 决定（ask=VaultOnly，full_access=Unrestricted）
- 覆盖写入必须携带 `base_sha`，删除必须 `confirm: true`
- `web_fetch` 必须阻断私有 IP/localhost/metadata
- 移动端必须先调用 `initMobileGlob` 初始化 glob 实现
- `agents-tools` 不提供 bash 工具；桌面端 bash 统一由 `@moryflow/agents-sandbox` 注入

## 变更同步

- 仅在目录职责、入口、关键协议或跨包边界失真时更新本文件
- 如影响跨包依赖，更新根 `CLAUDE.md`
