/**
 * NestJS 测试应用工厂
 * 提供统一的测试模块创建方法
 */

import { Test, TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';

export interface TestContext {
  app: INestApplication;
  module: TestingModule;
}

/**
 * 创建完整的测试应用（用于集成测试）
 */
export async function createTestApp(): Promise<TestContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  return { app, module: moduleFixture };
}

/**
 * 创建测试模块（用于单元测试）
 */
export async function createTestModule(
  imports: any[] = [],
  providers: any[] = []
): Promise<TestingModule> {
  return Test.createTestingModule({
    imports,
    providers,
  }).compile();
}
