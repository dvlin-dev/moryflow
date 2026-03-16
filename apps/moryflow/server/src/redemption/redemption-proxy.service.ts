import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreditService } from '../credit';

@Injectable()
export class RedemptionProxyService implements OnModuleInit {
  private readonly logger = new Logger(RedemptionProxyService.name);
  private anyhuntApiBaseUrl = '';
  private anyhuntApiKey = '';

  constructor(
    private readonly configService: ConfigService,
    private readonly creditService: CreditService,
  ) {}

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

    const result = body as {
      type: string;
      creditsAmount?: number;
      membershipTier?: string;
      membershipDays?: number;
      [key: string]: unknown;
    };

    // Sync local Moryflow credit records after successful anyhunt redemption
    try {
      if (result.type === 'CREDITS' && result.creditsAmount) {
        await this.creditService.grantPurchasedCredits(
          userId,
          result.creditsAmount,
        );
      } else if (
        result.type === 'MEMBERSHIP' &&
        result.membershipTier &&
        result.membershipDays
      ) {
        const now = new Date();
        const periodEnd = new Date(
          now.getTime() + result.membershipDays * 86400000,
        );
        const creditsPerMonth = this.getSubscriptionCredits(
          result.membershipTier,
        );
        if (creditsPerMonth > 0) {
          await this.creditService.grantSubscriptionCredits(
            userId,
            creditsPerMonth,
            now,
            periodEnd,
          );
        }
      }
    } catch (err) {
      // Log but don't fail — the anyhunt-side redemption already succeeded
      this.logger.error('Failed to sync local credits after redemption', err);
    }

    return result;
  }

  private getSubscriptionCredits(tier: string): number {
    const TIER_CREDITS: Record<string, number> = {
      BASIC: 5000,
      PRO: 20000,
      TEAM: 60000,
    };
    return TIER_CREDITS[tier.toUpperCase()] ?? 0;
  }
}
