# Agent Runtime Skeleton

此目录用于承载 openai-agents-js 的运行时代码，统一负责：

1. 初始化基础模型（`@openai/agents-core` + `@ai-sdk/openai` + `@openai/agents-extensions`）。
2. 注册本地工具、MCP 连接以及多智能体编排拓扑。
3. 向 Electron 主进程暴露 `runChatTurn` 等方法，供 IPC 聊天管道调用。

当前仅保留最小化骨架，后续按 OpenAI Agents 官方文档的 TODO 依次补齐：
https://openai.github.io/openai-agents-js/
