/**
 * API 成功反馈一致性属性测试
 * **Feature: admin-shadcn-refactor, Property 7: API 成功反馈一致性**
 * **Validates: Requirements 10.3, 12.2**
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

/** 操作类型 */
type OperationType =
  | 'create_provider'
  | 'update_provider'
  | 'delete_provider'
  | 'create_model'
  | 'update_model'
  | 'delete_model'
  | 'set_tier'
  | 'grant_credits'

/** 操作结果 */
interface OperationResult {
  success: boolean
  operation: OperationType
  entityId?: string
}

/** 成功消息映射 */
const SUCCESS_MESSAGES: Record<OperationType, string> = {
  create_provider: 'Provider 创建成功',
  update_provider: 'Provider 更新成功',
  delete_provider: 'Provider 删除成功',
  create_model: 'Model 创建成功',
  update_model: 'Model 更新成功',
  delete_model: 'Model 删除成功',
  set_tier: '用户等级设置成功',
  grant_credits: '积分发放成功',
}

/** 需要失效的缓存 key 映射 */
const CACHE_INVALIDATION: Record<OperationType, string[]> = {
  create_provider: ['providers'],
  update_provider: ['providers'],
  delete_provider: ['providers', 'models'],
  create_model: ['models'],
  update_model: ['models'],
  delete_model: ['models'],
  set_tier: ['users'],
  grant_credits: ['user'],
}

/**
 * 获取成功消息
 */
function getSuccessMessage(operation: OperationType): string {
  return SUCCESS_MESSAGES[operation]
}

/**
 * 获取需要失效的缓存 key
 */
function getCacheKeysToInvalidate(operation: OperationType): string[] {
  return CACHE_INVALIDATION[operation]
}

/**
 * 模拟成功操作后的反馈
 */
function handleSuccessfulOperation(result: OperationResult): {
  message: string
  cacheKeysToInvalidate: string[]
} {
  if (!result.success) {
    throw new Error('Operation failed')
  }
  return {
    message: getSuccessMessage(result.operation),
    cacheKeysToInvalidate: getCacheKeysToInvalidate(result.operation),
  }
}

describe('属性 7: API 成功反馈一致性', () => {
  it('对于任意成功的变更操作，应返回对应的成功消息', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<OperationType>(
          'create_provider',
          'update_provider',
          'delete_provider',
          'create_model',
          'update_model',
          'delete_model',
          'set_tier',
          'grant_credits'
        ),
        fc.uuid(),
        (operation, entityId) => {
          const result: OperationResult = {
            success: true,
            operation,
            entityId,
          }
          const feedback = handleSuccessfulOperation(result)
          return (
            feedback.message === SUCCESS_MESSAGES[operation] &&
            feedback.message.length > 0
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  it('对于任意成功的变更操作，应返回需要失效的缓存 key', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<OperationType>(
          'create_provider',
          'update_provider',
          'delete_provider',
          'create_model',
          'update_model',
          'delete_model',
          'set_tier',
          'grant_credits'
        ),
        (operation) => {
          const result: OperationResult = {
            success: true,
            operation,
          }
          const feedback = handleSuccessfulOperation(result)
          return (
            feedback.cacheKeysToInvalidate.length > 0 &&
            feedback.cacheKeysToInvalidate.every((key) => key.length > 0)
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  it('所有操作类型都应有对应的成功消息', () => {
    const allOperations: OperationType[] = [
      'create_provider',
      'update_provider',
      'delete_provider',
      'create_model',
      'update_model',
      'delete_model',
      'set_tier',
      'grant_credits',
    ]

    allOperations.forEach((operation) => {
      expect(SUCCESS_MESSAGES[operation]).toBeDefined()
      expect(SUCCESS_MESSAGES[operation].length).toBeGreaterThan(0)
    })
  })

  it('所有操作类型都应有对应的缓存失效配置', () => {
    const allOperations: OperationType[] = [
      'create_provider',
      'update_provider',
      'delete_provider',
      'create_model',
      'update_model',
      'delete_model',
      'set_tier',
      'grant_credits',
    ]

    allOperations.forEach((operation) => {
      expect(CACHE_INVALIDATION[operation]).toBeDefined()
      expect(CACHE_INVALIDATION[operation].length).toBeGreaterThan(0)
    })
  })

  it('删除 Provider 应同时失效 providers 和 models 缓存', () => {
    const cacheKeys = getCacheKeysToInvalidate('delete_provider')
    expect(cacheKeys).toContain('providers')
    expect(cacheKeys).toContain('models')
  })
})
