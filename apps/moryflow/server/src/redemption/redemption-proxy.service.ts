import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedemptionProxyService implements OnModuleInit {
  private readonly logger = new Logger(RedemptionProxyService.name);
  private anyhuntApiBaseUrl = '';
  private anyhuntApiKey = '';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const baseUrl = this.configService.get<string>('ANYHUNT_API_BASE_URL');
    if (!baseUrl?.trim()) {
      throw new Error('ANYHUNT_API_BASE_URL is required');
    }
    this.anyhuntApiBaseUrl = baseUrl.trim().replace(/\/+$/, '');

    const apiKey = this.configService.get<string>('ANYHUNT_API_KEY');
    if (!apiKey?.trim()) {
      throw new Error('ANYHUNT_API_KEY is required');
    }
    this.anyhuntApiKey = apiKey.trim();
  }

  async redeem(
    userId: string,
    code: string,
  ): Promise<{ type: string; [key: string]: unknown }> {
    const url = `${this.anyhuntApiBaseUrl}/api/v1/redemption-codes/redeem`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.anyhuntApiKey}`,
        },
        body: JSON.stringify({ userId, code }),
      });
    } catch (err) {
      this.logger.error('Failed to reach Anyhunt redemption endpoint', err);
      throw new InternalServerErrorException(
        'Unable to process redemption at this time',
      );
    }

    const body = (await res.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!res.ok) {
      const message =
        (body && typeof body.message === 'string' && body.message) ||
        'Redemption failed';
      if (res.status >= 400 && res.status < 500) {
        throw new BadRequestException(message);
      }
      this.logger.error(
        `Anyhunt redemption returned ${res.status}: ${message}`,
      );
      throw new InternalServerErrorException(
        'Unable to process redemption at this time',
      );
    }

    return body as { type: string; [key: string]: unknown };
  }
}
