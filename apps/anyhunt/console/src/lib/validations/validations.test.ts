/**
 * 表单验证正确性属性测试
 * **Feature: admin-shadcn-refactor, Property 5: 表单验证正确性**
 * **Validates: Requirements 10.1, 10.4**
 */
import { describe, it } from 'vitest';
import fc from 'fast-check';
import { loginSchema } from './auth';

describe('属性 5: 表单验证正确性', () => {
  describe('登录表单验证', () => {
    it('对于任意有效邮箱和密码（>=6字符），验证应通过', () => {
      // 生成符合 RFC 5322 标准的邮箱地址
      const validEmailArb = fc
        .tuple(
          fc.stringMatching(/^[a-z][a-z0-9]{2,10}$/),
          fc.stringMatching(/^[a-z]{2,10}$/),
          fc.constantFrom('com', 'org', 'net', 'io')
        )
        .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

      fc.assert(
        fc.property(validEmailArb, fc.stringMatching(/^[a-zA-Z0-9]{6,20}$/), (email, password) => {
          const result = loginSchema.safeParse({ email, password });
          return result.success === true;
        }),
        { numRuns: 100 }
      );
    });

    it('对于任意无效邮箱，验证应失败并返回邮箱错误', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !s.includes('@') || !s.includes('.')),
          fc.string({ minLength: 6 }),
          (invalidEmail, password) => {
            const result = loginSchema.safeParse({ email: invalidEmail, password });
            if (!result.success) {
              const hasEmailError = result.error.issues.some((issue) =>
                issue.path.includes('email')
              );
              return hasEmailError;
            }
            return false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('对于任意短密码（<6字符），验证应失败并返回密码错误', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          fc.string({ minLength: 0, maxLength: 5 }),
          (email, shortPassword) => {
            const result = loginSchema.safeParse({ email, password: shortPassword });
            if (!result.success) {
              const hasPasswordError = result.error.issues.some((issue) =>
                issue.path.includes('password')
              );
              return hasPasswordError;
            }
            return false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
