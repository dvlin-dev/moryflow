# IPC Shell

> ⚠️ 本目录（含子目录）结构、职责边界或跨模块契约变更时，必须同步更新此文档

## 定位

Electron main process 的 IPC 壳层目录，只负责注册、payload 校验、依赖装配与跨窗口广播。

## 目录职责

| 路径                                   | 说明                                                        |
| -------------------------------------- | ----------------------------------------------------------- |
| `register-handlers.ts`                 | IPC 总入口；只做共享依赖装配、订阅绑定与 registrar 调用     |
| `runtime-register.ts` + `runtime/`     | 应用运行时、Quick Chat、更新、shell 外链 IPC                |
| `workspace-register.ts` + `workspace/` | Vault、workspace state、文件操作、搜索 IPC                  |
| `integrations-register.ts`             | 集成域聚合入口                                              |
| `agent-register.ts`                    | Agent settings / MCP / skills / provider test IPC           |
| `membership-register.ts`               | membership token-first auth、session、OAuth loopback IPC    |
| `telegram-register.ts`                 | Telegram 绑定、状态订阅与发送测试 IPC                       |
| `ollama-register.ts`                   | Ollama 安装、探测、拉取进度广播 IPC                         |
| `cloud-sync-register.ts`               | Cloud Sync 绑定、状态、usage、重试与恢复 IPC                |
| `automations.ts`                       | 自动化任务 CRUD / run-now / runs 查询 IPC                   |
| `memory-domain/`                       | Memory overview、facts、graph、workspace file read IPC 适配 |
| `shared.ts`                            | `IpcMainLike`、广播、通用 payload/结果 helper               |

## 关键约束

- `register-handlers.ts` 禁止承载业务实现；任何域内逻辑都必须下沉到 registrar 或 domain helper。
- `runtime-register.ts` 与 `workspace-register.ts` 只允许做 registrar 聚合；具体 channel 不再直接堆在单文件内。
- Memory IPC 不再保留兼容 barrel；调用方必须直接引用 `memory-domain/` 下的稳定模块。
- payload 容错和 fail-fast 语义必须与 renderer/preload 契约保持一致；拆分时禁止放宽校验。
- 跨窗口广播统一使用 `shared.ts` 里的 `broadcastToAllWindows()`。
