-- 创建 Demo Playground 用户（用于官网演示 API）
-- 此用户 ID 与 demo.service.ts 中的 DEMO_USER_ID 保持一致

-- 1. 插入 Demo 用户
INSERT INTO "User" (id, email, name, "emailVerified", "isAdmin", "createdAt", "updatedAt")
VALUES (
  'demo-playground-user',
  'demo@aiget.dev',
  'Demo Playground',
  true,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. 插入 Demo Subscription（100 年有效期，实际永不过期）
INSERT INTO "Subscription" (id, "userId", tier, status, "currentPeriodStart", "currentPeriodEnd", "cancelAtPeriodEnd", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'demo-playground-user',
  'FREE',
  'ACTIVE',
  NOW(),
  NOW() + INTERVAL '100 years',
  false,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Subscription" WHERE "userId" = 'demo-playground-user'
);

-- 3. 插入 Demo Quota（超大配额，Demo API 实际不消耗配额）
INSERT INTO "Quota" (id, "userId", "monthlyLimit", "monthlyUsed", "periodStartAt", "periodEndAt", "purchasedQuota", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'demo-playground-user',
  999999999,
  0,
  NOW(),
  NOW() + INTERVAL '100 years',
  0,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Quota" WHERE "userId" = 'demo-playground-user'
);
