import { PrismaClient, SubscriptionTier, SubscriptionStatus } from '../generated/prisma/client';
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

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // ==========================================
  // 1. 管理员用户
  // ==========================================

  const adminUser = await prisma.user.upsert({
    where: { email: 'dvlin.dev@gmail.com' },
    update: {},
    create: {
      email: 'dvlin.dev@gmail.com',
      name: '管理员',
      emailVerified: true,
      isAdmin: true,
      accounts: {
        create: {
          accountId: 'dvlin.dev@gmail.com',
          providerId: 'credential',
          password: passwordHash,
        },
      },
      subscription: {
        create: {
          tier: SubscriptionTier.ENTERPRISE,
          status: SubscriptionStatus.ACTIVE,
          periodStartAt: now,
          periodEndAt: thirtyDaysLater,
        },
      },
      quota: {
        create: {
          monthlyApiLimit: 100000,
          monthlyApiUsed: 0,
          periodStartAt: now,
          periodEndAt: thirtyDaysLater,
        },
      },
    },
  });
  console.log('✅ 创建管理员用户:', adminUser.email);

  // ==========================================
  // 2. 免费用户
  // ==========================================

  const freeUser = await prisma.user.upsert({
    where: { email: 'free@example.com' },
    update: {},
    create: {
      email: 'free@example.com',
      name: '免费用户',
      emailVerified: true,
      accounts: {
        create: {
          accountId: 'free@example.com',
          providerId: 'credential',
          password: passwordHash,
        },
      },
      subscription: {
        create: {
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.ACTIVE,
          periodStartAt: now,
          periodEndAt: thirtyDaysLater,
        },
      },
      quota: {
        create: {
          monthlyApiLimit: 100,
          monthlyApiUsed: 50,
          periodStartAt: now,
          periodEndAt: thirtyDaysLater,
        },
      },
    },
  });
  console.log('✅ 创建免费用户:', freeUser.email);

  // ==========================================
  // 3. Hobby 用户
  // ==========================================

  const hobbyUser = await prisma.user.upsert({
    where: { email: 'hobby@example.com' },
    update: {},
    create: {
      email: 'hobby@example.com',
      name: 'Hobby用户',
      emailVerified: true,
      accounts: {
        create: {
          accountId: 'hobby@example.com',
          providerId: 'credential',
          password: passwordHash,
        },
      },
      subscription: {
        create: {
          tier: SubscriptionTier.HOBBY,
          status: SubscriptionStatus.ACTIVE,
          periodStartAt: now,
          periodEndAt: thirtyDaysLater,
        },
      },
      quota: {
        create: {
          monthlyApiLimit: 10000,
          monthlyApiUsed: 5000,
          periodStartAt: now,
          periodEndAt: thirtyDaysLater,
        },
      },
    },
  });
  console.log('✅ 创建Hobby用户:', hobbyUser.email);

  // ==========================================
  // 完成
  // ==========================================

  console.log('\n✅ 种子数据插入完成！');
  console.log('\n📊 数据统计：');
  console.log('  用户数:', await prisma.user.count());
  console.log('  订阅数:', await prisma.subscription.count());
  console.log('  配额记录:', await prisma.quota.count());

  console.log('\n👤 测试账号（密码均为 test123456）：');
  console.log('  dvlin.dev@gmail.com - 管理员 [ENTERPRISE] (isAdmin: true)');
  console.log('  free@example.com    - 免费用户 [FREE]');
  console.log('  hobby@example.com   - Hobby用户 [HOBBY]');

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
