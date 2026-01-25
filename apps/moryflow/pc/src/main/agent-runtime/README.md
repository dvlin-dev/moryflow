# Agent Runtime Skeleton

此目录用于承载 openai-agents-js 的运行时代码，统一负责：

1. 初始化基础模型（`@openai/agents-core` + `@ai-sdk/openai` + `@openai/agents-extensions`）。
2. 注册本地工具、MCP 连接以及多智能体编排拓扑。
3. 向 Electron 主进程暴露 `runChatTurn` 等方法，供 IPC 聊天管道调用。

该目录作为 PC 端 Agent Runtime 主入口，控制面能力以 ADR-0002 为实现基线逐项落地。
细节以 docs/architecture/adr/adr-0002-agent-runtime-control-plane.md 为准。
