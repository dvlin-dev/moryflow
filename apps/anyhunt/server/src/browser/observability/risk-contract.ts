/**
 * [DEFINES]: Browser 风险分类与遥测字段契约
 * [USED_BY]: navigation-retry, telemetry, tests
 * [POS]: Browser 合规自动化风险治理的基础契约（Step 0）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export const BROWSER_FAILURE_CLASSES = [
  'network',
  'access_control',
  'script',
] as const;

export type BrowserFailureClass = (typeof BROWSER_FAILURE_CLASSES)[number];

export const BROWSER_RISK_TELEMETRY_FIELDS = [
  'host',
  'reason',
  'policyId',
  'sessionId',
  'class',
] as const;

export type BrowserRiskTelemetryField =
  (typeof BROWSER_RISK_TELEMETRY_FIELDS)[number];

export interface BrowserRiskTelemetryPayload {
  host: string;
  reason: string;
  policyId?: string;
  sessionId: string;
  class: BrowserFailureClass | 'none';
}

export interface BrowserRiskBaselineSample {
  id: string;
  scenario: 'success' | 'http_403' | 'http_429' | 'challenge' | 'timeout';
  expectedClass: BrowserFailureClass | 'none';
  expectedRetry: boolean;
}

/**
 * Step 0 基线样本：用于回归验证风险分类与重试策略。
 */
export const BROWSER_RISK_BASELINE_SAMPLES: BrowserRiskBaselineSample[] = [
  {
    id: 'success_domcontentloaded',
    scenario: 'success',
    expectedClass: 'none',
    expectedRetry: false,
  },
  {
    id: 'http_403_forbidden',
    scenario: 'http_403',
    expectedClass: 'access_control',
    expectedRetry: false,
  },
  {
    id: 'http_429_rate_limited',
    scenario: 'http_429',
    expectedClass: 'access_control',
    expectedRetry: false,
  },
  {
    id: 'challenge_captcha',
    scenario: 'challenge',
    expectedClass: 'access_control',
    expectedRetry: false,
  },
  {
    id: 'timeout_navigation',
    scenario: 'timeout',
    expectedClass: 'network',
    expectedRetry: true,
  },
];
