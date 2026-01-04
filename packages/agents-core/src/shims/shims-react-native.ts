/**
 * React Native 环境的 shims 实现
 *
 * RN 环境不支持 Node.js 核心模块，需要使用 polyfill 或替代实现：
 * - EventEmitter: 自定义轻量实现
 * - crypto.randomUUID: expo-crypto 或 fallback
 * - ReadableStream: web-streams-polyfill（需在入口处引入）
 * - AsyncLocalStorage: 简化实现（不支持完整功能）
 */

import type { EventEmitter, Timeout, Timer } from './interface';

// ============ EventEmitter ============

type EventMap = Record<string, any[]>;

/**
 * 轻量级 EventEmitter 实现，不依赖 node:events
 */
export class RNEventEmitter<
  EventTypes extends EventMap = Record<string, any[]>,
> implements EventEmitter<EventTypes> {
  private listeners = new Map<keyof EventTypes, Set<(...args: unknown[]) => void>>();

  on<K extends keyof EventTypes>(type: K, listener: (...args: EventTypes[K]) => void): this {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
    return this;
  }

  off<K extends keyof EventTypes>(type: K, listener: (...args: EventTypes[K]) => void): this {
    this.listeners.get(type)?.delete(listener);
    return this;
  }

  emit<K extends keyof EventTypes>(type: K, ...args: EventTypes[K]): boolean {
    const listeners = this.listeners.get(type);
    if (!listeners || listeners.size === 0) return false;
    listeners.forEach((listener) => listener(...args));
    return true;
  }

  once<K extends keyof EventTypes>(type: K, listener: (...args: EventTypes[K]) => void): this {
    const onceListener = (...args: EventTypes[K]) => {
      this.off(type, onceListener as any);
      listener(...args);
    };
    return this.on(type, onceListener as any);
  }
}

export type { EventEmitter, EventEmitterEvents } from './interface';
export { RNEventEmitter as RuntimeEventEmitter };

// ============ Environment ============

declare global {
  interface ImportMeta {
    env?: Record<string, string | undefined>;
  }
}

/**
 * 加载环境变量
 * RN 环境通过 expo-constants 或 react-native-config 获取
 */
export function loadEnv(): Record<string, string | undefined> {
  // 尝试 Expo Constants
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default;
    return Constants.expoConfig?.extra || {};
  } catch {
    // 非 Expo 环境，尝试 react-native-config
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Config = require('react-native-config').default;
      return Config || {};
    } catch {
      return {};
    }
  }
}

// ============ Crypto ============

/**
 * 生成 UUID
 * 优先使用 expo-crypto，fallback 到 crypto.randomUUID 或手动实现
 */
export function randomUUID(): `${string}-${string}-${string}-${string}-${string}` {
  // 尝试 expo-crypto
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Crypto = require('expo-crypto');
    return Crypto.randomUUID();
  } catch {
    // Fallback: 使用全局 crypto（需要 react-native-get-random-values polyfill）
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // 最后的 fallback: 手动实现
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }) as `${string}-${string}-${string}-${string}-${string}`;
  }
}

// ============ Streams ============

/**
 * Readable 兼容层
 * RN 环境使用 web-streams-polyfill，这里提供最小兼容接口
 */
export const Readable = class Readable {
  constructor() {}
  pipeTo(
    _destination: WritableStream,
    _options?: {
      preventClose?: boolean;
      preventAbort?: boolean;
      preventCancel?: boolean;
    }
  ) {}
  pipeThrough(
    _transform: TransformStream,
    _options?: {
      preventClose?: boolean;
      preventAbort?: boolean;
      preventCancel?: boolean;
    }
  ) {}
};

// 使用全局的 ReadableStream（需要 web-streams-polyfill）
export const ReadableStream = globalThis.ReadableStream;
export const ReadableStreamController = globalThis.ReadableStreamDefaultController;
export const TransformStream = globalThis.TransformStream;

// ============ AsyncLocalStorage ============

/**
 * AsyncLocalStorage 简化实现
 * RN 不支持 node:async_hooks，使用简单的上下文存储
 * 注意：这是简化实现，不支持真正的异步上下文隔离，但支持单一异步链
 */
export class AsyncLocalStorage<T = any> {
  private context: T | null = null;

  run<R>(store: T, callback: () => R): R {
    const prev = this.context;
    this.context = store;

    let result: R;
    try {
      result = callback();
    } catch (error) {
      this.context = prev;
      throw error;
    }

    // 处理异步函数：等待 Promise 完成后再恢复 context
    if (result instanceof Promise) {
      return result
        .then((value) => {
          this.context = prev;
          return value;
        })
        .catch((error) => {
          this.context = prev;
          throw error;
        }) as unknown as R;
    }

    // 同步函数：立即恢复 context
    this.context = prev;
    return result;
  }

  getStore(): T | undefined {
    return this.context ?? undefined;
  }

  enterWith(store: T): void {
    this.context = store;
  }

  disable(): void {
    this.context = null;
  }
}

// ============ Environment Detection ============

export function isBrowserEnvironment(): boolean {
  return false;
}

export function isTracingLoopRunningByDefault(): boolean {
  // RN 环境默认禁用 tracing（AsyncLocalStorage 功能受限）
  return false;
}

// ============ MCP Server ============

// RN 环境不支持 stdio MCP，复用 browser 的实现（抛出未实现错误）
export { MCPServerStdio, MCPServerStreamableHttp, MCPServerSSE } from './mcp-server/browser';

// ============ Timer ============

class RNTimer implements Timer {
  setTimeout(callback: () => void, ms: number): Timeout {
    const id = setTimeout(callback, ms);
    // RN 的 setTimeout 返回 number，需要包装为 Timeout 接口
    return {
      ref: () => this as unknown as Timeout,
      unref: () => this as unknown as Timeout,
      hasRef: () => true,
      refresh: () => this as unknown as Timeout,
      // 保存原始 id 用于 clearTimeout
      [Symbol.toPrimitive]: () => id,
    } as unknown as Timeout;
  }

  clearTimeout(timeoutId: Timeout | string | number | undefined): void {
    clearTimeout(timeoutId as unknown as number);
  }
}

const timer = new RNTimer();
export { timer };
