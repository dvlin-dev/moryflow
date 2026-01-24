/**
 * [PROVIDES]: CDP 模块公共导出
 * [POS]: Browser CDP 连接对外入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export {
  CdpConnectorService,
  CdpConnectionError,
  CdpEndpointError,
  CdpPolicyError,
  type CdpConnectOptions,
  type CdpConnection,
} from './cdp-connector.service';
