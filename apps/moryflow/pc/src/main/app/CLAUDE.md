# App Shell

> ⚠️ 本目录（含子目录）结构、职责边界或跨模块契约变更时，必须同步更新此文档

## 定位

Electron main process 的壳层模块目录，承载窗口、IPC、runtime、安全、菜单栏与更新能力。

## 目录职责

| 目录         | 说明                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------ |
| `ipc/`       | IPC 注册入口与按域 registrar；按 `runtime/`、`workspace/`、`memory-domain/` 等子域继续拆分 |
| `windows/`   | 主窗口、Quick Chat、生命周期策略、深链窗口策略、共享导航守卫                               |
| `runtime/`   | 应用运行时 store、Launch at Login、membership runtime、fs 事件桥接                         |
| `security/`  | 外链策略、membership auth headers 等安全边界                                               |
| `menubar/`   | 菜单栏控制器、未读 badge、revision tracker                                                 |
| `updates/`   | 更新服务与更新设置持久化                                                                   |
| `preload/`   | preload 入口解析                                                                           |
| `packaging/` | 打包/发布相关契约测试                                                                      |

## 关键约束

- `ipc/register-handlers.ts` 只保留依赖装配、订阅广播和 registrar 调用；具体域逻辑下沉到各自模块。
- `ipc/runtime-register.ts` 与 `ipc/workspace-register.ts` 只保留聚合职责，具体 channel 注册分别下沉到 `ipc/runtime/*`、`ipc/workspace/*`。
- Memory IPC 实现统一维护在 `ipc/memory-domain/*`，禁止再回退到单文件或兼容 barrel。
- 窗口外链与导航拦截统一通过 `windows/shared/external-navigation-guards.ts` 绑定；禁止在单个窗口重复实现安全边界。
- 运行时持久化按子域拆分：
  - `runtime/preferences-store.ts`：主应用偏好
  - `windows/quick-chat/quick-chat-store.ts`：Quick Chat 会话/快捷键
  - `updates/update-settings-store.ts`：更新设置
- 单测默认与实现就地 colocate，统一使用 `*.test.ts`。

## 入口关系

- 主进程入口：`../index.ts`
- IPC 类型事实源：`../../shared/ipc/`
- preload bridge：`../../preload/index.ts`
