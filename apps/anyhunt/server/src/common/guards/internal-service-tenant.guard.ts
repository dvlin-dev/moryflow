import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { ApiKeyService } from '../../api-key/api-key.service';
import type { ApiKeyValidationResult } from '../../api-key/api-key.types';

export const INTERNAL_TENANT_API_KEY_HEADER = 'x-anyhunt-api-key';

const parseBearerToken = (authorization: string | undefined): string | null => {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token;
};

@Injectable()
export class InternalServiceTenantGuard implements CanActivate {
  private readonly token: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly apiKeyService: ApiKeyService,
  ) {
    this.token = this.configService
      .get<string>('INTERNAL_API_TOKEN', '')
      .trim();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.token) {
      throw new ServiceUnavailableException(
        'Internal API token is not configured',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const candidate = parseBearerToken(request.header('authorization'));
    if (!candidate) {
      throw new UnauthorizedException('Missing internal API token');
    }

    if (candidate.length !== this.token.length) {
      throw new UnauthorizedException('Invalid internal API token');
    }

    const isMatch = timingSafeEqual(
      Buffer.from(candidate, 'utf8'),
      Buffer.from(this.token, 'utf8'),
    );
    if (!isMatch) {
      throw new UnauthorizedException('Invalid internal API token');
    }

    const tenantApiKey = request.header(INTERNAL_TENANT_API_KEY_HEADER)?.trim();
    if (!tenantApiKey) {
      throw new UnauthorizedException('Missing tenant API key');
    }

    const apiKey = await this.apiKeyService.validateKey(tenantApiKey);
    (
      request as Request & {
        apiKey?: ApiKeyValidationResult;
      }
    ).apiKey = apiKey;

    return true;
  }
}
