/**
 * [PROVIDES]: CDP 模块公共导出
 * [POS]: Browser CDP 连接对外入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export {
  CdpConnectorService,
  CdpConnectionError,
  CdpEndpointError,
  CdpPolicyError,
  type CdpConnectOptions,
  type CdpConnection,
} from './cdp-connector.service';
