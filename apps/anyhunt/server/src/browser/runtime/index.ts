/**
 * [PROVIDES]: runtime 模块统一导出
 * [POS]: Browser 运行时治理入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export {
  ActionPacingService,
  type BeforeActionInput,
  type BeforeActionResult,
} from './action-pacing.service';

export {
  NavigationRetryService,
  BrowserNavigationError,
  type NavigationFailureReason,
  type NavigationRetryInput,
  type NavigationResultCheckInput,
} from './navigation-retry.service';
