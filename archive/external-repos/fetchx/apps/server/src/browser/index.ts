/**
 * Browser 模块导出
 */

export { BrowserModule } from './browser.module';
export { BrowserPool, BrowserUnavailableError } from './browser-pool';

// Types
export type { BrowserInstance, WaitingRequest, BrowserPoolStatus } from './browser.types';

// Constants
export {
  BROWSER_POOL_SIZE,
  BROWSER_IDLE_TIMEOUT,
  BROWSER_ACQUIRE_TIMEOUT,
  MAX_PAGES_PER_BROWSER,
  DEFAULT_VIEWPORT_WIDTH,
  DEFAULT_VIEWPORT_HEIGHT,
} from './browser.constants';
