# IPC

> 仅在 `app/ipc` 目录职责、边界、跨模块契约变化时更新。

## 定位

主进程 IPC 组合层。该目录只负责：

- 按功能域注册 `ipcMain.handle` / `ipcMain.on`
- 组装各域 handler 依赖
- 保留少量跨域共享 helper

## 约束

- `index.ts` 是 composition root，不承载具体业务分支逻辑
- 新增 IPC 通道时，优先归入现有功能域注册器；只有职责明显独立时才新增新的 `*-handlers.ts`
- `memory-handlers.ts` / `cloud-sync-handlers.ts` 这类纯函数文件负责单个用例实现；`*-registration.ts` 或 `*-handlers.ts` 负责 Electron IPC 注册
- 跨域广播统一复用上层注入的 `broadcastToAllWindows`
- 通道名、payload 结构、返回 JSON 结构必须与 `src/shared/ipc/*` 保持一致

## 成员

| 文件                          | 说明                                            |
| ----------------------------- | ----------------------------------------------- |
| `index.ts`                    | IPC 总入口，只负责依赖组装与注册顺序            |
| `app-shell-handlers.ts`       | 应用壳层、快捷窗口、更新与外链通道              |
| `vault-workspace-handlers.ts` | Vault、Workspace、Files 通道                    |
| `search-handlers.ts`          | 搜索相关通道                                    |
| `memory-registration.ts`      | Memory IPC 注册入口                             |
| `memory-handlers.ts`          | Memory 用例纯函数                               |
| `agent-handlers.ts`           | Agent settings、skills、provider test、MCP 通道 |
| `membership-handlers.ts`      | Membership token / OAuth / session 通道         |
| `telegram-handlers.ts`        | Telegram channel 设置与配对通道                 |
| `ollama-handlers.ts`          | Ollama 模型管理通道                             |
| `cloud-sync-registration.ts`  | Cloud Sync 依赖组装与注册                       |
| `cloud-sync-handlers.ts`      | Cloud Sync 纯函数用例                           |
| `automations-handlers.ts`     | Automations 注册入口                            |
