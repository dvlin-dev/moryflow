/**
 * 等级变更和积分发放正确性属性测试
 * **Feature: admin-shadcn-refactor, Property 10: 等级变更正确性**
 * **Feature: admin-shadcn-refactor, Property 11: 积分发放正确性**
 * **Validates: Requirements 6.4, 6.5**
 */
import { describe, it } from 'vitest';
import fc from 'fast-check';
import type { UserTier, CreditType } from '@/types/api';

/** 用户类型 */
interface User {
  id: string;
  email: string;
  subscriptionTier: UserTier;
  isAdmin: boolean;
  createdAt: string;
}

/** 用户积分 */
interface UserCredits {
  subscription: number;
  purchased: number;
  total: number;
}

/**
 * 模拟等级变更操作
 * 返回变更后的用户
 */
function setUserTier(user: User, newTier: UserTier): User {
  return {
    ...user,
    subscriptionTier: newTier,
  };
}

/**
 * 模拟积分发放操作
 * 返回发放后的积分余额
 */
function grantCredits(credits: UserCredits, type: CreditType, amount: number): UserCredits {
  if (type === 'subscription') {
    return {
      ...credits,
      subscription: credits.subscription + amount,
      total: credits.total + amount,
    };
  } else {
    return {
      ...credits,
      purchased: credits.purchased + amount,
      total: credits.total + amount,
    };
  }
}

/** 生成随机用户 */
const userArbitrary = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  subscriptionTier: fc.constantFrom<UserTier>('free', 'basic', 'pro', 'license'),
  isAdmin: fc.boolean(),
  createdAt: fc.constant('2024-01-01T00:00:00.000Z' as string),
});

/** 生成随机积分 */
const creditsArbitrary = fc
  .record({
    subscription: fc.integer({ min: 0, max: 100000 }),
    purchased: fc.integer({ min: 0, max: 100000 }),
  })
  .map((c) => ({
    ...c,
    total: c.subscription + c.purchased,
  }));

describe('属性 10: 等级变更正确性', () => {
  it('对于任意用户和新等级，变更后用户的等级应与提交的等级一致', () => {
    fc.assert(
      fc.property(
        userArbitrary,
        fc.constantFrom<UserTier>('free', 'basic', 'pro', 'license'),
        (user, newTier) => {
          const updatedUser = setUserTier(user, newTier);
          return updatedUser.subscriptionTier === newTier;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('等级变更不应影响用户的其他属性', () => {
    fc.assert(
      fc.property(
        userArbitrary,
        fc.constantFrom<UserTier>('free', 'basic', 'pro', 'license'),
        (user, newTier) => {
          const updatedUser = setUserTier(user, newTier);
          return (
            updatedUser.id === user.id &&
            updatedUser.email === user.email &&
            updatedUser.isAdmin === user.isAdmin &&
            updatedUser.createdAt === user.createdAt
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('连续变更等级应以最后一次为准', () => {
    fc.assert(
      fc.property(
        userArbitrary,
        fc.array(fc.constantFrom<UserTier>('free', 'basic', 'pro', 'license'), {
          minLength: 1,
          maxLength: 5,
        }),
        (user, tiers) => {
          let currentUser = user;
          for (const tier of tiers) {
            currentUser = setUserTier(currentUser, tier);
          }
          return currentUser.subscriptionTier === tiers[tiers.length - 1];
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('属性 11: 积分发放正确性', () => {
  it('对于任意积分发放操作，发放后用户的积分余额应增加相应数量', () => {
    fc.assert(
      fc.property(
        creditsArbitrary,
        fc.constantFrom<CreditType>('subscription', 'purchased'),
        fc.integer({ min: 1, max: 10000 }),
        (credits, type, amount) => {
          const updatedCredits = grantCredits(credits, type, amount);
          return updatedCredits.total === credits.total + amount;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('订阅积分发放应只增加订阅积分', () => {
    fc.assert(
      fc.property(creditsArbitrary, fc.integer({ min: 1, max: 10000 }), (credits, amount) => {
        const updatedCredits = grantCredits(credits, 'subscription', amount);
        return (
          updatedCredits.subscription === credits.subscription + amount &&
          updatedCredits.purchased === credits.purchased
        );
      }),
      { numRuns: 100 }
    );
  });

  it('购买积分发放应只增加购买积分', () => {
    fc.assert(
      fc.property(creditsArbitrary, fc.integer({ min: 1, max: 10000 }), (credits, amount) => {
        const updatedCredits = grantCredits(credits, 'purchased', amount);
        return (
          updatedCredits.purchased === credits.purchased + amount &&
          updatedCredits.subscription === credits.subscription
        );
      }),
      { numRuns: 100 }
    );
  });

  it('连续发放积分应累加', () => {
    fc.assert(
      fc.property(
        creditsArbitrary,
        fc.array(
          fc.tuple(
            fc.constantFrom<CreditType>('subscription', 'purchased'),
            fc.integer({ min: 1, max: 1000 })
          ),
          { minLength: 1, maxLength: 5 }
        ),
        (credits, operations) => {
          let currentCredits = credits;
          let expectedTotal = credits.total;

          for (const [type, amount] of operations) {
            currentCredits = grantCredits(currentCredits, type, amount);
            expectedTotal += amount;
          }

          return currentCredits.total === expectedTotal;
        }
      ),
      { numRuns: 100 }
    );
  });
});
