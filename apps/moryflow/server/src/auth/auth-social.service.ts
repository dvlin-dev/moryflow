/**
 * [INPUT]: userId/nonce/exchangeCode（OAuth bridge 票据）
 * [OUTPUT]: 一次性交换码签发与原子消费结果
 * [POS]: AuthSocial bridge 核心服务（防重放）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { RedisService } from '../redis/redis.service';
import {
  AUTH_SOCIAL_BRIDGE_HOST,
  AUTH_SOCIAL_BRIDGE_PATH,
  AUTH_SOCIAL_EXCHANGE_CODE_BYTES,
  AUTH_SOCIAL_EXCHANGE_KEY_PREFIX,
  AUTH_SOCIAL_PROVIDER_GOOGLE,
  getAuthSocialExchangeTtlSeconds,
  getMoryflowDeepLinkScheme,
} from './auth-social.constants';

export type GoogleExchangeTicket = {
  userId: string;
  nonce: string;
  provider: typeof AUTH_SOCIAL_PROVIDER_GOOGLE;
  issuedAt: string;
};

const CONSUME_EXCHANGE_CODE_LUA = `
local value = redis.call("GET", KEYS[1])
if value then
  redis.call("DEL", KEYS[1])
end
return value
`;

@Injectable()
export class AuthSocialService {
  constructor(private readonly redis: RedisService) {}

  async issueGoogleExchangeCode(input: {
    userId: string;
    nonce: string;
  }): Promise<string> {
    const code = randomBytes(AUTH_SOCIAL_EXCHANGE_CODE_BYTES).toString(
      'base64url',
    );
    const ticket: GoogleExchangeTicket = {
      userId: input.userId,
      nonce: input.nonce,
      provider: AUTH_SOCIAL_PROVIDER_GOOGLE,
      issuedAt: new Date().toISOString(),
    };

    await this.redis.set(
      this.buildExchangeKey(code),
      JSON.stringify(ticket),
      getAuthSocialExchangeTtlSeconds(),
    );

    return code;
  }

  async consumeGoogleExchangeCode(
    code: string,
  ): Promise<GoogleExchangeTicket | null> {
    if (!code) {
      return null;
    }

    const raw = await this.redis.client.eval(
      CONSUME_EXCHANGE_CODE_LUA,
      1,
      this.buildExchangeKey(code),
    );

    if (typeof raw !== 'string') {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<GoogleExchangeTicket>;
      if (
        typeof parsed.userId !== 'string' ||
        typeof parsed.nonce !== 'string' ||
        parsed.provider !== AUTH_SOCIAL_PROVIDER_GOOGLE ||
        typeof parsed.issuedAt !== 'string'
      ) {
        return null;
      }

      return {
        userId: parsed.userId,
        nonce: parsed.nonce,
        provider: parsed.provider,
        issuedAt: parsed.issuedAt,
      };
    } catch {
      return null;
    }
  }

  buildGoogleBridgeDeepLink(input: { code: string; nonce: string }): string {
    const scheme = getMoryflowDeepLinkScheme();
    const url = new URL(`${scheme}://${AUTH_SOCIAL_BRIDGE_HOST}`);
    url.pathname = AUTH_SOCIAL_BRIDGE_PATH;
    url.searchParams.set('code', input.code);
    url.searchParams.set('nonce', input.nonce);
    return url.toString();
  }

  private buildExchangeKey(code: string): string {
    return `${AUTH_SOCIAL_EXCHANGE_KEY_PREFIX}:${code}`;
  }
}
