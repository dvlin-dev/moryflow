import {
  PrismaClient,
  SubscriptionTier,
  SubscriptionStatus,
} from '../generated/prisma/client';
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
 *
 * 📌 注意：Demo Playground 用户（demo-playground-user）在生产环境通过数据库迁移创建，
 *    参见 prisma/main/migrations/20260110122405_add_demo_user/migration.sql
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
          tier: SubscriptionTier.PRO,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: thirtyDaysLater,
        },
      },
      quota: {
        create: {
          monthlyLimit: 20000,
          monthlyUsed: 0,
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
          currentPeriodStart: now,
          currentPeriodEnd: thirtyDaysLater,
        },
      },
      quota: {
        create: {
          monthlyLimit: 100,
          monthlyUsed: 50,
          periodStartAt: now,
          periodEndAt: thirtyDaysLater,
        },
      },
    },
  });
  console.log('✅ 创建免费用户:', freeUser.email);

  // ==========================================
  // 3. Pro 用户
  // ==========================================

  const proUser = await prisma.user.upsert({
    where: { email: 'pro@example.com' },
    update: {},
    create: {
      email: 'pro@example.com',
      name: 'Pro用户',
      emailVerified: true,
      accounts: {
        create: {
          accountId: 'pro@example.com',
          providerId: 'credential',
          password: passwordHash,
        },
      },
      subscription: {
        create: {
          tier: SubscriptionTier.PRO,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: thirtyDaysLater,
        },
      },
      quota: {
        create: {
          monthlyLimit: 20000,
          monthlyUsed: 5000,
          purchasedQuota: 1000,
          periodStartAt: now,
          periodEndAt: thirtyDaysLater,
        },
      },
    },
  });
  console.log('✅ 创建Pro用户:', proUser.email);

  // ==========================================
  // 4. Demo Playground 用户（系统用户，用于官网演示）
  // ==========================================

  const demoUser = await prisma.user.upsert({
    where: { id: 'demo-playground-user' },
    update: {},
    create: {
      id: 'demo-playground-user',
      email: 'demo@aiget.dev',
      name: 'Demo Playground',
      emailVerified: true,
      subscription: {
        create: {
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: thirtyDaysLater,
        },
      },
      quota: {
        create: {
          monthlyLimit: 999999, // Demo 不限制配额
          monthlyUsed: 0,
          periodStartAt: now,
          periodEndAt: thirtyDaysLater,
        },
      },
    },
  });
  console.log('✅ 创建Demo用户:', demoUser.id);

  // ==========================================
  // 完成
  // ==========================================

  console.log('\n✅ 种子数据插入完成！');
  console.log('\n📊 数据统计：');
  console.log('  用户数:', await prisma.user.count());
  console.log('  订阅数:', await prisma.subscription.count());
  console.log('  配额记录:', await prisma.quota.count());

  console.log('\n👤 测试账号（密码均为 test123456）：');
  console.log('  dvlin.dev@gmail.com - 管理员 [PRO] (isAdmin: true)');
  console.log('  free@example.com  - 免费用户 [FREE]');
  console.log('  pro@example.com   - Pro用户 [PRO]');

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
