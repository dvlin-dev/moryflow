import { PrismaClient, UserTier, LicenseStatus, LicenseTier } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
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

async function main() {
  console.log('🌱 开始插入种子数据...\n');

  // 密码 hash（测试密码: test123456）
  const passwordHash = await bcrypt.hash('test123456', 10);

  // ==========================================
  // 1. 测试用户
  // ==========================================

  // 管理员用户
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: '管理员',
      emailVerified: true,
      tier: UserTier.license,
      isAdmin: true,
      accounts: {
        create: {
          accountId: 'admin@example.com',
          providerId: 'credential',
          password: passwordHash,
        },
      },
    },
  });
  console.log('✅ 创建管理员用户:', adminUser.email);

  // 免费用户
  const freeUser = await prisma.user.upsert({
    where: { email: 'free.user@example.com' },
    update: {},
    create: {
      email: 'free.user@example.com',
      name: '免费用户',
      emailVerified: true,
      tier: UserTier.free,
      accounts: {
        create: {
          accountId: 'free.user@example.com',
          providerId: 'credential',
          password: passwordHash,
        },
      },
    },
  });
  console.log('✅ 创建免费用户:', freeUser.email);

  // 基础会员
  const basicUser = await prisma.user.upsert({
    where: { email: 'basic.user@example.com' },
    update: {},
    create: {
      email: 'basic.user@example.com',
      name: '基础会员',
      emailVerified: true,
      tier: UserTier.basic,
      accounts: {
        create: {
          accountId: 'basic.user@example.com',
          providerId: 'credential',
          password: passwordHash,
        },
      },
    },
  });
  console.log('✅ 创建基础会员:', basicUser.email);

  // 专业会员
  const proUser = await prisma.user.upsert({
    where: { email: 'pro.user@example.com' },
    update: {},
    create: {
      email: 'pro.user@example.com',
      name: '专业会员',
      emailVerified: true,
      tier: UserTier.pro,
      accounts: {
        create: {
          accountId: 'pro.user@example.com',
          providerId: 'credential',
          password: passwordHash,
        },
      },
    },
  });
  console.log('✅ 创建专业会员:', proUser.email);

  // 永久授权用户
  const licenseUser = await prisma.user.upsert({
    where: { email: 'license.user@example.com' },
    update: {},
    create: {
      email: 'license.user@example.com',
      name: '永久授权用户',
      emailVerified: true,
      tier: UserTier.license,
      accounts: {
        create: {
          accountId: 'license.user@example.com',
          providerId: 'credential',
          password: passwordHash,
        },
      },
    },
  });
  console.log('✅ 创建永久授权用户:', licenseUser.email);

  // ==========================================
  // 2. 订阅积分
  // ==========================================

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 基础会员订阅积分
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

  // 专业会员订阅积分
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
  // 5. 管理员操作日志
  // ==========================================

  await prisma.adminLog.create({
    data: {
      operatorId: adminUser.id,
      action: 'SET_USER_TIER',
      targetUserId: basicUser.id,
      details: { tier: 'basic', previousTier: 'free', reason: '测试升级' },
    },
  });
  console.log('✅ 创建管理员操作日志');

  // ==========================================
  // 完成
  // ==========================================

  console.log('\n✅ 种子数据插入完成！');
  console.log('\n📊 数据统计：');
  console.log('  用户数:', await prisma.user.count());
  console.log('  订阅积分记录:', await prisma.subscriptionCredits.count());
  console.log('  购买积分记录:', await prisma.purchasedCredits.count());
  console.log('  License 数:', await prisma.license.count());
  console.log('  管理日志数:', await prisma.adminLog.count());

  console.log('\n👤 测试账号（密码均为 test123456）：');
  const users = await prisma.user.findMany({
    select: { email: true, name: true, tier: true, isAdmin: true },
    orderBy: { tier: 'asc' },
  });
  users.forEach((u: { email: string; name: string | null; tier: UserTier; isAdmin: boolean }) => {
    console.log(`  ${u.email} - ${u.name} [${u.tier}]${u.isAdmin ? ' (管理员)' : ''}`);
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
