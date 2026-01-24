/**
 * [PROVIDES]: React Native 端 @openai/agents-core 的运行时 shims
 * [DEPENDS]: expo-crypto（可选）, expo-constants（可选）, react-native-config（可选）
 * [POS]: 通过 Metro alias 提供 @openai/agents-core/_shims，实现 RN 最小兼容
 * [NOTE]: 去除 any 类型，满足 RN 侧 lint 规则；补充 streams 兜底加载
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 Header 及所属目录 CLAUDE.md
 */

export type EventEmitterEvents = Record<string, unknown[]>;

export interface EventEmitter<EventTypes extends EventEmitterEvents = Record<string, unknown[]>> {
  on<K extends keyof EventTypes>(type: K, listener: (...args: EventTypes[K]) => void): this;
  off<K extends keyof EventTypes>(type: K, listener: (...args: EventTypes[K]) => void): this;
  emit<K extends keyof EventTypes>(type: K, ...args: EventTypes[K]): boolean;
  once<K extends keyof EventTypes>(type: K, listener: (...args: EventTypes[K]) => void): this;
}

export interface Timeout {
  ref(): this;
  unref(): this;
  hasRef(): boolean;
  refresh(): this;
}

export interface Timer {
  setTimeout(callback: (...args: unknown[]) => void, ms: number): Timeout;
  clearTimeout(timeoutId: Timeout | string | number | undefined): void;
}

// ============ EventEmitter ============

type EventListener = (...args: unknown[]) => void;

export class RNEventEmitter<
  EventTypes extends EventEmitterEvents = Record<string, unknown[]>,
> implements EventEmitter<EventTypes> {
  private listeners = new Map<keyof EventTypes, Set<EventListener>>();

  on<K extends keyof EventTypes>(type: K, listener: (...args: EventTypes[K]) => void): this {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener as EventListener);
    return this;
  }

  off<K extends keyof EventTypes>(type: K, listener: (...args: EventTypes[K]) => void): this {
    this.listeners.get(type)?.delete(listener as EventListener);
    return this;
  }

  emit<K extends keyof EventTypes>(type: K, ...args: EventTypes[K]): boolean {
    const listeners = this.listeners.get(type);
    if (!listeners || listeners.size === 0) return false;
    listeners.forEach((listener) => listener(...(args as unknown[])));
    return true;
  }

  once<K extends keyof EventTypes>(type: K, listener: (...args: EventTypes[K]) => void): this {
    const onceListener: EventListener = (...args) => {
      this.off(type, onceListener as (...args: EventTypes[K]) => void);
      listener(...(args as EventTypes[K]));
    };
    return this.on(type, onceListener as (...args: EventTypes[K]) => void);
  }
}

export { RNEventEmitter as RuntimeEventEmitter };

// ============ Environment ============

declare global {
  interface ImportMeta {
    env?: Record<string, string | undefined>;
  }
}

export function loadEnv(): Record<string, string | undefined> {
  try {
    const Constants = require('expo-constants').default;
    return Constants.expoConfig?.extra || {};
  } catch {
    try {
      const Config = require('react-native-config').default;
      return Config || {};
    } catch {
      return {};
    }
  }
}

// ============ Crypto ============

export function randomUUID(): `${string}-${string}-${string}-${string}-${string}` {
  try {
    const Crypto = require('expo-crypto');
    return Crypto.randomUUID();
  } catch {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }) as `${string}-${string}-${string}-${string}-${string}`;
  }
}

// ============ Streams ============

type StreamGlobals = {
  ReadableStream?: typeof globalThis.ReadableStream;
  TransformStream?: typeof globalThis.TransformStream;
  WritableStream?: typeof globalThis.WritableStream;
  ReadableStreamDefaultController?: unknown;
  ReadableStreamController?: unknown;
};

function ensureStreams() {
  const globals = globalThis as unknown as StreamGlobals;
  if (globals.ReadableStream && globals.TransformStream && globals.WritableStream) {
    return globals;
  }

  try {
    const streams = require('web-streams-polyfill') as Partial<StreamGlobals>;
    globals.ReadableStream ??= streams.ReadableStream;
    globals.TransformStream ??= streams.TransformStream;
    globals.WritableStream ??= streams.WritableStream;
    globals.ReadableStreamDefaultController ??= streams.ReadableStreamDefaultController;
  } catch {
    // ignore
  }

  return globals;
}

export const Readable = class Readable {
  constructor() {}

  pipeTo(
    _destination: unknown,
    _options?: { preventClose?: boolean; preventAbort?: boolean; preventCancel?: boolean }
  ) {}

  pipeThrough(
    _transform: unknown,
    _options?: { preventClose?: boolean; preventAbort?: boolean; preventCancel?: boolean }
  ) {}
};

const streamGlobals = ensureStreams();
export const ReadableStream = streamGlobals.ReadableStream as typeof globalThis.ReadableStream;
export const ReadableStreamController =
  streamGlobals.ReadableStreamDefaultController ?? streamGlobals.ReadableStreamController;
export const TransformStream = streamGlobals.TransformStream as typeof globalThis.TransformStream;

// ============ AsyncLocalStorage ============

export class AsyncLocalStorage<T = unknown> {
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
  return false;
}

// ============ MCP (not supported) ============

class UnsupportedMCPServer {
  constructor(_params: unknown) {}

  get name(): string {
    return 'mcp-unsupported';
  }

  async connect(): Promise<void> {
    throw new Error('MCP is not supported in React Native.');
  }

  async close(): Promise<void> {
    throw new Error('MCP is not supported in React Native.');
  }

  async listTools(): Promise<unknown[]> {
    throw new Error('MCP is not supported in React Native.');
  }

  async callTool(_toolName: string, _args: Record<string, unknown> | null): Promise<unknown> {
    throw new Error('MCP is not supported in React Native.');
  }

  async invalidateToolsCache(): Promise<void> {
    throw new Error('MCP is not supported in React Native.');
  }
}

export class MCPServerStdio extends UnsupportedMCPServer {}
export class MCPServerStreamableHttp extends UnsupportedMCPServer {}
export class MCPServerSSE extends UnsupportedMCPServer {}

// ============ Timer ============

class RNTimer implements Timer {
  setTimeout(callback: (...args: unknown[]) => void, ms: number): Timeout {
    const id = setTimeout(callback, ms);
    return {
      ref: () => this as unknown as Timeout,
      unref: () => this as unknown as Timeout,
      hasRef: () => true,
      refresh: () => this as unknown as Timeout,
      [Symbol.toPrimitive]: () => id,
    } as unknown as Timeout;
  }

  clearTimeout(timeoutId: Timeout | string | number | undefined): void {
    clearTimeout(timeoutId as unknown as number);
  }
}

export function clearTimeout(timeoutId: Timeout | string | number | undefined): void {
  global.clearTimeout(timeoutId as unknown as number);
}

export const timer = new RNTimer();
