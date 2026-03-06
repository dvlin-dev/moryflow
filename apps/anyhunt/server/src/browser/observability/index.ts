/**
 * [PROVIDES]: observability 模块统一导出
 * [POS]: Browser 风险观测入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export {
  BrowserRiskTelemetryService,
  type BrowserRiskEvent,
  type BrowserRiskSummary,
} from './browser-risk-telemetry.service';

export {
  BROWSER_FAILURE_CLASSES,
  BROWSER_RISK_TELEMETRY_FIELDS,
  BROWSER_RISK_BASELINE_SAMPLES,
  type BrowserFailureClass,
  type BrowserRiskTelemetryField,
  type BrowserRiskTelemetryPayload,
  type BrowserRiskBaselineSample,
} from './risk-contract';
