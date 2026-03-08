/**
 * [PROVIDES]: observability 模块统一导出
 * [POS]: Browser 风险观测入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
