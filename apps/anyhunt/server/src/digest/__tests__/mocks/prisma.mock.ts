/**
 * Prisma Mock Factory
 *
 * [PROVIDES]: Prisma 客户端 Mock 工厂
 * [POS]: 为 Digest 服务测试提供类型安全的 Prisma Mock
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

// ========== Prisma Model Mocks ==========

export type MockDigestSubscription = {
  create: Mock;
  findFirst: Mock;
  findMany: Mock;
  findUnique: Mock;
  update: Mock;
  delete: Mock;
  count: Mock;
};

export type MockDigestRun = {
  create: Mock;
  findFirst: Mock;
  findMany: Mock;
  findUnique: Mock;
  update: Mock;
  count: Mock;
};

export type MockDigestRunItem = {
  create: Mock;
  createMany: Mock;
  findFirst: Mock;
  findMany: Mock;
  update: Mock;
  updateMany: Mock;
  count: Mock;
  groupBy: Mock;
};

export type MockContentItem = {
  create: Mock;
  upsert: Mock;
  findFirst: Mock;
  findMany: Mock;
  findUnique: Mock;
  update: Mock;
  count: Mock;
};

export type MockContentItemEnrichment = {
  create: Mock;
  upsert: Mock;
  findFirst: Mock;
  findMany: Mock;
  findUnique: Mock;
  update: Mock;
};

export type MockUserContentState = {
  create: Mock;
  upsert: Mock;
  findFirst: Mock;
  findMany: Mock;
  update: Mock;
  updateMany: Mock;
  count: Mock;
};

export type MockDigestTopic = {
  create: Mock;
  findFirst: Mock;
  findMany: Mock;
  findUnique: Mock;
  update: Mock;
  delete: Mock;
  count: Mock;
  aggregate: Mock;
};

export type MockDigestTopicEdition = {
  create: Mock;
  findFirst: Mock;
  findMany: Mock;
  findUnique: Mock;
  update: Mock;
  count: Mock;
};

export type MockDigestTopicEditionItem = {
  create: Mock;
  createMany: Mock;
  findMany: Mock;
};

export type MockDigestSource = {
  create: Mock;
  findFirst: Mock;
  findMany: Mock;
  findUnique: Mock;
  update: Mock;
  delete: Mock;
};

export type MockDigestWelcomeConfig = {
  findUnique: Mock;
  create: Mock;
  upsert: Mock;
  update: Mock;
};

export type MockDigestWelcomePage = {
  findUnique: Mock;
  findFirst: Mock;
  findMany: Mock;
  create: Mock;
  update: Mock;
  delete: Mock;
  count: Mock;
  aggregate: Mock;
};

export type MockDigestReport = {
  create: Mock;
  findFirst: Mock;
  findMany: Mock;
  update: Mock;
  count: Mock;
};

export type MockDigestFeedbackPattern = {
  create: Mock;
  upsert: Mock;
  findFirst: Mock;
  findMany: Mock;
  findUnique: Mock;
  update: Mock;
  aggregate: Mock;
  deleteMany: Mock;
};

export type MockUser = {
  findFirst: Mock;
  findUnique: Mock;
};

// ========== Full Prisma Mock Type ==========

export type MockPrismaDigest = {
  digestSubscription: MockDigestSubscription;
  digestRun: MockDigestRun;
  digestRunItem: MockDigestRunItem;
  contentItem: MockContentItem;
  contentItemEnrichment: MockContentItemEnrichment;
  userContentState: MockUserContentState;
  digestTopic: MockDigestTopic;
  digestTopicEdition: MockDigestTopicEdition;
  digestTopicEditionItem: MockDigestTopicEditionItem;
  digestSource: MockDigestSource;
  digestWelcomeConfig: MockDigestWelcomeConfig;
  digestWelcomePage: MockDigestWelcomePage;
  digestReport: MockDigestReport;
  digestFeedbackPattern: MockDigestFeedbackPattern;
  user: MockUser;
  $transaction: Mock;
};

// ========== Factory Functions ==========

export function createMockDigestSubscription(): MockDigestSubscription {
  return {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };
}

export function createMockDigestRun(): MockDigestRun {
  return {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };
}

export function createMockDigestRunItem(): MockDigestRunItem {
  return {
    create: vi.fn(),
    createMany: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  };
}

export function createMockContentItem(): MockContentItem {
  return {
    create: vi.fn(),
    upsert: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };
}

export function createMockContentItemEnrichment(): MockContentItemEnrichment {
  return {
    create: vi.fn(),
    upsert: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  };
}

export function createMockUserContentState(): MockUserContentState {
  return {
    create: vi.fn(),
    upsert: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  };
}

export function createMockDigestTopic(): MockDigestTopic {
  return {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  };
}

export function createMockDigestTopicEdition(): MockDigestTopicEdition {
  return {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };
}

export function createMockDigestTopicEditionItem(): MockDigestTopicEditionItem {
  return {
    create: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
  };
}

export function createMockDigestSource(): MockDigestSource {
  return {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

export function createMockDigestWelcomeConfig(): MockDigestWelcomeConfig {
  return {
    findUnique: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  };
}

export function createMockDigestWelcomePage(): MockDigestWelcomePage {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  };
}

export function createMockDigestReport(): MockDigestReport {
  return {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };
}

export function createMockDigestFeedbackPattern(): MockDigestFeedbackPattern {
  return {
    create: vi.fn(),
    upsert: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    aggregate: vi.fn(),
    deleteMany: vi.fn(),
  };
}

export function createMockUser(): MockUser {
  return {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  };
}

/**
 * 创建完整的 Prisma Mock 对象
 */
export function createMockPrisma(): MockPrismaDigest {
  return {
    digestSubscription: createMockDigestSubscription(),
    digestRun: createMockDigestRun(),
    digestRunItem: createMockDigestRunItem(),
    contentItem: createMockContentItem(),
    contentItemEnrichment: createMockContentItemEnrichment(),
    userContentState: createMockUserContentState(),
    digestTopic: createMockDigestTopic(),
    digestTopicEdition: createMockDigestTopicEdition(),
    digestTopicEditionItem: createMockDigestTopicEditionItem(),
    digestSource: createMockDigestSource(),
    digestWelcomeConfig: createMockDigestWelcomeConfig(),
    digestWelcomePage: createMockDigestWelcomePage(),
    digestReport: createMockDigestReport(),
    digestFeedbackPattern: createMockDigestFeedbackPattern(),
    user: createMockUser(),
    $transaction: vi.fn((callback) => callback(createMockPrisma())),
  };
}

/**
 * 重置所有 Mock
 */
export function resetMockPrisma(mock: MockPrismaDigest): void {
  Object.values(mock).forEach((model) => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach((fn) => {
        if (typeof fn === 'function' && 'mockReset' in fn) {
          (fn as Mock).mockReset();
        }
      });
    }
  });
}
