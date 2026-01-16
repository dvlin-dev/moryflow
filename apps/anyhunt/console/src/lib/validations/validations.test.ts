/**
 * 表单验证正确性属性测试
 * **Feature: admin-shadcn-refactor, Property 5: 表单验证正确性**
 * **Validates: Requirements 10.1, 10.4**
 */
import { describe, it } from 'vitest'
import fc from 'fast-check'
import { loginSchema } from './auth'
import { setTierSchema, grantCreditsSchema } from './user'
import { createProviderSchema } from './provider'
import { createModelSchema } from './model'

describe('属性 5: 表单验证正确性', () => {
  describe('登录表单验证', () => {
    it('对于任意有效邮箱和密码（>=6字符），验证应通过', () => {
      // 生成符合 RFC 5322 标准的邮箱地址
      const validEmailArb = fc.tuple(
        fc.stringMatching(/^[a-z][a-z0-9]{2,10}$/),
        fc.stringMatching(/^[a-z]{2,10}$/),
        fc.constantFrom('com', 'org', 'net', 'io')
      ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

      fc.assert(
        fc.property(
          validEmailArb,
          fc.stringMatching(/^[a-zA-Z0-9]{6,20}$/),
          (email, password) => {
            const result = loginSchema.safeParse({ email, password })
            return result.success === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于任意无效邮箱，验证应失败并返回邮箱错误', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !s.includes('@') || !s.includes('.')),
          fc.string({ minLength: 6 }),
          (invalidEmail, password) => {
            const result = loginSchema.safeParse({ email: invalidEmail, password })
            if (!result.success) {
              const hasEmailError = result.error.issues.some(
                (issue) => issue.path.includes('email')
              )
              return hasEmailError
            }
            return false
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于任意短密码（<6字符），验证应失败并返回密码错误', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          fc.string({ minLength: 0, maxLength: 5 }),
          (email, shortPassword) => {
            const result = loginSchema.safeParse({ email, password: shortPassword })
            if (!result.success) {
              const hasPasswordError = result.error.issues.some(
                (issue) => issue.path.includes('password')
              )
              return hasPasswordError
            }
            return false
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('用户等级设置验证', () => {
    it('对于任意有效等级，验证应通过', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('free', 'basic', 'pro', 'license'),
          (tier) => {
            const result = setTierSchema.safeParse({ tier })
            return result.success === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于任意无效等级字符串，验证应失败', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !['free', 'basic', 'pro', 'license'].includes(s)),
          (invalidTier) => {
            const result = setTierSchema.safeParse({ tier: invalidTier })
            return result.success === false
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('积分发放验证', () => {
    it('对于任意有效积分类型和正数金额，验证应通过', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('subscription', 'purchased'),
          fc.integer({ min: 1, max: 1000000 }),
          (type, amount) => {
            const result = grantCreditsSchema.safeParse({ type, amount })
            return result.success === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于任意非正数金额，验证应失败', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('subscription', 'purchased'),
          fc.integer({ min: -1000, max: 0 }),
          (type, invalidAmount) => {
            const result = grantCreditsSchema.safeParse({ type, amount: invalidAmount })
            return result.success === false
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('提供商创建验证', () => {
    it('对于任意有效提供商数据，验证应通过', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-z][a-z0-9]{0,49}$/),
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{0,49}$/),
          fc.stringMatching(/^sk-[a-zA-Z0-9]{10,90}$/),
          fc.boolean(),
          fc.integer({ min: 0, max: 100 }),
          (providerType, name, apiKey, enabled, sortOrder) => {
            const result = createProviderSchema.safeParse({
              providerType,
              name,
              apiKey,
              enabled,
              sortOrder,
            })
            return result.success === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于任意空字段，验证应失败', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('providerType', 'name', 'apiKey'),
          (emptyField) => {
            const data = {
              providerType: 'openai',
              name: 'Test Provider',
              apiKey: 'sk-test-key',
              [emptyField]: '',
            }
            const result = createProviderSchema.safeParse(data)
            return result.success === false
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('模型创建验证', () => {
    it('对于任意有效模型数据，验证应通过', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-z][a-z0-9-]{0,49}$/),
          fc.stringMatching(/^[a-z][a-z0-9-]{0,49}$/),
          fc.stringMatching(/^[a-z][a-z0-9-]{0,49}$/),
          fc.stringMatching(/^[A-Z][a-zA-Z0-9 -]{0,49}$/),
          fc.constantFrom('free', 'basic', 'pro', 'license'),
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.integer({ min: 1, max: 1000000 }),
          fc.integer({ min: 1, max: 100000 }),
          fc.boolean(),
          fc.integer({ min: 0, max: 100 }),
          (providerId, modelId, upstreamId, displayName, minTier, inputPrice, outputPrice, maxContext, maxOutput, enabled, sortOrder) => {
            const result = createModelSchema.safeParse({
              providerId,
              modelId,
              upstreamId,
              displayName,
              minTier,
              inputTokenPrice: inputPrice,
              outputTokenPrice: outputPrice,
              maxContextTokens: maxContext,
              maxOutputTokens: maxOutput,
              capabilities: { vision: false, tools: false, json: false },
              enabled,
              sortOrder,
            })
            return result.success === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于任意负数价格，验证应失败', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: -1 }),
          (negativePrice) => {
            const result = createModelSchema.safeParse({
              providerId: 'test-provider',
              modelId: 'test-model',
              upstreamId: 'gpt-4',
              displayName: 'Test Model',
              minTier: 'free',
              inputTokenPrice: negativePrice,
              outputTokenPrice: 0.01,
              maxContextTokens: 4096,
              maxOutputTokens: 1024,
              capabilities: { vision: false, tools: false, json: false },
            })
            return result.success === false
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
