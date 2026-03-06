/**
 * [INPUT]: AuthModule + TestContainers + JWKS endpoint
 * [OUTPUT]: JWKS 返回内容可校验 access token 签名
 * [POS]: Auth JWKS 集成测试（需要 RUN_INTEGRATION_TESTS=1）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { VersioningType, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { createPublicKey, verify } from 'crypto';
import { TestContainers } from '../../../test/helpers';
import { AuthModule } from '../auth.module';
import { AuthTokensService } from '../auth.tokens.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { EmailModule } from '../../email/email.module';

type JsonWebKey = {
  kty?: string;
  crv?: string;
  x?: string;
  y?: string;
  n?: string;
  e?: string;
  alg?: string;
  use?: string;
  kid?: string;
};

type JwksResponse = {
  keys: JsonWebKey[];
};

const decodeSegment = (segment: string): Record<string, unknown> =>
  JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >;

const readJwks = (body: unknown): JwksResponse => {
  if (typeof body === 'string') {
    return JSON.parse(body) as JwksResponse;
  }
  return body as JwksResponse;
};

describe('Auth JWKS (Integration)', () => {
  let app: INestApplication;
  let tokensService: AuthTokensService;

  beforeAll(async () => {
    process.env.BETTER_AUTH_SECRET =
      process.env.BETTER_AUTH_SECRET ?? 'test-secret-key-min-32-chars-123456';
    process.env.BETTER_AUTH_URL =
      process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';

    await TestContainers.start();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        RedisModule,
        EmailModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    await app.init();

    tokensService = moduleFixture.get(AuthTokensService);
  }, 60000);

  afterAll(async () => {
    await app?.close();
    await TestContainers.stop();
  });

  it('should return jwks that can verify access token signature', async () => {
    const access = await tokensService.createAccessToken('user_jwks_test');
    const [headerSegment, payloadSegment, signatureSegment] =
      access.token.split('.');

    expect(headerSegment).toBeTruthy();
    expect(payloadSegment).toBeTruthy();
    expect(signatureSegment).toBeTruthy();

    const header = decodeSegment(headerSegment) as JsonWebKey;
    expect(header.kid).toBeTruthy();

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/jwks')
      .expect(200);

    const jwks = readJwks(response.body);
    expect(Array.isArray(jwks.keys)).toBe(true);
    expect(jwks.keys.length).toBeGreaterThan(0);

    const jwk = jwks.keys.find((item) => item.kid === header.kid);
    expect(jwk).toBeTruthy();

    const publicKey = createPublicKey({
      key: jwk as JsonWebKey,
      format: 'jwk',
    });

    const signingInput = Buffer.from(`${headerSegment}.${payloadSegment}`);
    const signature = Buffer.from(signatureSegment, 'base64url');

    const verified = verify(null, signingInput, publicKey, signature);
    expect(verified).toBe(true);
  });
});
