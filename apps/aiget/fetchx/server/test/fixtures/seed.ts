/**
 * 共享测试数据 Seed
 * 用于集成测试和 E2E 测试
 */
import type { PrismaClient } from '../../generated/prisma/client';

export interface SeedData {
  freeUser: {
    id: string;
    email: string;
    name: string;
  };
  proUser: {
    id: string;
    email: string;
    name: string;
  };
  freeUserApiKey: {
    id: string;
    userId: string;
    name: string;
    keyHash: string;
    keyPrefix: string;
  };
  proUserApiKey: {
    id: string;
    userId: string;
    name: string;
    keyHash: string;
    keyPrefix: string;
  };
}

/**
 * 清理数据库
 */
export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  // 按依赖顺序删除
  await prisma.$transaction([
    prisma.screenshot.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.quotaPurchase.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

/**
 * 填充测试数据
 */
export async function seedTestData(prisma: PrismaClient): Promise<SeedData> {
  // 先清理
  await cleanDatabase(prisma);

  // 创建免费用户
  const freeUser = await prisma.user.create({
    data: {
      id: 'user_free_test',
      email: 'free@test.com',
      name: 'Free User',
      emailVerified: true,
    },
  });

  // 创建 PRO 用户
  const proUser = await prisma.user.create({
    data: {
      id: 'user_pro_test',
      email: 'pro@test.com',
      name: 'Pro User',
      emailVerified: true,
    },
  });

  // 创建免费用户的 API Key
  const freeUserApiKey = await prisma.apiKey.create({
    data: {
      id: 'apikey_free_test',
      userId: freeUser.id,
      name: 'Free Test Key',
      // SHA256 of 'lk_free_test_key'
      keyHash: 'a1b2c3d4e5f6g7h8i9j0',
      keyPrefix: 'lk_free',
    },
  });

  // 创建 PRO 用户的 API Key
  const proUserApiKey = await prisma.apiKey.create({
    data: {
      id: 'apikey_pro_test',
      userId: proUser.id,
      name: 'Pro Test Key',
      // SHA256 of 'lk_pro_test_key'
      keyHash: 'z9y8x7w6v5u4t3s2r1q0',
      keyPrefix: 'lk_pro',
    },
  });

  // 创建 PRO 用户的订阅
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  await prisma.subscription.create({
    data: {
      userId: proUser.id,
      tier: 'PRO',
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
    },
  });

  return {
    freeUser: {
      id: freeUser.id,
      email: freeUser.email,
      name: freeUser.name || '',
    },
    proUser: {
      id: proUser.id,
      email: proUser.email,
      name: proUser.name || '',
    },
    freeUserApiKey: {
      id: freeUserApiKey.id,
      userId: freeUserApiKey.userId,
      name: freeUserApiKey.name,
      keyHash: freeUserApiKey.keyHash,
      keyPrefix: freeUserApiKey.keyPrefix,
    },
    proUserApiKey: {
      id: proUserApiKey.id,
      userId: proUserApiKey.userId,
      name: proUserApiKey.name,
      keyHash: proUserApiKey.keyHash,
      keyPrefix: proUserApiKey.keyPrefix,
    },
  };
}
