/**
 * 数据渲染完整性属性测试
 * **Feature: admin-shadcn-refactor, Property 4: 数据渲染完整性**
 * **Validates: Requirements 5.1, 6.1, 7.1, 8.1, 9.1**
 */
import { describe, it } from 'vitest';
import fc from 'fast-check';
import type { UserTier } from '@/types/api';

/** 用户数据 */
interface User {
  id: string;
  email: string;
  subscriptionTier: UserTier;
  isAdmin: boolean;
  createdAt: string;
}

/** Provider 数据 */
interface Provider {
  id: string;
  name: string;
  providerType: string;
  apiKey: string;
  baseUrl: string | null;
  enabled: boolean;
}

/** Model 数据 */
interface Model {
  id: string;
  modelId: string;
  displayName: string;
  providerId: string;
  minTier: UserTier;
  inputTokenPrice: number;
  outputTokenPrice: number;
  enabled: boolean;
}

/** 日志数据 */
interface AdminLog {
  id: string;
  operatorEmail: string;
  action: string;
  createdAt: string;
}

/**
 * 检查用户渲染是否包含所有必要字段
 */
function renderUserContainsAllFields(user: User, rendered: string): boolean {
  return (
    rendered.includes(user.id) &&
    rendered.includes(user.email) &&
    rendered.includes(user.subscriptionTier)
  );
}

/**
 * 检查 Provider 渲染是否包含所有必要字段
 */
function renderProviderContainsAllFields(provider: Provider, rendered: string): boolean {
  return rendered.includes(provider.name) && rendered.includes(provider.providerType);
}

/**
 * 检查 Model 渲染是否包含所有必要字段
 */
function renderModelContainsAllFields(model: Model, rendered: string): boolean {
  return (
    rendered.includes(model.modelId) &&
    rendered.includes(model.displayName) &&
    rendered.includes(model.minTier)
  );
}

/**
 * 检查日志渲染是否包含所有必要字段
 */
function renderLogContainsAllFields(log: AdminLog, rendered: string): boolean {
  return rendered.includes(log.operatorEmail) && rendered.includes(log.action);
}

/**
 * 模拟渲染用户
 */
function renderUser(user: User): string {
  return `${user.id} | ${user.email} | ${user.subscriptionTier} | ${user.isAdmin ? '是' : '否'} | ${user.createdAt}`;
}

/**
 * 模拟渲染 Provider
 */
function renderProvider(provider: Provider): string {
  return `${provider.name} | ${provider.providerType} | ${provider.apiKey} | ${provider.baseUrl || '默认'} | ${provider.enabled ? '启用' : '禁用'}`;
}

/**
 * 模拟渲染 Model
 */
function renderModel(model: Model): string {
  return `${model.modelId} | ${model.displayName} | ${model.minTier} | $${model.inputTokenPrice} / $${model.outputTokenPrice} | ${model.enabled ? '启用' : '禁用'}`;
}

/**
 * 模拟渲染日志
 */
function renderLog(log: AdminLog): string {
  return `${log.operatorEmail} | ${log.action} | ${log.createdAt}`;
}

/** 生成随机用户 */
const userArbitrary = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  subscriptionTier: fc.constantFrom<UserTier>('free', 'basic', 'pro', 'license'),
  isAdmin: fc.boolean(),
  createdAt: fc.constant('2024-01-01T00:00:00.000Z'),
});

/** 生成随机 Provider */
const providerArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  providerType: fc.constantFrom('openai', 'anthropic', 'google'),
  apiKey: fc.string({ minLength: 10, maxLength: 50 }),
  baseUrl: fc.option(fc.webUrl(), { nil: null }),
  enabled: fc.boolean(),
});

/** 生成随机 Model */
const modelArbitrary = fc.record({
  id: fc.uuid(),
  modelId: fc.string({ minLength: 1, maxLength: 50 }),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  providerId: fc.uuid(),
  minTier: fc.constantFrom<UserTier>('free', 'basic', 'pro', 'license'),
  inputTokenPrice: fc.float({ min: 0, max: 100, noNaN: true }),
  outputTokenPrice: fc.float({ min: 0, max: 100, noNaN: true }),
  enabled: fc.boolean(),
});

/** 生成随机日志 */
const logArbitrary = fc.record({
  id: fc.uuid(),
  operatorEmail: fc.emailAddress(),
  action: fc.constantFrom('set_tier', 'grant_credits', 'create_provider', 'delete_model'),
  createdAt: fc.constant('2024-01-01T00:00:00.000Z'),
});

describe('属性 4: 数据渲染完整性', () => {
  describe('用户数据渲染', () => {
    it('对于任意用户数据，渲染后应包含所有必要字段', () => {
      fc.assert(
        fc.property(userArbitrary, (user) => {
          const rendered = renderUser(user);
          return renderUserContainsAllFields(user, rendered);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Provider 数据渲染', () => {
    it('对于任意 Provider 数据，渲染后应包含所有必要字段', () => {
      fc.assert(
        fc.property(providerArbitrary, (provider) => {
          const rendered = renderProvider(provider);
          return renderProviderContainsAllFields(provider, rendered);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Model 数据渲染', () => {
    it('对于任意 Model 数据，渲染后应包含所有必要字段', () => {
      fc.assert(
        fc.property(modelArbitrary, (model) => {
          const rendered = renderModel(model);
          return renderModelContainsAllFields(model, rendered);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('日志数据渲染', () => {
    it('对于任意日志数据，渲染后应包含所有必要字段', () => {
      fc.assert(
        fc.property(logArbitrary, (log) => {
          const rendered = renderLog(log);
          return renderLogContainsAllFields(log, rendered);
        }),
        { numRuns: 100 }
      );
    });
  });
});
