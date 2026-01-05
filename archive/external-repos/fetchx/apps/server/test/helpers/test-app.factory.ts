/**
 * NestJS TestingModule 工厂
 * 用于创建测试应用实例
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { ModuleMetadata } from '@nestjs/common';

export class TestAppFactory {
  /**
   * 创建完整应用实例（E2E 测试用）
   * 需要动态导入 AppModule 避免循环依赖
   */
  static async createApp(): Promise<INestApplication> {
    const { AppModule } = await import('../../src/app.module');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    await app.init();
    return app;
  }

  /**
   * 创建模块实例（集成测试用）
   * 可选择性 Mock 部分依赖
   */
  static async createModule(
    metadata: ModuleMetadata,
    overrides?: { provide: any; useValue: any }[],
  ): Promise<TestingModule> {
    let builder = Test.createTestingModule(metadata);

    for (const override of overrides ?? []) {
      builder = builder.overrideProvider(override.provide).useValue(override.useValue);
    }

    return builder.compile();
  }

  /**
   * 创建模块实例并导入指定模块
   */
  static async createModuleWithImports(
    imports: any[],
    overrides?: { provide: any; useValue: any }[],
  ): Promise<TestingModule> {
    return this.createModule({ imports }, overrides);
  }
}
