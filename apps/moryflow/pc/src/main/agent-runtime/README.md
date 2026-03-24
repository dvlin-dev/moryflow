# Agent Runtime

PC 端 Agent Runtime 已按子域拆分，目录职责如下：

- `index.ts`
  稳定入口，仅导出 runtime factory、session helper 和 vault context helper。
- `runtime/`
  composition root、toolchain、compaction、chat turn 执行、runtime config、vault context。
- `memory/`
  session-bound memory access、memory/knowledge tools、prompt block、knowledge file reader。
- `permission/`
  permission runtime、doom-loop、audit、bash audit。
- `tooling/`
  外部工具、skill tool、subagent tool、tool output storage。
- `mcp/`
  MCP manager 与工具桥接。
- `session/`
  chat session / task state runtime。
- `registry/`
  agent 定义与注册表读取。
- `prompt/`
  system prompt / model settings 解析。
- `tracing/`
  tracing 初始化与 server processor。

控制面设计事实源：

- `docs/design/moryflow/core/agent-runtime-control-plane-adr.md`
- `docs/design/moryflow/core/agent-tasks-system.md`
- `docs/design/moryflow/core/pc-permission-architecture.md`
