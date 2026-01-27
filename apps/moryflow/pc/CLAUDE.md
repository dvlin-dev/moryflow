# PC App

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Moryflow 桌面端应用，基于 Electron + React 构建。

## 职责

- 提供桌面端用户界面
- 本地笔记编辑与管理
- AI 对话交互（支持本地 Ollama）
- 本地文件系统访问
- 云同步客户端
- Agent Tasks 面板（列表 + 详情）

## 约束

- 主进程与渲染进程严格分离，通过 IPC 通信
- 渲染进程使用 TailwindCSS
- 主进程处理文件系统、网络、Agent 运行时等重操作
- 敏感操作（文件访问、网络请求）必须在主进程执行
- Providers 设置页的“测试连接”必须基于用户已启用模型的第一个（不允许写死默认模型做 fallback）
- 当用户填写 API Key 或开启任意模型时，UI 应自动开启对应服务商，避免“已配置但忘记启用”
- Custom Provider 必须支持模型列表管理（添加/启用/禁用/删除），否则无法测试与选择模型
- Providers 左侧列表仅保留“会员模型 + Providers”两类；Providers 内部排序为启用在上、未启用在下，并在切换 active provider 时才刷新顺序（避免编辑时跳动）
- 全局样式引入 `/ui/styles`，Electron 专属样式保留在 `src/renderer/global.css`
- `electron.vite.config.ts` 需为 `/ui/styles` 设置别名，避免解析到 `packages/ui/src`
- 外链打开与窗口导航必须走主进程 allowlist 校验（`MORYFLOW_EXTERNAL_HOST_ALLOWLIST` 可扩展）
- 图标库统一 Hugeicons（`@hugeicons/core-free-icons` + `Icon` 组件）
- Renderer 使用 Vitest + RTL 补齐核心 hooks 单测
- Vitest 配置需确保 React 单实例（alias/dedupe），hooks 单测可 mock i18n
- E2E 基线使用 Playwright（Electron），核心流程需覆盖创建 Vault/笔记与入口页
- E2E 运行可使用 `MORYFLOW_E2E_USER_DATA`/`MORYFLOW_E2E_RESET` 隔离与重置数据
- preload 构建需输出 CJS（sandbox 下 ESM preload 会报错）

## 技术栈

| 技术        | 用途        |
| ----------- | ----------- |
| Electron    | 桌面框架    |
| React       | 渲染进程 UI |
| TailwindCSS | 样式系统    |
| Vite        | 构建工具    |

## 成员清单

| 文件/目录                      | 类型 | 说明                    |
| ------------------------------ | ---- | ----------------------- |
| `src/main/`                    | 目录 | 主进程代码              |
| `src/main/index.ts`            | 入口 | 主进程入口              |
| `src/main/agent-runtime/`      | 目录 | Agent 运行时            |
| `src/main/agent-settings/`     | 目录 | Agent 设置管理          |
| `src/main/chat/`               | 目录 | 聊天服务                |
| `src/main/chat-session-store/` | 目录 | 聊天会话存储            |
| `src/main/cloud-sync/`         | 目录 | 云同步服务              |
| `src/main/vault/`              | 目录 | 知识库服务              |
| `src/main/vault-watcher/`      | 目录 | 文件监听服务            |
| `src/main/ollama-service/`     | 目录 | 本地 Ollama 服务        |
| `src/renderer/`                | 目录 | 渲染进程代码            |
| `src/renderer/App.tsx`         | 入口 | 渲染进程入口            |
| `src/renderer/components/`     | 目录 | UI 组件                 |
| `src/renderer/workspace/`      | 目录 | 工作区布局              |
| `src/renderer/hooks/`          | 目录 | 自定义 Hooks            |
| `src/renderer/lib/`            | 目录 | 工具库                  |
| `src/preload/`                 | 目录 | 预加载脚本（IPC 桥接）  |
| `src/shared/`                  | 目录 | 主进程/渲染进程共享代码 |
| `src/shared/ipc/`              | 目录 | IPC 通道定义            |
| `tests/`                       | 目录 | Playwright E2E 测试     |
| `playwright.config.ts`         | 配置 | Playwright 配置         |

## 常见修改场景

| 场景           | 涉及文件                          | 注意事项                                         |
| -------------- | --------------------------------- | ------------------------------------------------ |
| 新增 UI 组件   | `src/renderer/components/`        | 使用 TailwindCSS + shadcn                        |
| 修改工作区布局 | `src/renderer/workspace/`         | 参考现有 render 函数模式                         |
| 新增 IPC 通道  | `src/shared/ipc/`, `src/preload/` | 双向定义，类型安全                               |
| 修改聊天功能   | `src/main/chat/`, `src/renderer/` | 注意 IPC 通信                                    |
| 修改文件操作   | `src/main/vault/`                 | 在主进程执行                                     |
| 修改云同步     | `src/main/cloud-sync/`            | 参考 docs/products/moryflow/features/cloud-sync/ |

## 近期变更

- Providers 设置页补齐 Base URL 默认值与覆盖测试
- useWorkspaceFiles 增加请求过期保护并补充测试，避免工作区切换时展示错误文件
- PC Chat 输入框改为左右分区（Mode/Model/MCP + Attach/@/Primary），语音/发送合并并隐藏上下文进度
- @ 引用改为 MRU 3 个 + 全量搜索，引用/上传文件统一胶囊样式且 Full Access 切换无确认
- Agent Runtime 增加用户级 JSONC 配置、Agent Markdown 与 Hook；桌面端可按开关加载外部工具
- Chat 会话模式切换补齐审计与 mode 归一化，避免缺失字段导致异常
- Chat 会话模式切换：IPC/存储/渲染联动，全权限模式自动放行且保留审计
- Chat 会话压缩新增发送前预处理与 IPC 同步，避免 UI/历史错位
- Chat 工具审批链路贯通：IPC `chat:approve-tool` + 审批卡交互
- Agent 工具输出统一截断，聊天内支持打开完整输出文件
- 补齐 keytar 类型声明，修复 typecheck 缺失模块
- System Prompt 设置页：高级参数可选覆盖（默认使用模型默认值 + Use model default）
- Agent Runtime 切换为 `@openai/agents-core`，移除本地 Agents SDK 依赖
- 会员常量导出收敛，移除未使用的等级比较/优先级常量
- Auth：access/refresh token 统一使用 keytar 系统凭据存储（仅主进程）
- Auth：access token 持久化（Zustand + IPC），支持预刷新/Resume 校验与网络失败不清理
- 统一登录/注册为 email + OTP 验证流程，移除 pre-register
- 主窗口安全收敛：启用 sandbox + 外链 allowlist + 导航拦截
- Renderer 文案英文化与 Hugeicons 替换；补充 hooks 单测
- 补齐 Playwright E2E 基线与核心流程覆盖
- Vitest 单测对齐 React 19.2.3，并移除 i18n 依赖避免重复 React
- Playwright E2E 适配 ESM（使用 import.meta.url 获取路径）
- Playwright E2E 增加 userData/重置开关，保证 onboarding 稳定出现
- preload 产物改为 CJS 输出，Playwright E2E 可正常挂载 desktopAPI
- Playwright E2E 增加失败诊断输出（stdout/stderr/页面 URL）并启用失败截图
- external-links 安全校验补齐路径边界与单测
- 站点发布模板新增 `lang`/`description` 占位符，构建链路默认 `en`
- 新增 Tasks 面板（Chat Pane 内）与 tasks:list/get 只读 IPC 接口

## 依赖关系

```
apps/moryflow/pc/
├── 依赖 → packages/api（API 客户端）
├── 依赖 → packages/agents-* + @openai/agents-core（Agent 框架）
├── 依赖 → packages/types（共享类型）
└── 功能文档 → docs/products/moryflow/features/cloud-sync/
```

## 架构说明

```
┌─────────────────────────────────────────────────────┐
│                    Renderer Process                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  Workspace  │  │  Components │  │    Hooks    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────┬───────────────────────────┘
                          │ IPC
┌─────────────────────────┴───────────────────────────┐
│                     Preload Script                   │
└─────────────────────────┬───────────────────────────┘
                          │ IPC
┌─────────────────────────┴───────────────────────────┐
│                     Main Process                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │    Chat     │  │    Vault    │  │  CloudSync  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│  ┌─────────────┐  ┌─────────────┐                   │
│  │AgentRuntime │  │   Ollama    │                   │
│  └─────────────┘  └─────────────┘                   │
└─────────────────────────────────────────────────────┘
```
