/**
 * [INPUT]: 认证状态变更
 * [OUTPUT]: 状态一致性断言
 * [POS]: Console Auth Store 属性测试
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
import { describe, it, beforeEach } from 'vitest';
import fc from 'fast-check';
import { useAuthStore } from './auth';

describe('属性 1: 认证状态一致性', () => {
  beforeEach(() => {
    // 重置 store 状态
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isBootstrapped: false,
    });
  });

  it('对于任意有效用户信息，setSession 后 isAuthenticated 应为 true', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.emailAddress(),
        fc.boolean(),
        fc.string({ minLength: 10, maxLength: 120 }),
        (userId, email, isAdmin, accessToken) => {
          const { setSession } = useAuthStore.getState();

          // 执行登录
          setSession(
            {
              id: userId,
              email,
              name: null,
              emailVerified: true,
              tier: 'FREE',
              isAdmin,
            },
            accessToken
          );

          // 获取更新后的状态
          const state = useAuthStore.getState();

          return (
            state.isAuthenticated === true &&
            state.user?.id === userId &&
            state.user?.email === email &&
            state.user?.isAdmin === isAdmin &&
            state.accessToken === accessToken &&
            state.isBootstrapped === true
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('对于任意已登录状态，clearSession 后 isAuthenticated 应为 false', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.emailAddress(),
        fc.boolean(),
        fc.string({ minLength: 10, maxLength: 120 }),
        (userId, email, isAdmin, accessToken) => {
          const { setSession, clearSession } = useAuthStore.getState();

          // 先登录
          setSession(
            {
              id: userId,
              email,
              name: null,
              emailVerified: true,
              tier: 'FREE',
              isAdmin,
            },
            accessToken
          );

          // 确认已登录
          const loggedInState = useAuthStore.getState();
          if (!loggedInState.isAuthenticated) return false;

          // 执行登出
          clearSession();

          // 获取更新后的状态
          const state = useAuthStore.getState();

          return (
            state.isAuthenticated === false &&
            state.user === null &&
            state.accessToken === null &&
            state.isBootstrapped === true
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('对于任意连续的登录/登出操作，状态应保持一致', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.tuple(
              fc.constant('login'),
              fc.string({ minLength: 1, maxLength: 20 }),
              fc.emailAddress(),
              fc.boolean(),
              fc.string({ minLength: 10, maxLength: 120 })
            ),
            fc.tuple(fc.constant('logout'))
          ),
          { minLength: 1, maxLength: 10 }
        ),
        (operations) => {
          let expectedAuthenticated = false;
          let expectedUser: { id: string; email: string; isAdmin: boolean } | null = null;
          let expectedToken: string | null = null;

          for (const op of operations) {
            if (op[0] === 'login') {
              const [, userId, email, isAdmin, accessToken] = op as [
                string,
                string,
                string,
                boolean,
                string,
              ];
              useAuthStore.getState().setSession(
                {
                  id: userId,
                  email,
                  name: null,
                  emailVerified: true,
                  tier: 'FREE',
                  isAdmin,
                },
                accessToken
              );
              expectedAuthenticated = true;
              expectedUser = { id: userId, email, isAdmin };
              expectedToken = accessToken;
            } else {
              useAuthStore.getState().clearSession();
              expectedAuthenticated = false;
              expectedUser = null;
              expectedToken = null;
            }
          }

          const state = useAuthStore.getState();
          return (
            state.isAuthenticated === expectedAuthenticated &&
            (expectedUser === null
              ? state.user === null
              : state.user?.id === expectedUser.id &&
                state.user?.email === expectedUser.email &&
                state.user?.isAdmin === expectedUser.isAdmin) &&
            state.accessToken === expectedToken
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
