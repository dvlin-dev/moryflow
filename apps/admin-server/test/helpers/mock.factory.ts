/**
 * Mock 工厂
 * 提供统一的 Mock 对象创建方法
 */

import { vi } from 'vitest';

/**
 * 创建 Mock Prisma Client
 */
export function createMockPrismaClient() {
  const client = {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      groupBy: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    creditTransaction: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    adminLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };

  client.$transaction.mockImplementation(async (fn: (tx: typeof client) => unknown) => fn(client));

  return client;
}

/**
 * 创建 Mock Request 对象
 */
export function createMockRequest(options: {
  user?: { id: string; email: string; isAdmin: boolean };
  ip?: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
}) {
  return {
    user: options.user ?? { id: 'test-user-id', email: 'admin@example.com', isAdmin: true },
    ip: options.ip ?? '127.0.0.1',
    params: options.params ?? {},
    query: options.query ?? {},
    body: options.body ?? {},
  };
}

/**
 * 创建 Mock Response 对象
 */
export function createMockResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };
  return res;
}

/**
 * 创建 Mock ExecutionContext
 */
export function createMockExecutionContext(request: unknown) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => createMockResponse(),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
}
