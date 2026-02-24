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

- 修改连接/重试策略后，更新本文件的“近期变更”
- 如影响跨包依赖，更新根 `CLAUDE.md`

## 近期变更

- MCP 连接生命周期切换到官方 helper：`openMcpServers` / `closeMcpServers`（移除自研重试/超时编排）
- MCP 连接与工具装配基线梳理
- MCP 工具挂载 serverId，供权限系统识别来源

---

_版本: 1.0 | 更新日期: 2026-01-24_
