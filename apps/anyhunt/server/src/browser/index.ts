/**
 * Browser 模块导出
 *
 * [PROVIDES]: Browser 模块对外导出
 * [POS]: 统一出口，避免跨模块直接引用内部实现
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export { BrowserModule } from './browser.module';
export { BrowserPool, BrowserUnavailableError } from './browser-pool';

// L2 API
export {
  BrowserSessionService,
  UrlNotAllowedError,
} from './browser-session.service';
export {
  SessionManager,
  SessionNotFoundError,
  SessionExpiredError,
  type BrowserSession,
} from './session';
export { SnapshotService } from './snapshot';
export { ActionHandler } from './handlers';
export { BrowserAgentPortService } from './ports';
export type {
  BrowserAgentPort,
  BrowserAgentSession,
  BrowserAgentSearchResult,
} from './ports';

// P2: CDP 连接
export {
  CdpConnectorService,
  CdpConnectionError,
  CdpEndpointError,
  type CdpConnectOptions,
  type CdpConnection,
} from './cdp';

// P2: 网络拦截
export {
  NetworkInterceptorService,
  InvalidInterceptRuleError,
} from './network';

// P2: 会话持久化 / Profile
export {
  StoragePersistenceService,
  StorageImportError,
  StorageExportError,
  ProfilePersistenceService,
  ProfilePersistenceNotConfiguredError,
} from './persistence';

// P2: 诊断与 Streaming
export { BrowserDiagnosticsService } from './diagnostics';
export { BrowserStreamService, StreamNotConfiguredError } from './streaming';

// DTOs
export * from './dto';

// Types
export type {
  BrowserInstance,
  WaitingRequest,
  BrowserPoolStatus,
} from './browser.types';

// Constants
export {
  BROWSER_POOL_SIZE,
  BROWSER_IDLE_TIMEOUT,
  BROWSER_ACQUIRE_TIMEOUT,
  MAX_PAGES_PER_BROWSER,
  DEFAULT_VIEWPORT_WIDTH,
  DEFAULT_VIEWPORT_HEIGHT,
} from './browser.constants';
