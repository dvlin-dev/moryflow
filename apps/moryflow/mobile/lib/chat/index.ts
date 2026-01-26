/**
 * [PROVIDES]: MobileChatTransport - Mobile 聊天传输层
 * [DEPENDS]: agent-runtime - Agent 运行时
 * [POS]: Mobile 端聊天模块入口，封装 Agent 流式调用为 Transport 接口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

export { MobileChatTransport, type MobileChatTransportOptions } from './transport';
export { extractTextFromParts } from './utils';
export { approveToolRequest } from './approval-store';
