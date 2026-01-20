/**
 * [INPUT]: Nest app (global prefix + URI versioning) + mocked ConsolePlaygroundService
 * [OUTPUT]: 确认 `/api/v1/console/playground/browser/session` 路由可达且 Swagger 可生成对应 path
 * [POS]: 回归测试，防止 Console Playground Browser 路由在构建/注册/版本化中被遗漏
 */

import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { VersioningType, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { ConsolePlaygroundBrowserController } from '../../src/console-playground/console-playground-browser.controller';
import { ConsolePlaygroundService } from '../../src/console-playground/console-playground.service';

describe('Console Playground Browser routing', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ConsolePlaygroundBrowserController],
      providers: [
        {
          provide: ConsolePlaygroundService,
          useValue: {
            createBrowserSession: vi
              .fn()
              .mockResolvedValue({ id: 'sess_test' }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();

    // 与 apps/anyhunt/server/src/main.ts 保持一致
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    // CurrentUser decorator 依赖 req.user
    app.use((req: any, _res: any, next: any) => {
      req.user = { id: 'user_test' };
      next();
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('handles POST /api/v1/console/playground/browser/session', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/console/playground/browser/session')
      .send({ apiKeyId: 'cjld2cjxh0000qzrmn831i7rn' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 'sess_test' });
  });

  it('generates Swagger path for /api/v1/console/playground/browser/session', () => {
    const swaggerConfig = new DocumentBuilder().setTitle('Test').build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    expect(Object.keys(document.paths)).toContain(
      '/api/v1/console/playground/browser/session',
    );
  });
});
