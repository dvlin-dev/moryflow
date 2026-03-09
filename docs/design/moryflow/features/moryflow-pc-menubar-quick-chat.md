---
title: Moryflow PC 菜单栏常驻与快速对话方案（macOS 确认版）
date: 2026-03-05
scope: apps/moryflow/pc
status: completed
---

<!--
[INPUT]:
- 现状：Moryflow PC 关闭窗口后在 macOS 仍常驻进程，Telegram 可继续交互，但用户缺少可见入口，体感像“软件已关闭”。
- 用户确认：托盘右键菜单不放 TG 控制项；保留收到消息后的 badge。
- 现状补充：`Launch at Login` 当前尚未实现，需要在本期落地。

[OUTPUT]:
- 已确认单方案（UI/UX + 技术实现 + 实施步骤 + 验收标准），删除未采用分支。

[POS]:
- Moryflow PC（macOS）菜单栏常驻与 Quick Chat 入口单一事实源。

[PROTOCOL]: 仅在相关索引、跨文档事实引用或全局协作边界失真时，才同步更新对应文档。
-->

# Moryflow PC 菜单栏常驻与快速对话方案（macOS 确认版）

## 1. 背景与根因

基于当前实现（`apps/moryflow/pc/src/main/index.ts` + `app/main-window.ts`）可确认：

1. macOS 下关闭最后一个窗口不会退出应用（`window-all-closed` 在 darwin 不 quit）。
2. 当前没有菜单栏入口，用户关窗后看不到“应用仍在运行”的状态锚点。
3. 关窗语义未产品化，导致“进程还在，但像已经关闭”的认知断层。

结论：需要补齐可见化入口、快速唤起路径、明确退出路径。

## 2. 已确认产品决策

1. 默认“关闭窗口=隐藏到菜单栏”，不默认退出。
2. 菜单栏左键：快速打开/收起居中 Quick Chat。
3. 菜单栏右键菜单：不包含任何 TG 控制项。
4. 收到新消息后显示菜单栏 badge。
5. 保持用户友好、轻量交互，不做过度设计。
6. `Launch at Login` 在本期实现，不延后。

## 3. 确认版 UI/UX

## 3.1 菜单栏图标与 badge

1. 常驻菜单栏模板图标（随系统浅/深色自动适配）。
2. `idle`：无 badge。
3. `active`：有未读消息时显示 badge（点或数字，默认点）。

## 3.2 左键行为（Quick Chat）

1. 左键点击菜单栏图标：
   - 未打开：在当前活动屏幕中心打开 Quick Chat。
   - 已打开且聚焦：收起（hide）。
   - 已打开未聚焦：前置并聚焦。
2. 默认快捷键：`Cmd+Shift+M`。
3. `Esc` 收起面板，`Cmd+Enter` 发送。

## 3.3 右键菜单（确认版）

固定菜单项：

1. `Open`
2. `Quick Chat`
3. `Launch at Login`（checkbox）
4. `Quit`

说明：菜单中不放 Telegram 开关或运行状态项；`Launch at Login` 勾选状态必须与系统真实状态一致。

## 3.4 关闭语义与首次提示

1. 主窗口点击关闭按钮时默认隐藏，不退出。
2. 首次触发隐藏时提示一次：`Moryflow is still running in your menu bar.`
3. 设置页提供可切换项：`When closing window: Hide to menu bar | Quit app`。

## 3.5 Quick Chat 面板（轻量版）

1. 建议尺寸：`760x560`，圆角与阴影保持克制。
2. 顶部：应用名 + 简短状态文案。
3. 中部：当前快捷会话消息流。
4. 底部：输入框 + 发送按钮（保留最小 model/skill 切换）。

## 4. 技术实现（确认版）

## 4.1 模块落位

1. `apps/moryflow/pc/src/main/app/menubar-controller.ts`
2. `apps/moryflow/pc/src/main/app/quick-chat-window.ts`
3. `apps/moryflow/pc/src/main/app/window-lifecycle-policy.ts`
4. `apps/moryflow/pc/src/main/app/app-runtime-settings.ts`

## 4.2 窗口生命周期

1. `mainWindow`：沿用现有主窗口。
2. `quickChatWindow`：新增单例轻量窗口（show/hide，不反复销毁）。
3. `closeBehavior=hide_to_menubar`：拦截 `close` 并 `hide`。
4. `closeBehavior=quit`：放行关闭。
5. `before-quit` 设置 `isQuitting=true`，确保主动退出不被拦截。

## 4.3 菜单栏事件

1. `Tray` 使用 macOS template icon（`nativeImage.setTemplateImage(true)`）。
2. `click`：toggle Quick Chat。
3. `right-click`：弹出固定右键菜单（仅 4 项）。

## 4.4 badge 数据来源

1. 外部入站消息写入会话后，主进程更新 `unreadCount`。
2. `unreadCount > 0` 显示 badge；打开 Quick Chat 或主窗口对应会话后清零。
3. badge 仅反映“新消息可读性”，不承载渠道控制状态。
4. `unreadCount` 为运行时内存态，不做持久化；应用重启后从 `0` 开始，再由后续消息事件驱动。

## 4.5 Quick Chat 数据流

1. 复用现有 `chat` IPC（`send/getSessionMessages/onMessageEvent`）。
2. Quick Chat 绑定“快捷会话”ID（首轮自动创建并持久化）。
3. 消息刷新按现有 `revision` 合同处理，避免和主窗口互相回滚。

## 4.6 IPC 合同（新增）

已新增 `shared/ipc/quick-chat.ts` 并接入 `desktop-api.ts`：

1. `quickChat.toggle(): Promise<void>`
2. `quickChat.open(): Promise<void>`
3. `quickChat.close(): Promise<void>`
4. `quickChat.getState(): Promise<{ visible: boolean; focused: boolean; sessionId: string | null }>`

已新增 `appRuntime` 合同：

1. `appRuntime.getCloseBehavior()`
2. `appRuntime.setCloseBehavior('hide_to_menubar' | 'quit')`
3. `appRuntime.getLaunchAtLogin(): Promise<{ enabled: boolean; supported: boolean; source: 'system' }>`
4. `appRuntime.setLaunchAtLogin(enabled: boolean): Promise<{ enabled: boolean; supported: boolean; source: 'system' }>`
5. 错误语义统一：设置失败时 Promise reject，错误码限定为：
   - `UNSUPPORTED_PLATFORM`
   - `SYSTEM_API_ERROR`

## 4.7 Launch at Login 实现细节（本期）

1. 新增主进程模块：`apps/moryflow/pc/src/main/app/launch-at-login.ts`，提供：
   - `getLaunchAtLoginState()`
   - `setLaunchAtLoginEnabled(enabled: boolean)`
2. macOS 采用 Electron 原生 API：
   - 读取：`app.getLoginItemSettings()`
   - 设置：`app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true })`
3. 启动场景处理：
   - 启动时若检测为“登录项启动”（`app.getLoginItemSettings().wasOpenedAtLogin === true`），默认不主动弹主窗口（保持后台常驻 + 菜单栏可见）。
   - 普通启动保持现有行为（可见主窗口）。
4. 状态事实源：
   - `Launch at Login` 的真值以系统 API 返回为准，不以本地 store 作为事实源，避免状态漂移。
5. 失败处理：
   - 设置失败时抛结构化错误（见 4.6 错误码），Renderer 回滚 checkbox 状态并提示失败。
6. 兼容策略（仅实现边界说明）：
   - 本期验收范围为 macOS；
   - 非 macOS 返回 `supported=false`，且 UI 隐藏该项，不展示不可用开关。

## 4.8 持久化字段

新建 `app-runtime` store：

1. `closeBehavior: 'hide_to_menubar' | 'quit'`（默认 `hide_to_menubar`）
2. `quickChatShortcut: string`（默认 `CommandOrControl+Shift+M`）
3. `quickChatSessionId: string | null`

说明：

1. `launchAtLogin` 不写入该 store，以系统登录项状态为单一事实源。
2. `unreadCount` 不写入该 store，避免重启后出现过时 badge。

## 5. 实施步骤（执行顺序）

1. 主进程：实现 `menubar-controller` 与 `quick-chat-window`。
2. 主进程：接入 `window-lifecycle-policy`（close hide/quit 两策略）。
3. 主进程：新增 `launch-at-login.ts`，接入 `app.getLoginItemSettings / setLoginItemSettings`。
4. IPC/Preload：补齐 `quickChat` 与 `appRuntime` 接口（含 launch-at-login 状态读写）。
5. Renderer：新增 Quick Chat 轻量页面。
6. 菜单与设置页：接入 `Launch at Login` 实时状态与切换（失败回滚）。
7. 接入 unread badge 计数与清零逻辑。

## 6. 验收标准

## 6.1 用户验收

1. 关闭主窗口后，菜单栏图标仍存在。
2. 左键图标可快速打开/收起 Quick Chat。
3. 右键菜单仅包含已确认的 4 项，无 TG 控制项。
4. 收到新消息后出现 badge；阅读后 badge 清除。
5. 在 macOS 打包产物（非 dev）中切换 `Launch at Login` 后重启应用，系统登录项状态与 UI 一致。

## 6.2 自动化测试

1. `menubar-controller.test.ts`：左键/右键行为与菜单项断言。
2. `quick-chat-window.test.ts`：单例、toggle、focus/hide。
3. `window-lifecycle-policy.test.ts`：hide/quit 分支。
4. `launch-at-login.test.ts`：系统状态读取、设置参数、失败回滚分支。
5. IPC 测试：`quickChat`、`appRuntime` 契约（含 `supported=false` 分支）。
6. 受影响校验：
   - `pnpm --filter @moryflow/pc typecheck`
   - `pnpm --filter @moryflow/pc test:unit`

## 7. 风险与规避

1. 风险：无法退出应用。  
   规避：`before-quit` 放行 + 菜单明确 `Quit`。

2. 风险：Quick Chat 与主窗口并发刷新导致闪回。  
   规避：严格使用现有 `revision` 单调校验。

3. 风险：打包后托盘图标路径异常。  
   规避：开发/生产双路径加载与单测覆盖。

4. 风险：`Launch at Login` 显示状态与系统状态不一致。  
   规避：统一以 `app.getLoginItemSettings()` 作为事实源，不信任本地缓存。

## 8. 当前实现收口

1. 主进程已落地 `menubar-controller.ts`、`quick-chat-window.ts`、`window-lifecycle-policy.ts`、`launch-at-login.ts` 与 `app-runtime-settings.ts`，菜单栏、Quick Chat、关窗语义与登录项入口已形成单一实现。
2. 菜单栏左键固定用于 Quick Chat 显隐，右键固定为 `Open / Quick Chat / Launch at Login / Quit`，不承载 Telegram 控制项。
3. Quick Chat 复用现有 chat IPC 与快捷会话，主窗口与浮层共用同一 revision/data contract，不额外引入第二套消息状态。
4. badge 仅由运行时未读计数驱动，不做持久化；`before-quit` 与删除事件会清理相关 tracker，避免长期运行残留。
5. `Launch at Login` 以系统 API 为唯一事实源，非 macOS 统一返回 `supported=false`，设置失败必须回滚 UI。

## 9. 当前验证基线

1. 自动化验证覆盖主进程窗口生命周期、菜单栏控制、登录项读写、IPC/preload 合同与未读 tracker。
2. 受影响校验以 `pnpm --filter @moryflow/pc typecheck` 与 `pnpm --filter @moryflow/pc test:unit` 为准。
3. 打包产物上的 `Launch at Login` 仍需要在真实 macOS 环境做一次人工验收；这属于运行环境验证，不再写入步骤日志。
