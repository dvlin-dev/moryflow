# /agents-tools

> Agent 工具集：文件/搜索/网络/任务/图片工具 + Web/RN 双端入口

## 职责范围

- 文件工具：read/write/edit/delete/move/ls
- 搜索工具：glob/grep/search_in_file
- 网络工具：web_fetch/web_search
- 任务工具：tasks\_\* / subagent
- 任务存储规范：Tasks Store 接口 + SQLite schema/migrations
- 图片工具：generate_image
- 工具集装配：`createBaseTools` / `createMobileTools` / `createPcLeanTools`

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

- 单测稳定性修复（2026-03-03）：`test/create-pc-lean-tools-subagent.spec.ts` 改为顶层 `vi.hoisted + vi.mock` 与静态导入 `createPcLeanTools`，移除测试体内动态 `import`/`doMock`，降低全仓并发执行时的初始化抖动与超时风险。
- subagent 单能力面收口（2026-03-03）：`src/task/subagent-tool.ts` 删除 `type=explore/research/batch` 参数与角色指令映射，`SubAgentToolsConfig` 升级为“数组或动态 resolver”以支持运行时复用主工具事实源；`src/create-tools.ts` 默认子代理工具集改为“同端全能力”注入（不再 web-only 角色分流）；`test/create-pc-lean-tools-subagent.spec.ts` 与 `test/subagent-tool.spec.ts` 已同步更新断言。
- PC 精简工具回归测试补强（2026-03-03）：`create-pc-lean-tools.spec.ts` 新增工具顺序快照；新增 `create-pc-lean-tools-subagent.spec.ts`，通过 mock `createSubagentTool` 校验默认 `subagent` 工具集不回退到文件/搜索专用工具。
- 子代理工具命名收敛（2026-03-03）：`task` 工具重命名为 `subagent`，实现文件改为 `subagent-tool.ts`，导出 `createSubagentTool`；同步将 `create*WithoutTask` 命名收敛为 `create*WithoutSubagent`，并更新 PC runtime 与单测调用点，消除 `task` 与 `tasks_*` 语义混淆。
- PC Bash-First 工具装配（2026-03-03）：新增 `createPcLeanToolsWithoutSubagent` / `createPcLeanTools`，用于桌面端收敛默认工具面（移除文件/搜索专用工具注入）；`createSubagentTool` 新增 instruction overrides，允许 runtime 注入 Bash-First 子代理提示词；补充 `create-pc-lean-tools.spec.ts` 回归测试。
- `subagent` 子代理创建前统一调用 `normalizeToolSchemasForInterop`，保证跨模型（尤其 Gemini）函数 schema 兼容（2026-02-24）
- `tasks_delete` 参数 schema 从 `z.literal(true)` 调整为 `z.boolean()`，执行期强制 `confirm===true`；规避 Google function declaration 布尔 enum 兼容问题（2026-02-24）
- 新增 browser 入口导出，renderer 使用包根导入也不会打包 fast-glob（2026-01-27）
- write 工具参数 schema 去除 transform，避免 JSON Schema 转换报错（2026-01-27）
- bash 工具移除本地输出截断，统一交由 runtime 后处理
- 修复 dist 声明缺失 Tasks Store 导出，保障下游类型检查（2026-01-25）
- 统一路径归一化，避免 Vault 前缀穿越
- `web_fetch` 增加 URL 安全校验
- 新增 Tasks Store 接口与 SQLite schema/migrations 规范（2026-01-25）
- 新增 tasks\_\* 工具并移除 manage_plan（2026-01-25）
- Tasks Store 改为显式 chatId 参数，tasks_graph 使用安全节点 ID（2026-01-25）
- tasks_graph 增强 mermaid label 安全处理（2026-01-25）

---

_版本: 1.0 | 更新日期: 2026-03-03_
