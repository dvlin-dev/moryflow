/**
 * API 错误处理一致性属性测试
 * **Feature: admin-shadcn-refactor, Property 6: API 错误处理一致性**
 * **Validates: Requirements 2.3, 10.2**
 */
import { describe, it } from 'vitest'
import fc from 'fast-check'
import { ApiError } from './api-client'

describe('属性 6: API 错误处理一致性', () => {
  describe('ApiError 类', () => {
    it('对于任意 HTTP 状态码和错误信息，ApiError 应正确存储属性', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 599 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          (status, code, message) => {
            const error = new ApiError(status, code, message)
            return (
              error.status === status &&
              error.code === code &&
              error.message === message &&
              error.name === 'ApiError'
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于任意 401 状态码，isUnauthorized 应返回 true', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          (code, message) => {
            const error = new ApiError(401, code, message)
            return error.isUnauthorized === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于任意非 401 状态码，isUnauthorized 应返回 false', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 599 }).filter((s) => s !== 401),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          (status, code, message) => {
            const error = new ApiError(status, code, message)
            return error.isUnauthorized === false
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于任意 403 状态码，isForbidden 应返回 true', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          (code, message) => {
            const error = new ApiError(403, code, message)
            return error.isForbidden === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于任意 404 状态码，isNotFound 应返回 true', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          (code, message) => {
            const error = new ApiError(404, code, message)
            return error.isNotFound === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于任意 5xx 状态码，isServerError 应返回 true', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 500, max: 599 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          (status, code, message) => {
            const error = new ApiError(status, code, message)
            return error.isServerError === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于任意非 5xx 状态码，isServerError 应返回 false', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 499 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          (status, code, message) => {
            const error = new ApiError(status, code, message)
            return error.isServerError === false
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
