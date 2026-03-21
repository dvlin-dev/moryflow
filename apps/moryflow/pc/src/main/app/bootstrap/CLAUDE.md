# Bootstrap

> 仅在 `app/bootstrap` 目录职责、结构边界或跨模块契约变化时更新。

## 定位

主进程启动编排层，负责把 `index.ts` 中的全局生命周期逻辑拆成可测试的启动模块。

## 约束

- `index.ts` 只负责组装依赖、调用 bootstrap 模块和挂接 Electron 顶层事件
- `app/bootstrap/*` 允许编排多个服务，但不直接承载具体业务存储实现
- Deep Link、single-instance、membership reconcile、startup/shutdown、workspace-scoped runtime reset 必须各自有独立边界
- 若 bootstrap 模块需要访问运行时可变控制器，优先通过 getter/ref 注入，禁止捕获会过期的实例引用

## 成员

| 文件                      | 说明                                                  |
| ------------------------- | ----------------------------------------------------- |
| `deep-link-controller.ts` | Deep Link 队列、OAuth 回调与支付回调分发              |
| `workspace-runtime.ts`    | 工作区作用域 runtime reset 与 Quick Chat session 解析 |
| `main-window-runtime.ts`  | 主窗口创建、聚焦与关闭清理状态机                      |
| `protocol-lifecycle.ts`   | 协议注册、single-instance、`open-url` 路由            |
| `membership-reconcile.ts` | membership token/user 变化后的串行 reconcile          |
| `lifecycle.ts`            | `whenReady` 启动序列与 `before-quit` 关闭序列         |
