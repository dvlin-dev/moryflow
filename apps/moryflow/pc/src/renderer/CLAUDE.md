# Renderer

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

PC 端 Electron 应用的渲染进程，负责所有 UI 交互与展示。

## 职责

- 用户界面渲染（React 组件）
- 用户交互处理
- 与主进程通过 IPC 通信
- 本地状态管理

## 约束

- 禁止直接访问 Node.js API（需通过 preload 暴露）
- 禁止直接访问文件系统（需通过 IPC 调用主进程）
- 使用 TailwindCSS + shadcn/ui 进行样式开发
- 重操作（网络请求、文件操作）需委托给主进程
- 聊天消息扩展字段统一使用 `metadata.chat`；文件附件预览统一使用 `providerMetadata.chat`
- 聊天消息列表与输入框 UI 统一使用 `@moryflow/ui/ai/*` 组件
- 所有用户可见文案必须为英文
- 图标统一使用 Lucide（`lucide-react`，直接组件调用），禁止 `@hugeicons/*`
- 前端表单必须使用 `zod/v3`（RHF 兼容层）
- 核心 hooks 需有 Vitest 单测覆盖（jsdom + RTL）
- E2E 测试使用 `data-testid` 作为稳定选择器（避免依赖文案）

## 成员清单

| 文件/目录     | 类型 | 说明               |
| ------------- | ---- | ------------------ |
| `main.tsx`    | 入口 | 渲染进程入口       |
| `App.tsx`     | 组件 | 根组件             |
| `components/` | 目录 | UI 组件库          |
| `workspace/`  | 目录 | 工作区布局与面板   |
| `hooks/`      | 目录 | 自定义 React Hooks |
| `lib/`        | 目录 | 工具库             |
| `contexts/`   | 目录 | React Context      |
| `styles/`     | 目录 | 全局样式           |
| `theme/`      | 目录 | 主题配置           |
| `transport/`  | 目录 | IPC 通信封装       |
| `utils/`      | 目录 | 工具函数           |

### 组件目录（components/）

| 目录                  | 说明                                  |
| --------------------- | ------------------------------------- |
| `ui/`                 | shadcn/ui 基础组件                    |
| `chat-pane/`          | 聊天面板组件                          |
| `vault-files/`        | 知识库文件管理                        |
| `cloud-sync/`         | 云同步状态展示                        |
| `command-palette/`    | 命令面板                              |
| `settings-dialog/`    | 设置对话框                            |
| `payment-dialog/`     | 支付对话框                            |
| `login-form.tsx`      | 登录表单                              |
| `notion-like-editor/` | 类 Notion 编辑器                      |
| `tiptap-*`            | Tiptap 编辑器相关                     |
| `ai-elements/`        | AI 相关 UI 元素（仅保留业务特定组件） |
| `animate-ui/`         | 动画组件                              |

### 工作区目录（workspace/）

| 文件                        | 说明                                                   |
| --------------------------- | ------------------------------------------------------ |
| `index.tsx`                 | 工作区入口，管理面板布局                               |
| `components/`               | 工作区子组件                                           |
| `hooks/`                    | 工作区专用 Hooks                                       |
| `file-operations/`          | 文件操作相关                                           |
| `hooks/use-startup-perf.ts` | 启动性能打点 + 轻量 warmup（仅 `import()` 预热重模块） |

### Hooks 目录（hooks/）

常用 Hooks：

- `use-vault-manager.ts` - 知识库管理
- `use-cloud-sync.ts` - 云同步状态
- `use-speech-recording.ts` - 语音录制
- `use-tiptap-editor.ts` - 编辑器状态
- `use-mcp-status.ts` - MCP 服务状态

## 常见修改场景

| 场景           | 涉及文件                                                | 注意事项                                         |
| -------------- | ------------------------------------------------------- | ------------------------------------------------ |
| 新增 UI 组件   | `components/ui/`                                        | 使用 shadcn/ui 规范                              |
| 修改聊天界面   | `components/chat-pane/`                                 | 注意与主进程的 IPC 通信                          |
| 修改编辑器     | `components/notion-like-editor/`, `components/tiptap-*` | Tiptap 扩展开发                                  |
| 修改工作区布局 | `workspace/`                                            | 参考现有面板结构                                 |
| 新增 Hook      | `hooks/`                                                | 遵循 use-xxx 命名                                |
| 修改云同步 UI  | `components/cloud-sync/`, `hooks/use-cloud-sync.ts`     | 参考 docs/products/moryflow/features/cloud-sync/ |

## 近期变更

- 模块 D（cloud-sync/share/site-publish/vault-files）完成一次性收敛：`VaultFiles` 迁移 store-first（移除 Context）、`cloud-sync-section` 拆成容器 + ready 内容层、`site-list/publish-dialog` 拆分并统一 `switch` 状态分发（2026-02-26）
- Store-first 二次改造（`SF-1~SF-4`）完成：`chat-pane` 新增 `chat-pane-footer-store` 与 `chat-prompt-overlay-store`；`workspace` 新增 `workspace-shell-view-store` 与 `sidebar-panels-store`；`settings-dialog` 的 `ProviderDetailsPreset` 改为 `form/list/dialog` 三段模型（2026-02-26）
- Workspace 模块 C（editor/workspace）完成一次性收敛：`DesktopWorkspaceShell` 三层拆分（layout-state/main-content/overlays）、`handle.ts` 下沉为编排层、`useDocumentState/useVaultTreeState` 副作用分段、`Sidebar/EditorPanel` 状态分发统一为状态片段 + `renderContentByState`（2026-02-26）
- `components/editor` 结构收敛：`NotionEditor` 扩展工厂与加载态拆分到 `notion-editor-extensions.ts`、`notion-editor-loading.tsx`，主组件仅保留编辑器装配（2026-02-26）
- Settings Dialog 模块 A 重构收口：`ProviderDetails` 拆分容器/hook/子组件；`LoginPanel` 与 `McpDetails` 进一步片段化；`McpSection/CloudSyncSection/SectionContent` 状态分发统一为方法化渲染
- Payment Dialog 增加 checkout 打开失败态与重试状态机（`idle/opening/opened/failed`）
- OTPForm 单测稳定性修复：`otp-form.test.tsx` 对 `@moryflow/ui/components/input-otp` 使用本地 mock，隔离第三方组件定时器副作用，修复 CI 中 `window is not defined` 的 unhandled error
- Desktop Auth API 修复：登录/验证码验证/刷新/登出请求统一为显式 `/api/v1/auth/*`，彻底消除 `baseUrl + path` 拼接语义差异带来的 404
- Desktop Better Auth Client 修复：`createAuthClient.baseURL` 统一为 `.../api/v1/auth`，避免注册与 OTP 发码误打到根路径
- Desktop Auth：`authMethods.login` 在登录后强校验会话建立结果；若 refresh 后仍无法建立会话，则立即清理本地会话并返回 `Failed to establish session`，避免登录假成功
- Desktop Auth：统一 Token-first（登录/验证码验证成功即落库 access+refresh），`refreshAccessToken` 仅使用 body refreshToken（无 cookie fallback）；保留 fail-fast（无 refresh token 不发请求）与 10s 超时；`AuthProvider` 仅在明确未授权时清理会话，网络异常保留当前状态
- Desktop Auth：access token 预刷新窗口统一为 1h（覆盖长时单次 Agent 任务），`ensureAccessToken` 仅在剩余有效期 >1h 时跳过 refresh
- Settings Account 登录：移除内层 form，提交改为显式点击/Enter 捕获，避免触发外层 Settings form 导致弹窗关闭；OTP 验证步骤同样移除内层 form，并修复 `onSuccess` 未等待导致的未处理 Promise
- Settings Account：未登录 + loading 状态不再展示全局 skeleton，保持登录面板可交互（仅按钮级 loading）
- AuthProvider 登录流程不再触发全局 loading（保留按钮级 loading + 错误回显）
- VaultFiles 与 Threads 列表基线对齐：文件/文件夹/线程行内水平 padding 统一为 `px-2.5`，统一使用 icon 槽位控制文字起始线；行背景采用 `-mx-1` 轻微外扩，保持两类列表间距一致。
- VaultFiles/Threads 列表视觉层次收敛：通过列表容器 inset + 行内 padding 抵消，让激活背景内缩而文本左边线保持稳定对齐。
- Workspace 导航新增 `Skills` destination（位于 Sites 上方），并在主视图新增 Skills 页面 keep-alive 挂载。
- Skills 页交互更新：`New skill` 复用 `Try Skill Creator`，`Try` 改为立即新建会话并选中 skill（无需等待下个会话）。
- Chat 输入框接入 Skills 显式注入：`+` 子菜单/空输入 `/` 双入口 + selected skill chip；失效 skill 发送前软降级。
- 启动性能：移除 `preload:*` IPC/落盘缓存，warmup 回退为 Renderer 侧轻量 `import()`（仅 ChatPane/Shiki）；AgentSettings 读取收敛为单飞资源，修复设置弹窗偶发一直 Loading
- Streamdown 升级至 v2.2：聊天流式输出启用逐词动画（仅最后一条 assistant 文本段；样式由 `@moryflow/ui/styles` 统一注入）
- Workspace Shell：导航改为 destination（Agent/Sites）+ agentSub（Chat/Workspace）；默认进入 Agent；支持 `Cmd+1/2/3` 快捷键（1/2 切 agentSub，3 打开 Sites）
- Workspace Shell：修复 ChatPanePortal 渲染容器与主视图容器语义，避免 Agent/Sites 初始错位（内容靠右/不占满）并提升切换流畅度
- useSpeechRecording：disabled 强制清理时保证 stopRecording Promise 正常收敛
- 侧边栏云同步 icon 仅在登录后显示，未登录时隐藏
- useSpeechRecording：disabled 为 true 时强制终止录音并清理资源，补充单测覆盖
- Providers 详情面板移除右侧 Provider Enable 开关
- Renderer 全量回退 Lucide 图标，移除 Icon 包装与 Hugeicons 依赖
- Providers 设置页补齐 Base URL 默认填充与输入项展示
- useWorkspaceFiles 增加请求去重/过期保护，避免工作区切换时旧请求覆盖
- Chat 输入框重排为左右工具区，@ 引用支持 MRU + 全量搜索且附件/引用胶囊统一
- Tasks Panel 使用 agents-tools browser 入口标签，避免 renderer 打包 fast-glob
- Chat 模式切换使用强制 mode 字段，移除冗余兜底与空值判断
- Chat 输入栏新增会话级模式切换入口，全权限切换确认并回写会话
- Chat Pane 发送/重试前触发 compaction 预处理，确保 UI 消息与历史索引一致
- Chat 工具审批卡：支持 once/always 并同步主进程审批
- ToolOutput 支持截断输出标识与“查看完整输出”入口
- 云同步 UI 精简：HoverCard 只保留状态/描述/最后同步/单一操作入口；设置页主视图仅开关+状态
- 设置弹窗 System Prompt：高级参数可选覆盖（Use model default）
- 设置弹窗 System Prompt 改用 `@moryflow/agents-runtime/prompt`，避免引入 server 依赖
- 会员常量导出收敛，移除未使用的等级比较/优先级常量
- Chat Pane 消息列表：ToolInput 空输入保护、Lucide 替换、渲染性能优化与条件渲染收敛
- Auth 改为 access 内存 + refresh 轮换，移除 pre-register
- Auth 表单：FormProvider props 做类型桥接，规避 react-hook-form 重复安装的类型冲突
- 模型选择禁用项移除占位日志，保持交互收敛
- Chat 输入与设置/发布等 UI 文案统一英文
- Chat Pane 新增 Tasks 面板（Sheet 列表 + 详情），通过 desktopAPI.tasks 只读刷新
- 文件树展开路径加载并发化，清理无效路径并保持 UI 响应
- 新增 Renderer hooks 单测（useVaultTreeState/useDocumentState/useChatSessions）
- hooks 单测使用 i18n mock，避免重复 React 实例导致测试崩溃
- 新增 Playwright E2E：创建 Vault、创建笔记自动保存、Settings 与 Sites 入口覆盖
- Desktop Auth Session：access token 持久化存储 + ensureAccessToken 单测使用长过期窗口
- Desktop Auth Session：网络失败不清理 token，窗口恢复触发 ensureAccessToken
- Desktop Auth Session：keytar 不可用时提示启用系统凭据
- Sites/Publish：未登录或未打开 Sites 页面时不再隐式请求站点列表，避免启动时 toast 循环与主进程 IPC error 噪音
- 新增通用 IPC 错误提取工具（`lib/ipc-errors.ts`），避免在各组件重复实现错误消息解析

## 依赖关系

```
renderer/
├── 通信 → preload（IPC 桥接）
├── 通信 → main（主进程服务）
├── 样式 → TailwindCSS + shadcn/ui
└── 功能文档 → docs/products/moryflow/features/
```

## IPC 通信模式

```
┌─────────────────────────────────────────┐
│              Renderer Process           │
│  ┌─────────────┐    ┌─────────────┐    │
│  │  Component  │ -> │   Hook      │    │
│  └─────────────┘    └──────┬──────┘    │
│                            │           │
│                     window.api.xxx()   │
└────────────────────────────┬───────────┘
                             │ IPC
┌────────────────────────────┴───────────┐
│              Preload Script            │
│         (contextBridge.exposeInMainWorld)
└────────────────────────────┬───────────┘
                             │ IPC
┌────────────────────────────┴───────────┐
│              Main Process              │
│         (ipcMain.handle/on)            │
└────────────────────────────────────────┘
```
