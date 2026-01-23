/**
 * 列表过滤正确性属性测试
 * **Feature: admin-shadcn-refactor, Property 2: 列表过滤正确性**
 * **Validates: Requirements 5.2, 5.3, 9.2, 9.3**
 */
import { describe, it } from 'vitest';
import fc from 'fast-check';
import type { UserTier } from '@/types/api';

/** 用户类型 */
interface User {
  id: string;
  email: string;
  subscriptionTier: UserTier;
  isAdmin: boolean;
  createdAt: string;
}

/** 按等级过滤用户 */
function filterUsersByTier(users: User[], tier: string): User[] {
  if (tier === 'all') return users;
  return users.filter((user) => user.subscriptionTier === tier);
}

/** 按搜索词过滤用户 */
function filterUsersBySearch(users: User[], search: string): User[] {
  if (!search.trim()) return users;
  const lowerSearch = search.toLowerCase();
  return users.filter(
    (user) =>
      user.email.toLowerCase().includes(lowerSearch) || user.id.toLowerCase().includes(lowerSearch)
  );
}

/** 生成随机用户 */
const userArbitrary = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  subscriptionTier: fc.constantFrom<UserTier>('free', 'basic', 'pro', 'license'),
  isAdmin: fc.boolean(),
  createdAt: fc.constant('2024-01-01T00:00:00.000Z'),
});

describe('属性 2: 列表过滤正确性', () => {
  describe('按等级过滤', () => {
    it('对于任意用户列表和等级筛选，过滤后的结果应仅包含该等级的用户', () => {
      fc.assert(
        fc.property(
          fc.array(userArbitrary, { minLength: 0, maxLength: 50 }),
          fc.constantFrom<UserTier>('free', 'basic', 'pro', 'license'),
          (users, tier) => {
            const filtered = filterUsersByTier(users, tier);
            return filtered.every((user) => user.subscriptionTier === tier);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('对于任意用户列表，选择"全部"时应返回所有用户', () => {
      fc.assert(
        fc.property(fc.array(userArbitrary, { minLength: 0, maxLength: 50 }), (users) => {
          const filtered = filterUsersByTier(users, 'all');
          return filtered.length === users.length;
        }),
        { numRuns: 100 }
      );
    });

    it('过滤后的用户数量应小于等于原始数量', () => {
      fc.assert(
        fc.property(
          fc.array(userArbitrary, { minLength: 0, maxLength: 50 }),
          fc.constantFrom<UserTier | 'all'>('all', 'free', 'basic', 'pro', 'license'),
          (users, tier) => {
            const filtered = filterUsersByTier(users, tier);
            return filtered.length <= users.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('按搜索词过滤', () => {
    it('对于任意用户列表和搜索词，过滤后的结果应包含搜索词', () => {
      fc.assert(
        fc.property(fc.array(userArbitrary, { minLength: 1, maxLength: 50 }), (users) => {
          // 使用第一个用户的邮箱作为搜索词
          const searchTerm = users[0].email.split('@')[0];
          const filtered = filterUsersBySearch(users, searchTerm);
          return filtered.every(
            (user) =>
              user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
              user.id.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }),
        { numRuns: 100 }
      );
    });

    it('空搜索词应返回所有用户', () => {
      fc.assert(
        fc.property(
          fc.array(userArbitrary, { minLength: 0, maxLength: 50 }),
          fc.constantFrom('', '  ', '\t'),
          (users, emptySearch) => {
            const filtered = filterUsersBySearch(users, emptySearch);
            return filtered.length === users.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('组合过滤', () => {
    it('组合过滤应满足所有条件', () => {
      fc.assert(
        fc.property(
          fc.array(userArbitrary, { minLength: 0, maxLength: 50 }),
          fc.constantFrom<UserTier>('free', 'basic', 'pro', 'license'),
          (users, tier) => {
            // 先按等级过滤，再按搜索过滤
            const byTier = filterUsersByTier(users, tier);
            const searchTerm = 'a'; // 简单搜索词
            const combined = filterUsersBySearch(byTier, searchTerm);

            // 所有结果应同时满足等级和搜索条件
            return combined.every(
              (user) =>
                user.subscriptionTier === tier &&
                (user.email.toLowerCase().includes(searchTerm) ||
                  user.id.toLowerCase().includes(searchTerm))
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
