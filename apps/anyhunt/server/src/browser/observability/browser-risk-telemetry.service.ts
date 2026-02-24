/**
 * [INPUT]: policy/navigation/action 风险事件
 * [OUTPUT]: 结构化风险事件日志与聚合摘要
 * [POS]: Browser 合规自动化遥测中心（Step 6）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import type { BrowserFailureClass } from './risk-contract';

export type BrowserRiskClass = BrowserFailureClass | 'none';

export interface BrowserRiskEvent {
  type:
    | 'policy_block'
    | 'rate_limit_block'
    | 'navigation_result'
    | 'action_pacing';
  timestamp: number;
  host: string;
  reason: string;
  policyId?: string;
  sessionId: string;
  class: BrowserRiskClass;
  success?: boolean;
  delayMs?: number;
  actionType?: string;
}

export interface BrowserRiskSummary {
  windowMs: number;
  navigation: {
    total: number;
    success: number;
    failed: number;
    successRate: number;
  };
  topReasons: Array<{ reason: string; count: number }>;
  topHosts: Array<{ host: string; count: number }>;
  actionPacing: {
    delayedActions: number;
    avgDelayMs: number;
  };
  recommendations: string[];
}

interface EventInput {
  host: string;
  reason: string;
  policyId?: string;
  sessionId: string;
  class: BrowserRiskClass;
}

interface NavigationResultInput extends EventInput {
  success: boolean;
}

interface ActionPacingInput {
  sessionId: string;
  host: string;
  policyId?: string;
  actionType: string;
  delayMs: number;
}

@Injectable()
export class BrowserRiskTelemetryService {
  private readonly eventsBySession = new Map<string, BrowserRiskEvent[]>();
  private readonly MAX_EVENTS_PER_SESSION = 2000;
  private readonly DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

  recordPolicyBlock(input: EventInput): void {
    this.pushEvent({
      type: 'policy_block',
      timestamp: Date.now(),
      host: normalizeHost(input.host),
      reason: input.reason,
      policyId: input.policyId,
      sessionId: input.sessionId,
      class: input.class,
      success: false,
    });
  }

  recordRateLimitBlock(input: EventInput): void {
    this.pushEvent({
      type: 'rate_limit_block',
      timestamp: Date.now(),
      host: normalizeHost(input.host),
      reason: input.reason,
      policyId: input.policyId,
      sessionId: input.sessionId,
      class: input.class,
      success: false,
    });
  }

  recordNavigationResult(input: NavigationResultInput): void {
    this.pushEvent({
      type: 'navigation_result',
      timestamp: Date.now(),
      host: normalizeHost(input.host),
      reason: input.reason,
      policyId: input.policyId,
      sessionId: input.sessionId,
      class: input.class,
      success: input.success,
    });
  }

  recordActionPacing(input: ActionPacingInput): void {
    this.pushEvent({
      type: 'action_pacing',
      timestamp: Date.now(),
      host: normalizeHost(input.host),
      reason: `action_pacing_${input.actionType}`,
      policyId: input.policyId,
      sessionId: input.sessionId,
      class: 'script',
      delayMs: input.delayMs,
      actionType: input.actionType,
    });
  }

  getSessionEvents(
    sessionId: string,
    windowMs = this.DEFAULT_WINDOW_MS,
  ): BrowserRiskEvent[] {
    const events = this.eventsBySession.get(sessionId) ?? [];
    const startAt = Date.now() - Math.max(1, windowMs);
    return events.filter((event) => event.timestamp >= startAt);
  }

  getSessionSummary(
    sessionId: string,
    windowMs = this.DEFAULT_WINDOW_MS,
  ): BrowserRiskSummary {
    const events = this.getSessionEvents(sessionId, windowMs);
    const navigationEvents = events.filter(
      (event) => event.type === 'navigation_result',
    );
    const successCount = navigationEvents.filter(
      (event) => event.success,
    ).length;
    const failedCount = navigationEvents.length - successCount;
    const successRate =
      navigationEvents.length === 0
        ? 0
        : Number((successCount / navigationEvents.length).toFixed(4));

    const riskEvents = events.filter(
      (event) =>
        event.type === 'policy_block' ||
        event.type === 'rate_limit_block' ||
        (event.type === 'navigation_result' && event.success === false),
    );
    const reasonCounter = counterBy(riskEvents, (event) => event.reason);
    const hostCounter = counterBy(riskEvents, (event) => event.host);
    const sortedReasons = sortCounterEntries(reasonCounter);
    const sortedHosts = sortCounterEntries(hostCounter);
    const pacingEvents = events.filter(
      (event) => event.type === 'action_pacing',
    );
    const totalDelayMs = pacingEvents.reduce(
      (sum, event) => sum + (event.delayMs ?? 0),
      0,
    );
    const avgDelayMs =
      pacingEvents.length === 0
        ? 0
        : Number((totalDelayMs / pacingEvents.length).toFixed(2));

    return {
      windowMs,
      navigation: {
        total: navigationEvents.length,
        success: successCount,
        failed: failedCount,
        successRate,
      },
      topReasons: sortedReasons.map((item) => ({
        reason: item.key,
        count: item.count,
      })),
      topHosts: sortedHosts.map((item) => ({
        host: item.key,
        count: item.count,
      })),
      actionPacing: {
        delayedActions: pacingEvents.length,
        avgDelayMs,
      },
      recommendations: buildRecommendations({
        hasNavigation: navigationEvents.length > 0,
        topReasons: sortedReasons.map((item) => ({
          reason: item.key,
          count: item.count,
        })),
        successRate,
      }),
    };
  }

  cleanupSession(sessionId: string): void {
    this.eventsBySession.delete(sessionId);
  }

  private pushEvent(event: BrowserRiskEvent): void {
    const events = this.eventsBySession.get(event.sessionId) ?? [];
    events.push(event);
    if (events.length > this.MAX_EVENTS_PER_SESSION) {
      events.splice(0, events.length - this.MAX_EVENTS_PER_SESSION);
    }
    this.eventsBySession.set(event.sessionId, events);
  }
}

const normalizeHost = (host: string): string => {
  const value = host.trim().toLowerCase();
  return value || 'unknown';
};

const counterBy = <T>(
  list: T[],
  getKey: (item: T) => string,
): Map<string, number> => {
  const map = new Map<string, number>();
  for (const item of list) {
    const key = getKey(item) || 'unknown';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
};

const sortCounterEntries = (
  counter: Map<string, number>,
): Array<{ key: string; count: number }> => {
  return [...counter.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
};

const buildRecommendations = (input: {
  hasNavigation: boolean;
  topReasons: Array<{ reason: string; count: number }>;
  successRate: number;
}): string[] => {
  const recommendations: string[] = [];
  if (!input.hasNavigation) {
    return ['No navigation data in the selected time window.'];
  }
  const reasons = input.topReasons.map((item) => item.reason);
  const hasRateLimitedReason = reasons.some(
    (reason) =>
      reason.includes('429') ||
      reason.includes('rate_limit') ||
      reason.includes('concurrency'),
  );
  const hasAccessControlReason = reasons.some(
    (reason) => reason.includes('403') || reason.includes('challenge'),
  );

  if (hasRateLimitedReason) {
    recommendations.push(
      'Reduce host-level concurrency or lower navigation request rate.',
    );
  }

  if (hasAccessControlReason) {
    recommendations.push(
      'Check site policy and authorization, then avoid repeated blocked retries.',
    );
  }

  if (input.successRate < 0.7) {
    recommendations.push(
      'Increase pacing interval and keep retries limited to network failures.',
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Risk is stable. Keep current policy settings.');
  }

  return recommendations;
};
