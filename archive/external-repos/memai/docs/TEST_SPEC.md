# Memory 测试规范

> 本文档定义截图服务的测试架构、规范和执行策略。

## 测试分层

| 层级 | 范围 | 依赖处理 | 运行时机 | 覆盖率目标 |
|------|------|----------|----------|------------|
| **单元测试** | 单个类/函数 | 全部 Mock | 每次提交 | - |
| **集成测试** | 模块内协作 | Testcontainers | 每次提交 | 核心 ≥80% |
| **E2E 测试** | 完整 HTTP 流程 | Testcontainers | 每次提交 | 其他 ≥60% |
| **渲染测试** | Playwright 真实渲染 | 本地 HTML | CI only | - |

## 目录结构

```
apps/server/
├── vitest.config.ts                 # Vitest 主配置
├── test/
│   ├── setup.ts                     # 全局 setup（环境变量、超时配置）
│   ├── setup.e2e.ts                 # E2E 专用 setup（Testcontainers 启动）
│   ├── helpers/
│   │   ├── test-app.factory.ts      # NestJS TestingModule 工厂
│   │   ├── mock.factory.ts          # Mock 数据/服务工厂
│   │   ├── containers.ts            # Testcontainers 封装
│   │   └── assertions.ts            # 自定义断言
│   ├── fixtures/
│   │   ├── test-page.html           # 截图目标页面
│   │   ├── test-page-dynamic.html   # 带 JS 的动态页面
│   │   └── seed.ts                  # 共享测试数据 seed
│   └── mocks/
│       ├── redis.mock.ts            # Redis Mock（单元测试用）
│       ├── prisma.mock.ts           # Prisma Mock（单元测试用）
│       ├── r2.mock.ts               # R2 存储 Mock
│       └── playwright.mock.ts       # PageRenderer Mock
└── src/
    └── screenshot/
        └── __tests__/               # 模块测试（与源码同级）
            ├── url-validator.spec.ts
            ├── image-processor.spec.ts
            ├── screenshot.service.spec.ts
            ├── screenshot.service.integration.spec.ts
            └── screenshot.e2e.spec.ts
```

## 技术栈

| 用途 | 工具 |
|------|------|
| 测试框架 | Vitest |
| HTTP 测试 | supertest |
| NestJS 测试 | @nestjs/testing |
| 容器化依赖 | Testcontainers |
| 覆盖率 | @vitest/coverage-v8 |

## 命名规范

| 类型 | 文件命名 | 示例 |
|------|----------|------|
| 单元测试 | `*.spec.ts` | `url-validator.spec.ts` |
| 集成测试 | `*.integration.spec.ts` | `screenshot.service.integration.spec.ts` |
| E2E 测试 | `*.e2e.spec.ts` | `screenshot.e2e.spec.ts` |
| 渲染测试 | `*.render.spec.ts` | `page-renderer.render.spec.ts` |

## Vitest 配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    exclude: ['**/*.render.spec.ts'], // 渲染测试默认排除
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.constants.ts',
        'src/**/*.types.ts',
        'generated/**',
      ],
      thresholds: {
        // 核心模块
        'src/screenshot/**': { statements: 80, branches: 80 },
        'src/quota/**': { statements: 80, branches: 80 },
        // 其他模块
        global: { statements: 60, branches: 60 },
      },
    },
    // 测试隔离：集成测试需要共享容器（Vitest 4.x）
    pool: 'forks',
    isolate: false,
  },
});
```

## 测试命令

```bash
# package.json scripts
{
  "test": "vitest run",                           # 运行所有测试（不含渲染）
  "test:watch": "vitest",                         # 监听模式
  "test:cov": "vitest run --coverage",            # 带覆盖率
  "test:unit": "vitest run --include='**/*.spec.ts' --exclude='**/*.integration.spec.ts' --exclude='**/*.e2e.spec.ts'",
  "test:integration": "vitest run --include='**/*.integration.spec.ts'",
  "test:e2e": "vitest run --include='**/*.e2e.spec.ts'",
  "test:render": "vitest run --include='**/*.render.spec.ts'",  # CI only
  "test:ci": "vitest run --coverage && vitest run --include='**/*.render.spec.ts'"
}
```

## Testcontainers 配置

```typescript
// test/helpers/containers.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';

export class TestContainers {
  private static pgContainer: StartedPostgreSqlContainer;
  private static redisContainer: StartedRedisContainer;

  static async start() {
    // 并行启动容器
    const [pg, redis] = await Promise.all([
      new PostgreSqlContainer('postgres:16-alpine').start(),
      new RedisContainer('redis:7-alpine').start(),
    ]);

    this.pgContainer = pg;
    this.redisContainer = redis;

    // 设置环境变量
    process.env.DATABASE_URL = pg.getConnectionUri();
    process.env.REDIS_URL = redis.getConnectionUrl();
  }

  static async stop() {
    await Promise.all([
      this.pgContainer?.stop(),
      this.redisContainer?.stop(),
    ]);
  }

  static async resetDatabase() {
    // 使用 Prisma 重置数据库
    // prisma migrate reset --force
  }
}
```

## 测试工厂

### TestApp 工厂

```typescript
// test/helpers/test-app.factory.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';

export class TestAppFactory {
  /**
   * 创建完整应用实例（E2E 测试用）
   */
  static async createApp(): Promise<INestApplication> {
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
    module: any,
    overrides?: { provide: any; useValue: any }[],
  ): Promise<TestingModule> {
    let builder = Test.createTestingModule({ imports: [module] });

    for (const override of overrides ?? []) {
      builder = builder.overrideProvider(override.provide).useValue(override.useValue);
    }

    return builder.compile();
  }
}
```

### Mock 工厂

```typescript
// test/helpers/mock.factory.ts
import { vi } from 'vitest';

export const MockFactory = {
  // 创建 Mock 用户
  createUser(overrides = {}) {
    return {
      id: 'user_test123',
      email: 'test@example.com',
      tier: 'FREE' as const,
      ...overrides,
    };
  },

  // 创建 Mock 截图请求
  createScreenshotRequest(overrides = {}) {
    return {
      url: 'https://example.com',
      width: 1280,
      height: 800,
      format: 'png' as const,
      quality: 80,
      delay: 0,
      fullPage: false,
      sync: true,
      timeout: 30000,
      ...overrides,
    };
  },

  // 创建 Mock Redis 服务
  createRedisService() {
    return {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      tryAcquireProcessingLock: vi.fn().mockResolvedValue(null),
      releaseProcessingLock: vi.fn().mockResolvedValue(undefined),
    };
  },

  // 创建 Mock R2 服务
  createR2Service() {
    return {
      uploadFile: vi.fn().mockResolvedValue(undefined),
      uploadStream: vi.fn().mockResolvedValue(undefined),
      isConfigured: vi.fn().mockReturnValue(true),
    };
  },

  // 创建 Mock PageRenderer（避免真实 Playwright）
  createPageRenderer() {
    return {
      render: vi.fn().mockResolvedValue({
        buffer: Buffer.from('mock-image'),
        width: 1280,
        height: 800,
        meta: { title: 'Test Page' },
      }),
    };
  },
};
```

## 共享 Seed 数据

```typescript
// test/fixtures/seed.ts
import { PrismaClient } from '@prisma/client';

export async function seedTestData(prisma: PrismaClient) {
  // 清理现有数据
  await prisma.$transaction([
    prisma.screenshot.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.quotaPurchase.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // 创建测试用户
  const freeUser = await prisma.user.create({
    data: {
      id: 'user_free_test',
      email: 'free@test.com',
      name: 'Free User',
      tier: 'FREE',
    },
  });

  const proUser = await prisma.user.create({
    data: {
      id: 'user_pro_test',
      email: 'pro@test.com',
      name: 'Pro User',
      tier: 'PRO',
    },
  });

  // 创建 API Key
  await prisma.apiKey.create({
    data: {
      id: 'apikey_test',
      userId: freeUser.id,
      name: 'Test Key',
      keyHash: 'hash_test_key',
      keyPrefix: 'mm_test',
    },
  });

  // 创建订阅（PRO 用户）
  await prisma.subscription.create({
    data: {
      userId: proUser.id,
      tier: 'PRO',
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      monthlyQuota: 20000,
      usedQuota: 0,
    },
  });

  return { freeUser, proUser };
}
```

## 测试模板

### 单元测试模板

```typescript
// src/screenshot/__tests__/url-validator.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { UrlValidator } from '../url-validator';

describe('UrlValidator', () => {
  let validator: UrlValidator;

  beforeEach(() => {
    validator = new UrlValidator();
  });

  describe('validate', () => {
    it('应该允许合法的 HTTPS URL', async () => {
      await expect(validator.validate('https://example.com')).resolves.not.toThrow();
    });

    it('应该拒绝私有 IP 地址', async () => {
      await expect(validator.validate('http://192.168.1.1')).rejects.toThrow('SSRF');
    });

    it('应该拒绝 localhost', async () => {
      await expect(validator.validate('http://localhost')).rejects.toThrow();
    });

    it('应该拒绝云厂商 metadata 地址', async () => {
      await expect(validator.validate('http://169.254.169.254')).rejects.toThrow();
    });
  });
});
```

### 集成测试模板

```typescript
// src/screenshot/__tests__/screenshot.service.integration.spec.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestingModule } from '@nestjs/testing';
import { ScreenshotService } from '../screenshot.service';
import { ScreenshotModule } from '../screenshot.module';
import { TestAppFactory } from '../../../test/helpers/test-app.factory';
import { TestContainers } from '../../../test/helpers/containers';
import { MockFactory } from '../../../test/helpers/mock.factory';
import { seedTestData } from '../../../test/fixtures/seed';
import { PrismaService } from '../../prisma/prisma.service';

describe('ScreenshotService (Integration)', () => {
  let module: TestingModule;
  let service: ScreenshotService;
  let prisma: PrismaService;

  beforeAll(async () => {
    await TestContainers.start();

    module = await TestAppFactory.createModule(ScreenshotModule, [
      // Mock PageRenderer 避免真实渲染
      { provide: 'PageRenderer', useValue: MockFactory.createPageRenderer() },
      // Mock R2 避免真实上传
      { provide: 'R2Service', useValue: MockFactory.createR2Service() },
    ]);

    service = module.get(ScreenshotService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await module.close();
    await TestContainers.stop();
  });

  beforeEach(async () => {
    await seedTestData(prisma);
  });

  describe('createScreenshot', () => {
    it('缓存命中时不扣配额', async () => {
      // 第一次请求
      const ctx = {
        userId: 'user_free_test',
        apiKeyId: 'apikey_test',
        tier: 'FREE' as const,
        options: MockFactory.createScreenshotRequest(),
      };

      await service.createScreenshot(ctx);

      // 第二次相同请求应该命中缓存
      const result = await service.createScreenshot(ctx);

      expect(result.data.fromCache).toBe(true);
      // 验证配额只扣了一次
    });

    it('配额不足时抛出错误', async () => {
      // 设置配额为 0
      // ...

      await expect(service.createScreenshot(ctx)).rejects.toThrow('QUOTA_EXCEEDED');
    });
  });
});
```

### E2E 测试模板

```typescript
// src/screenshot/__tests__/screenshot.e2e.spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestAppFactory } from '../../../test/helpers/test-app.factory';
import { TestContainers } from '../../../test/helpers/containers';
import { seedTestData } from '../../../test/fixtures/seed';

describe('Screenshot API (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await TestContainers.start();
    app = await TestAppFactory.createApp();
    await seedTestData(app.get(PrismaService));
  });

  afterAll(async () => {
    await app.close();
    await TestContainers.stop();
  });

  describe('POST /api/screenshots', () => {
    it('无认证时返回 401', async () => {
      await request(app.getHttpServer())
        .post('/api/screenshots')
        .send({ url: 'https://example.com' })
        .expect(401);
    });

    it('使用有效 API Key 创建截图', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/screenshots')
        .set('X-API-Key', 'mm_test_valid_key')
        .send({
          url: 'https://example.com',
          width: 1280,
          height: 800,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
    });

    it('无效 URL 返回 400', async () => {
      await request(app.getHttpServer())
        .post('/api/screenshots')
        .set('X-API-Key', 'mm_test_valid_key')
        .send({ url: 'not-a-url' })
        .expect(400);
    });
  });
});
```

### 渲染测试模板（CI Only）

```typescript
// src/screenshot/__tests__/page-renderer.render.spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PageRenderer } from '../page-renderer';
import { BrowserPool } from '../../browser';
import * as path from 'path';

describe('PageRenderer (Real Rendering)', () => {
  let browserPool: BrowserPool;
  let renderer: PageRenderer;

  beforeAll(async () => {
    browserPool = new BrowserPool();
    await browserPool.initialize();
    renderer = new PageRenderer();
  });

  afterAll(async () => {
    await browserPool.destroy();
  });

  it('应该正确渲染本地 HTML 页面', async () => {
    const context = await browserPool.acquireContext();
    const htmlPath = path.join(__dirname, '../../../test/fixtures/test-page.html');

    try {
      const result = await renderer.render(context, {
        url: `file://${htmlPath}`,
        width: 800,
        height: 600,
        format: 'png',
        quality: 80,
        delay: 0,
        fullPage: false,
        sync: true,
        timeout: 30000,
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    } finally {
      await browserPool.releaseContext(context);
    }
  });

  it('应该支持 fullPage 截图', async () => {
    // ...
  });

  it('应该支持 clip 区域截图', async () => {
    // ...
  });
});
```

## 核心测试用例清单

### URL Validator

| 用例 | 预期 |
|------|------|
| 合法 HTTPS URL | 通过 |
| HTTP URL | 通过（或按配置拒绝） |
| localhost | 拒绝 |
| 127.0.0.1 | 拒绝 |
| 192.168.x.x | 拒绝 |
| 10.x.x.x | 拒绝 |
| 169.254.169.254 (AWS metadata) | 拒绝 |
| DNS 解析到私有 IP | 拒绝 |

### Screenshot Service

| 用例 | 预期 |
|------|------|
| 正常请求 | 返回截图 URL |
| 缓存命中 | fromCache=true，不扣配额 |
| 相同请求并发 | 等待首个请求完成 |
| 配额不足 | 抛出 QUOTA_EXCEEDED |
| 并发超限 | 抛出 CONCURRENT_LIMIT |
| 请求失败 | 配额自动返还 |
| PRO 套餐 | 无水印 |
| FREE 套餐 | 有水印 |

### Quota Service

| 用例 | 预期 |
|------|------|
| 月度配额充足 | 扣减月度配额 |
| 月度配额不足，有按量 | 扣减按量配额 |
| 全部配额不足 | 抛出错误 |
| 返还配额（月度源） | 恢复月度配额 |
| 返还配额（按量源） | 恢复按量配额 |
| 频率限制触发 | 抛出 RATE_LIMIT |

### Image Processor

| 用例 | 预期 |
|------|------|
| PNG 格式 | 输出 PNG |
| JPEG 格式 + quality | 按质量压缩 |
| WebP 格式 | 输出 WebP |
| 添加水印 | 图片包含水印 |

## CI 配置示例

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install

      - name: Run tests
        run: pnpm --filter server test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: apps/server/coverage/lcov.info
```

## 最佳实践

1. **隔离性**：每个测试用例独立，不依赖执行顺序
2. **可重复**：多次运行结果一致
3. **快速反馈**：单元测试 < 5s，集成测试 < 30s
4. **清晰命名**：`should_期望行为_when_条件`
5. **单一断言**：每个测试用例验证一个行为
6. **Mock 边界**：外部依赖（DB、Redis、R2）在集成测试边界 Mock

---

*版本: 1.0 | 更新: 2025-01*
