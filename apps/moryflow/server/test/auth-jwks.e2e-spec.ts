/**
 * Auth JWKS E2E Tests
 * 测试 JWKS 能用于校验 access token 签名
 */

// Note: supertest response.body is typed as 'any', these rules are disabled for e2e tests

import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, VersioningType } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { createPublicKey, verify } from 'crypto';
import { AuthModule } from '../src/auth/auth.module';
import { AuthTokensService } from '../src/auth/auth.tokens.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { RedisModule } from '../src/redis/redis.module';
import { EmailModule } from '../src/email/email.module';

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

describe('Auth JWKS (e2e)', () => {
  let app: INestApplication;
  let tokensService: AuthTokensService;

  beforeAll(async () => {
    process.env.BETTER_AUTH_SECRET =
      process.env.BETTER_AUTH_SECRET ?? 'test-secret-key-min-32-chars-123456';
    process.env.BETTER_AUTH_URL =
      process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';

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
    app.setGlobalPrefix('api', {
      exclude: ['health', 'health/(.*)'],
    });
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    await app.init();

    tokensService = moduleFixture.get(AuthTokensService);
  }, 60000);

  afterAll(async () => {
    await app.close();
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
