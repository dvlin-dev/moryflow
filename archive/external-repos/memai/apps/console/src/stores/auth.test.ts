/**
 * 认证状态一致性属性测试
 * **Feature: admin-shadcn-refactor, Property 1: 认证状态一致性**
 * **Validates: Requirements 2.2, 4.3**
 */
import { describe, it, beforeEach } from 'vitest'
import fc from 'fast-check'
import { useAuthStore } from './auth'

describe('属性 1: 认证状态一致性', () => {
  beforeEach(() => {
    // 重置 store 状态
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
    })
  })

  it('对于任意有效用户信息，setAuth 后 isAuthenticated 应为 true', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.emailAddress(),
        fc.boolean(),
        (userId, email, isAdmin) => {
          const { setAuth } = useAuthStore.getState()

          // 执行登录
          setAuth({ id: userId, email, isAdmin })

          // 获取更新后的状态
          const state = useAuthStore.getState()

          return (
            state.isAuthenticated === true &&
            state.user?.id === userId &&
            state.user?.email === email &&
            state.user?.isAdmin === isAdmin
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  it('对于任意已登录状态，logout 后 isAuthenticated 应为 false', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.emailAddress(),
        fc.boolean(),
        (userId, email, isAdmin) => {
          const { setAuth, logout } = useAuthStore.getState()

          // 先登录
          setAuth({ id: userId, email, isAdmin })

          // 确认已登录
          const loggedInState = useAuthStore.getState()
          if (!loggedInState.isAuthenticated) return false

          // 执行登出
          logout()

          // 获取更新后的状态
          const state = useAuthStore.getState()

          return state.isAuthenticated === false && state.user === null
        }
      ),
      { numRuns: 100 }
    )
  })

  it('对于任意连续的登录/登出操作，状态应保持一致', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.tuple(
              fc.constant('login'),
              fc.string({ minLength: 1, maxLength: 20 }),
              fc.emailAddress(),
              fc.boolean()
            ),
            fc.tuple(fc.constant('logout'))
          ),
          { minLength: 1, maxLength: 10 }
        ),
        (operations) => {
          let expectedAuthenticated = false
          let expectedUser: { id: string; email: string; isAdmin: boolean } | null = null

          for (const op of operations) {
            if (op[0] === 'login') {
              const [, userId, email, isAdmin] = op as [string, string, string, boolean]
              useAuthStore.getState().setAuth({ id: userId, email, isAdmin })
              expectedAuthenticated = true
              expectedUser = { id: userId, email, isAdmin }
            } else {
              useAuthStore.getState().logout()
              expectedAuthenticated = false
              expectedUser = null
            }
          }

          const state = useAuthStore.getState()
          return (
            state.isAuthenticated === expectedAuthenticated &&
            (expectedUser === null
              ? state.user === null
              : state.user?.id === expectedUser.id &&
                state.user?.email === expectedUser.email &&
                state.user?.isAdmin === expectedUser.isAdmin)
          )
        }
      ),
      { numRuns: 100 }
    )
  })
})
