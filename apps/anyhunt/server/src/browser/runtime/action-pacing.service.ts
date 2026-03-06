/**
 * [INPUT]: sessionId + actionType
 * [OUTPUT]: 动作前置延迟结果
 * [POS]: Browser 动作节奏治理（高风险动作限速）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import type { ActionType } from '../dto';

interface ActionPacingRule {
  minDelayMs: number;
  maxDelayMs: number;
  burstThreshold: number;
  burstWindowMs: number;
  cooldownMs: number;
}

interface ActionPacingState {
  timestamps: number[];
  lastSeenAt: number;
}

export interface BeforeActionInput {
  sessionId: string;
  actionType: ActionType;
}

export interface BeforeActionResult {
  applied: boolean;
  delayMs: number;
}

const HIGH_RISK_ACTION_RULES: Partial<Record<ActionType, ActionPacingRule>> = {
  click: {
    minDelayMs: 120,
    maxDelayMs: 350,
    burstThreshold: 3,
    burstWindowMs: 2000,
    cooldownMs: 400,
  },
  dblclick: {
    minDelayMs: 120,
    maxDelayMs: 350,
    burstThreshold: 3,
    burstWindowMs: 2000,
    cooldownMs: 450,
  },
  fill: {
    minDelayMs: 120,
    maxDelayMs: 280,
    burstThreshold: 3,
    burstWindowMs: 2000,
    cooldownMs: 300,
  },
  type: {
    minDelayMs: 140,
    maxDelayMs: 320,
    burstThreshold: 3,
    burstWindowMs: 2500,
    cooldownMs: 350,
  },
  press: {
    minDelayMs: 100,
    maxDelayMs: 220,
    burstThreshold: 5,
    burstWindowMs: 2000,
    cooldownMs: 250,
  },
  drag: {
    minDelayMs: 160,
    maxDelayMs: 380,
    burstThreshold: 2,
    burstWindowMs: 2500,
    cooldownMs: 450,
  },
};

@Injectable()
export class ActionPacingService {
  private readonly states = new Map<string, ActionPacingState>();
  private readonly STATE_TTL_MS = 15 * 60 * 1000;
  private readonly MAX_STATE_KEYS = 10000;
  private readonly CLEANUP_INTERVAL_MS = 30 * 1000;
  private lastCleanupAt = 0;

  async beforeAction(input: BeforeActionInput): Promise<BeforeActionResult> {
    const rule = HIGH_RISK_ACTION_RULES[input.actionType];
    if (!rule) {
      return { applied: false, delayMs: 0 };
    }

    const now = Date.now();
    this.cleanupStatesIfNeeded(now);

    const key = `${input.sessionId}:${input.actionType}`;
    const state = this.getOrCreateState(key);
    state.lastSeenAt = now;

    state.timestamps = state.timestamps.filter(
      (timestamp) => now - timestamp <= rule.burstWindowMs,
    );

    const burstExceeded = state.timestamps.length + 1 > rule.burstThreshold;
    const jitterDelay = randomBetween(rule.minDelayMs, rule.maxDelayMs);
    const totalDelay = jitterDelay + (burstExceeded ? rule.cooldownMs : 0);

    state.timestamps.push(now);

    if (totalDelay > 0) {
      await sleep(totalDelay);
    }

    return { applied: true, delayMs: totalDelay };
  }

  private getOrCreateState(key: string): ActionPacingState {
    const existing = this.states.get(key);
    if (existing) return existing;

    const now = Date.now();
    const state: ActionPacingState = {
      timestamps: [],
      lastSeenAt: now,
    };
    this.states.set(key, state);
    return state;
  }

  cleanupSession(sessionId: string): void {
    const prefix = `${sessionId}:`;
    for (const key of this.states.keys()) {
      if (key.startsWith(prefix)) {
        this.states.delete(key);
      }
    }
  }

  private cleanupStatesIfNeeded(now: number): void {
    if (now - this.lastCleanupAt < this.CLEANUP_INTERVAL_MS) {
      return;
    }
    this.lastCleanupAt = now;

    for (const [key, state] of this.states) {
      if (now - state.lastSeenAt > this.STATE_TTL_MS) {
        this.states.delete(key);
      }
    }

    if (this.states.size <= this.MAX_STATE_KEYS) {
      return;
    }

    const sortable = [...this.states.entries()].sort(
      (a, b) => a[1].lastSeenAt - b[1].lastSeenAt,
    );
    for (const [key] of sortable) {
      if (this.states.size <= this.MAX_STATE_KEYS) {
        break;
      }
      this.states.delete(key);
    }
  }
}

const randomBetween = (min: number, max: number): number => {
  if (max <= min) return min;
  return Math.floor(min + Math.random() * (max - min + 1));
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
