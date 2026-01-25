# /agents-tools

> Agent 工具集：文件/搜索/网络/任务/图片工具 + Web/RN 双端入口

## 职责范围

- 文件工具：read/write/edit/delete/move/ls
- 搜索工具：glob/grep/search_in_file
- 网络工具：web_fetch/web_search
- 任务工具：tasks\_\* / task
- 任务存储规范：Tasks Store 接口 + SQLite schema/migrations
- 图片工具：generate_image
- 工具集装配：`createBaseTools` / `createMobileTools`

## 入口与关键文件

- `src/index.ts`：默认入口（Node/Electron）
- `src/index.react-native.ts`：React Native 入口（不引入 Node 依赖）
- `src/create-tools.ts`：基础工具集（可选 bash）
- `src/create-tools-mobile.ts`：移动端工具集
- `src/shared.ts`：工具共用常量与帮助函数
- `src/task/tasks-store.ts`：Tasks Store 接口与 SQLite schema/migrations 规范
- `src/task/tasks-tools.ts`：Tasks 工具集（tasks\_\*）
- `src/task/task-labels.ts`：Tasks 展示层文案映射（PC/Mobile 共享）

## 约束与约定

- 文件操作必须通过 `VaultUtils` 解析路径，不允许直接拼接
- 覆盖写入必须携带 `base_sha`，删除必须 `confirm: true`
- `web_fetch` 必须阻断私有 IP/localhost/metadata
- 移动端必须先调用 `initMobileGlob` 初始化 glob 实现
- bash 工具仅在桌面端且显式开启时使用

## 变更同步

- 修改工具协议或行为后，更新本文件的“近期变更”
- 如影响跨包依赖，更新根 `CLAUDE.md`

## 近期变更

- bash 工具移除本地输出截断，统一交由 runtime 后处理
- 修复 dist 声明缺失 Tasks Store 导出，保障下游类型检查（2026-01-25）
- 统一路径归一化，避免 Vault 前缀穿越
- `web_fetch` 增加 URL 安全校验
- 新增 Tasks Store 接口与 SQLite schema/migrations 规范（2026-01-25）
- 新增 tasks\_\* 工具并移除 manage_plan（2026-01-25）
- Tasks Store 改为显式 chatId 参数，tasks_graph 使用安全节点 ID（2026-01-25）
- tasks_graph 增强 mermaid label 安全处理（2026-01-25）

---

_版本: 1.0 | 更新日期: 2026-01-25_
