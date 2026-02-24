import { describe, expect, it } from 'vitest';
import {
  BROWSER_FAILURE_CLASSES,
  BROWSER_RISK_BASELINE_SAMPLES,
  BROWSER_RISK_TELEMETRY_FIELDS,
} from '../observability/risk-contract';

describe('risk contract', () => {
  it('defines expected failure classes', () => {
    expect(BROWSER_FAILURE_CLASSES).toEqual([
      'network',
      'access_control',
      'script',
    ]);
  });

  it('defines expected telemetry fields', () => {
    expect(BROWSER_RISK_TELEMETRY_FIELDS).toEqual([
      'host',
      'reason',
      'policyId',
      'sessionId',
      'class',
    ]);
  });

  it('contains baseline samples for agreed scenarios', () => {
    const scenarios = BROWSER_RISK_BASELINE_SAMPLES.map(
      (sample) => sample.scenario,
    );
    expect(scenarios).toEqual(
      expect.arrayContaining([
        'success',
        'http_403',
        'http_429',
        'challenge',
        'timeout',
      ]),
    );
  });
});
