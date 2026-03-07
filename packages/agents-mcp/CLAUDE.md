# /agents-mcp

> MCP 服务器连接与工具装配（stdio / streamable HTTP）

## 职责范围

- 按配置创建 MCP 服务器实例
- 统一 MCP 生命周期（官方 `connectMcpServers` / `MCPServers`）
- 从 MCP 服务获取工具并转换为 Agent 工具

## 入口与关键文件

- `src/index.ts`：对外导出
- `src/server-factory.ts`：服务器实例构建
- `src/connection.ts`：官方生命周期包装（open/close）
- `src/tools.ts`：工具提取与转换

## 约束与约定

- React Native 端暂不支持 HTTP MCP（等待 upstream SDK）
- Node 端 stdio MCP 仅用于桌面/服务端环境

## 变更同步

- 仅在目录职责、连接契约或跨包边界失真时更新本文件
- 如影响跨包依赖，更新根 `CLAUDE.md`
