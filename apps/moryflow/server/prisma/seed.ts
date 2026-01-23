import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  SubscriptionTier,
  LicenseStatus,
  LicenseTier,
} from '../generated/prisma/enums';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

/**
 * 种子数据脚本（本地开发用）
 *
 * 使用方法：
 * pnpm exec prisma db seed
 *
 * ⚠️ 警告：此脚本会插入测试数据，请勿在生产环境使用！
 */

type SeedUserInput = {
  email: string;
  name: string;
  tier: SubscriptionTier;
  isAdmin?: boolean;
};

const getNextBillingDate = (date: Date): Date => {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()),
  );
};

async function upsertUserWithSubscription(
  input: SeedUserInput,
  passwordHash: string,
  now: Date,
) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      isAdmin: input.isAdmin ?? false,
      emailVerified: true,
    },
    create: {
      email: input.email,
      name: input.name,
      emailVerified: true,
      isAdmin: input.isAdmin ?? false,
      accounts: {
        create: {
          accountId: input.email,
          providerId: 'credential',
          password: passwordHash,
        },
      },
    },
  });

  const periodEnd = getNextBillingDate(now);
  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tier: input.tier,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    update: {
      tier: input.tier,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  return user;
}

async function main() {
  console.log('🌱 开始插入种子数据...\n');

  // 密码 hash（测试密码: test123456）
  const passwordHash = await bcrypt.hash('test123456', 10);

  // ==========================================
  // 1. 测试用户与订阅
  // ==========================================

  const now = new Date();

  const adminUser = await upsertUserWithSubscription(
    {
      email: 'admin@example.com',
      name: '管理员',
      tier: SubscriptionTier.license,
      isAdmin: true,
    },
    passwordHash,
    now,
  );
  console.log('✅ 创建管理员用户:', adminUser.email);

  const freeUser = await upsertUserWithSubscription(
    {
      email: 'free.user@example.com',
      name: '免费用户',
      tier: SubscriptionTier.free,
    },
    passwordHash,
    now,
  );
  console.log('✅ 创建免费用户:', freeUser.email);

  const basicUser = await upsertUserWithSubscription(
    {
      email: 'basic.user@example.com',
      name: '基础会员',
      tier: SubscriptionTier.basic,
    },
    passwordHash,
    now,
  );
  console.log('✅ 创建基础会员:', basicUser.email);

  const proUser = await upsertUserWithSubscription(
    {
      email: 'pro.user@example.com',
      name: '专业会员',
      tier: SubscriptionTier.pro,
    },
    passwordHash,
    now,
  );
  console.log('✅ 创建专业会员:', proUser.email);

  const licenseUser = await upsertUserWithSubscription(
    {
      email: 'license.user@example.com',
      name: '永久授权用户',
      tier: SubscriptionTier.license,
    },
    passwordHash,
    now,
  );
  console.log('✅ 创建永久授权用户:', licenseUser.email);

  // ==========================================
  // 2. 订阅积分
  // ==========================================

  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.subscriptionCredits.upsert({
    where: { userId: basicUser.id },
    update: {},
    create: {
      userId: basicUser.id,
      creditsTotal: 50000,
      creditsRemaining: 37500,
      periodStart: now,
      periodEnd: thirtyDaysLater,
    },
  });
  console.log('✅ 创建基础会员订阅积分');

  await prisma.subscriptionCredits.upsert({
    where: { userId: proUser.id },
    update: {},
    create: {
      userId: proUser.id,
      creditsTotal: 200000,
      creditsRemaining: 140000,
      periodStart: now,
      periodEnd: thirtyDaysLater,
    },
  });
  console.log('✅ 创建专业会员订阅积分');

  // ==========================================
  // 3. 购买积分
  // ==========================================

  const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  await prisma.purchasedCredits.create({
    data: {
      userId: proUser.id,
      amount: 20000,
      remaining: 15000,
      expiresAt: oneYearLater,
    },
  });
  console.log('✅ 创建专业会员购买积分');

  await prisma.purchasedCredits.create({
    data: {
      userId: basicUser.id,
      amount: 5000,
      remaining: 5000,
      expiresAt: oneYearLater,
    },
  });
  console.log('✅ 创建基础会员购买积分');

  // ==========================================
  // 4. License
  // ==========================================

  await prisma.license.upsert({
    where: { licenseKey: 'TEST-LICENSE-KEY-001' },
    update: {},
    create: {
      userId: licenseUser.id,
      licenseKey: 'TEST-LICENSE-KEY-001',
      orderId: 'test_order_001',
      tier: LicenseTier.pro,
      status: LicenseStatus.active,
      activationCount: 0,
      activationLimit: 5,
    },
  });
  console.log('✅ 创建测试 License');

  // ==========================================
  // 完成
  // ==========================================

  console.log('\n✅ 种子数据插入完成！');
  console.log('\n📊 数据统计：');
  console.log('  用户数:', await prisma.user.count());
  console.log('  订阅积分记录:', await prisma.subscriptionCredits.count());
  console.log('  购买积分记录:', await prisma.purchasedCredits.count());
  console.log('  License 数:', await prisma.license.count());

  console.log('\n👤 测试账号（密码均为 test123456）：');
  const users = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      isAdmin: true,
      subscription: { select: { tier: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  users.forEach((u) => {
    console.log(
      `  ${u.email} - ${u.name} [${u.subscription?.tier ?? 'free'}]${
        u.isAdmin ? ' (管理员)' : ''
      }`,
    );
  });

  console.log('\n⚠️  注意：这些是测试数据，请勿在生产环境使用！');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据插入失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
