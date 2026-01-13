/**
 * Browser 模块导出
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
