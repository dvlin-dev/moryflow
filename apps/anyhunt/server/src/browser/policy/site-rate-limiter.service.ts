/**
 * [INPUT]: host + 速率/并发预算
 * [OUTPUT]: 导航准入结果与并发释放句柄
 * [POS]: Browser 站点级速率与导航并发控制（内存态）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';

interface HostRateState {
  tokens: number;
  lastRefillAt: number;
  activeNavigations: number;
  lastSeenAt: number;
}

export type RateLimitReason = 'rate_limit' | 'concurrency_limit';

export class BrowserNavigationRateLimitError extends Error {
  constructor(
    public readonly host: string,
    public readonly policyId: string,
    public readonly reason: RateLimitReason,
  ) {
    super(
      reason === 'rate_limit'
        ? `Navigation rate limit exceeded for host: ${host}`
        : `Navigation concurrency limit exceeded for host: ${host}`,
    );
    this.name = 'BrowserNavigationRateLimitError';
  }
}

export interface NavigationQuotaInput {
  host: string;
  policyId: string;
  maxRps: number;
  maxBurst: number;
  maxConcurrentNavigationsPerHost: number;
}

@Injectable()
export class SiteRateLimiterService {
  private readonly states = new Map<string, HostRateState>();
  private readonly STATE_TTL_MS = 15 * 60 * 1000;
  private readonly MAX_HOST_STATES = 5000;
  private readonly CLEANUP_INTERVAL_MS = 30 * 1000;
  private lastCleanupAt = 0;

  acquireNavigationQuota(input: NavigationQuotaInput): () => void {
    const now = Date.now();
    this.cleanupStatesIfNeeded(now);

    const host = input.host.toLowerCase();
    const state = this.getOrCreateState(host, input.maxBurst, now);
    state.lastSeenAt = now;

    this.refillTokens(state, input.maxRps, input.maxBurst);

    if (state.tokens < 1) {
      throw new BrowserNavigationRateLimitError(
        host,
        input.policyId,
        'rate_limit',
      );
    }

    if (state.activeNavigations >= input.maxConcurrentNavigationsPerHost) {
      throw new BrowserNavigationRateLimitError(
        host,
        input.policyId,
        'concurrency_limit',
      );
    }

    state.tokens -= 1;
    state.activeNavigations += 1;

    let released = false;
    return () => {
      if (released) return;
      released = true;
      state.activeNavigations = Math.max(0, state.activeNavigations - 1);
      state.lastSeenAt = Date.now();
    };
  }

  private getOrCreateState(
    host: string,
    maxBurst: number,
    now: number,
  ): HostRateState {
    const existing = this.states.get(host);
    if (existing) return existing;

    const state: HostRateState = {
      tokens: Math.max(1, maxBurst),
      lastRefillAt: now,
      activeNavigations: 0,
      lastSeenAt: now,
    };
    this.states.set(host, state);
    return state;
  }

  private refillTokens(
    state: HostRateState,
    maxRps: number,
    maxBurst: number,
  ): void {
    const safeRps = Math.max(0.1, maxRps);
    const safeBurst = Math.max(1, maxBurst);

    const now = Date.now();
    const elapsedMs = Math.max(0, now - state.lastRefillAt);
    if (elapsedMs === 0) return;

    const refill = (elapsedMs / 1000) * safeRps;
    state.tokens = Math.min(safeBurst, state.tokens + refill);
    state.lastRefillAt = now;
  }

  private cleanupStatesIfNeeded(now: number): void {
    if (now - this.lastCleanupAt < this.CLEANUP_INTERVAL_MS) {
      return;
    }
    this.lastCleanupAt = now;

    for (const [host, state] of this.states) {
      const expired = now - state.lastSeenAt > this.STATE_TTL_MS;
      if (expired && state.activeNavigations === 0) {
        this.states.delete(host);
      }
    }

    if (this.states.size <= this.MAX_HOST_STATES) {
      return;
    }

    const removable = [...this.states.entries()]
      .filter(([, state]) => state.activeNavigations === 0)
      .sort((a, b) => a[1].lastSeenAt - b[1].lastSeenAt);

    for (const [host] of removable) {
      if (this.states.size <= this.MAX_HOST_STATES) {
        break;
      }
      this.states.delete(host);
    }
  }
}
