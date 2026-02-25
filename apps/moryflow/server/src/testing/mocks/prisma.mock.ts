/**
 * Prisma Service Mock
 * 使用 Vitest 原生 mock 实现 Prisma 模拟
 */

import { vi, type Mock } from 'vitest';

type MockFn = Mock<(...args: any[]) => any>;

// 模型 Mock 类型
interface ModelMock {
  findUnique: MockFn;
  findFirst: MockFn;
  findMany: MockFn;
  create: MockFn;
  createMany: MockFn;
  update: MockFn;
  updateMany: MockFn;
  upsert: MockFn;
  delete: MockFn;
  deleteMany: MockFn;
  count: MockFn;
  aggregate: MockFn;
  groupBy: MockFn;
}

/**
 * PrismaService Mock 类型
 */
export interface MockPrismaService {
  user: ModelMock;
  session: ModelMock;
  account: ModelMock;
  verification: ModelMock;
  subscription: ModelMock;
  subscriptionCredits: ModelMock;
  purchasedCredits: ModelMock;
  creditDebt: ModelMock;
  creditUsageDaily: ModelMock;
  userStorageUsage: ModelMock;
  syncFile: ModelMock;
  vectorizedFile: ModelMock;
  aiProvider: ModelMock;
  aiModel: ModelMock;
  adminLog: ModelMock;
  paymentOrder: ModelMock;
  $connect: MockFn;
  $disconnect: MockFn;
  $transaction: MockFn;
  $executeRaw: MockFn;
  $queryRaw: MockFn;
}

// 创建一个函数返回带有 mockResolvedValue 等方法的 mock
function createMockFn(): MockFn {
  return vi.fn().mockResolvedValue(undefined);
}

// 为每个 Prisma 模型创建 mock 方法
function createModelMock(): ModelMock {
  return {
    findUnique: createMockFn(),
    findFirst: createMockFn(),
    findMany: createMockFn(),
    create: createMockFn(),
    createMany: createMockFn(),
    update: createMockFn(),
    updateMany: createMockFn(),
    upsert: createMockFn(),
    delete: createMockFn(),
    deleteMany: createMockFn(),
    count: createMockFn(),
    aggregate: createMockFn(),
    groupBy: createMockFn(),
  };
}

/**
 * 创建 Prisma Service Mock
 */
export function createPrismaMock(): MockPrismaService {
  return {
    user: createModelMock(),
    session: createModelMock(),
    account: createModelMock(),
    verification: createModelMock(),
    subscription: createModelMock(),
    subscriptionCredits: createModelMock(),
    purchasedCredits: createModelMock(),
    creditDebt: createModelMock(),
    creditUsageDaily: createModelMock(),
    userStorageUsage: createModelMock(),
    syncFile: createModelMock(),
    vectorizedFile: createModelMock(),
    aiProvider: createModelMock(),
    aiModel: createModelMock(),
    adminLog: createModelMock(),
    paymentOrder: createModelMock(),
    $connect: createMockFn(),
    $disconnect: createMockFn(),
    $transaction: createMockFn(),
    $executeRaw: createMockFn(),
    $queryRaw: createMockFn(),
  };
}
