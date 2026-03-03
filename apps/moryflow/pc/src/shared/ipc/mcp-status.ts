/**
 * MCP 状态类型
 *
 * 重新导出 agent-runtime-mcp 的类型，保持 PC 端 IPC 兼容性
 */

export type {
  McpServerStatus,
  McpServerState,
  McpStatusSnapshot,
  McpStatusEvent,
} from '@moryflow/agents-mcp';

export type McpTestInput =
  | {
      type: 'stdio';
      config: {
        name: string;
        packageName: string;
        binName?: string;
        args?: string[];
        env?: Record<string, string>;
      };
    }
  | {
      type: 'http';
      config: {
        name: string;
        url: string;
        authorizationHeader?: string;
        headers?: Record<string, string>;
      };
    };

export interface McpTestResult {
  success: boolean;
  toolCount?: number;
  toolNames?: string[];
  error?: string;
}
