import { randomInt } from 'crypto';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreditService } from '../credit';
import { ActivityLogService } from '../activity-log';
import { TIER_CREDITS } from '../config';
import type {
  CreateRedemptionCodeDto,
  UpdateRedemptionCodeDto,
  RedemptionCodeQueryDto,
} from './redemption.dto';
import type { SubscriptionTier } from '../types';

@Injectable()
export class RedemptionService {
  private readonly logger = new Logger(RedemptionService.name);
  private readonly VALID_TIERS = Object.keys(TIER_CREDITS).filter(
    (t) => t !== 'free',
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  getConfig() {
    return {
      tiers: this.VALID_TIERS.map((t) => ({
        value: t,
        label: t.charAt(0).toUpperCase() + t.slice(1),
      })),
    };
  }

  private validateTier(tier: string): asserts tier is SubscriptionTier {
    if (!this.VALID_TIERS.includes(tier)) {
      throw new BadRequestException(
        `Invalid membership tier: ${tier}. Valid: ${this.VALID_TIERS.join(', ')}`,
      );
    }
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const part = () =>
      Array.from({ length: 4 }, () => chars[randomInt(chars.length)]).join('');
    return `MF-${part()}-${part()}`;
  }

  async createCode(actorUserId: string, dto: CreateRedemptionCodeDto) {
    if (dto.membershipTier) {
      this.validateTier(dto.membershipTier);
    }

    const code = dto.code || this.generateCode();

    try {
      const created = await this.prisma.redemptionCode.create({
        data: {
          code,
          type: dto.type,
          creditsAmount:
            dto.type === 'CREDITS' ? (dto.creditsAmount ?? null) : null,
          membershipTier:
            dto.type === 'MEMBERSHIP'
              ? ((dto.membershipTier as SubscriptionTier) ?? null)
              : null,
          membershipDays:
            dto.type === 'MEMBERSHIP' ? (dto.membershipDays ?? 30) : null,
          maxRedemptions: dto.maxRedemptions ?? 1,
          expiresAt: dto.expiresAt ?? null,
          note: dto.note ?? null,
          createdBy: actorUserId,
        },
      });

      try {
        await this.activityLogService.logAdminAction({
          operatorId: actorUserId,
          action: 'create_redemption_code',
          details: {
            codeId: created.id,
            code: created.code,
            type: dto.type,
          },
        });
      } catch {
        this.logger.error('Failed to log create_redemption_code activity');
      }

      return created;
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new ConflictException(`Code "${code}" already exists`);
      }
      throw err;
    }
  }

  async listCodes(query: RedemptionCodeQueryDto) {
    const { page, limit, search, type, isActive } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(type && { type }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        code: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.redemptionCode.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { usages: true } } },
      }),
      this.prisma.redemptionCode.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCode(id: string) {
    const code = await this.prisma.redemptionCode.findUnique({
      where: { id },
      include: {
        _count: { select: { usages: true } },
        usages: {
          select: {
            id: true,
            userId: true,
            redeemedAt: true,
            type: true,
            creditsAmount: true,
            membershipTier: true,
            membershipDays: true,
          },
          orderBy: { redeemedAt: 'desc' },
        },
      },
    });

    if (!code) {
      throw new NotFoundException('Redemption code not found');
    }

    return code;
  }

  async updateCode(id: string, dto: UpdateRedemptionCodeDto) {
    try {
      return await this.prisma.redemptionCode.update({
        where: { id },
        data: dto,
      });
    } catch (err) {
      if (isPrismaRecordNotFound(err)) {
        throw new NotFoundException('Redemption code not found');
      }
      throw err;
    }
  }

  async deactivateCode(id: string) {
    try {
      return await this.prisma.redemptionCode.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (err) {
      if (isPrismaRecordNotFound(err)) {
        throw new NotFoundException('Redemption code not found');
      }
      throw err;
    }
  }

  async redeemCode(userId: string, codeStr: string) {
    return this.prisma.$transaction(async (tx) => {
      const code = await tx.redemptionCode.findUnique({
        where: { code: codeStr.trim().toUpperCase() },
      });

      if (!code) {
        throw new BadRequestException('Invalid redemption code');
      }

      if (!code.isActive) {
        throw new BadRequestException(
          'This redemption code is no longer active',
        );
      }

      if (code.expiresAt && code.expiresAt < new Date()) {
        throw new BadRequestException('This redemption code has expired');
      }

      // Atomic increment — prevents TOCTOU race
      const result = await tx.redemptionCode.updateMany({
        where: {
          id: code.id,
          currentRedemptions: { lt: code.maxRedemptions },
          isActive: true,
        },
        data: { currentRedemptions: { increment: 1 } },
      });

      if (result.count === 0) {
        throw new BadRequestException(
          'This redemption code has reached its maximum redemptions',
        );
      }

      // Per-account single use — @@unique([redemptionCodeId, userId])
      try {
        await tx.redemptionCodeUsage.create({
          data: {
            redemptionCodeId: code.id,
            userId,
            type: code.type,
            creditsAmount: code.creditsAmount,
            membershipTier: code.membershipTier,
            membershipDays: code.membershipDays,
          },
        });
      } catch (err) {
        if (isPrismaUniqueViolation(err)) {
          throw new ConflictException('You have already redeemed this code');
        }
        throw err;
      }

      // Apply rewards
      if (code.type === 'CREDITS' && code.creditsAmount) {
        await this.creditService.grantPurchasedCredits(
          userId,
          code.creditsAmount,
          undefined,
          undefined,
          tx,
        );
      } else if (
        code.type === 'MEMBERSHIP' &&
        code.membershipTier &&
        code.membershipDays
      ) {
        const now = new Date();
        const periodEnd = new Date(
          now.getTime() + code.membershipDays * 86400000,
        );

        await tx.subscription.upsert({
          where: { userId },
          create: {
            userId,
            tier: code.membershipTier,
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
          update: {
            tier: code.membershipTier,
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
        });

        const credits = TIER_CREDITS[code.membershipTier] ?? 0;
        if (credits > 0) {
          await this.creditService.grantSubscriptionCredits(
            userId,
            credits,
            now,
            periodEnd,
            tx,
          );
        }
      }

      // Activity log — non-blocking
      try {
        await this.activityLogService.log({
          userId,
          category: 'payment',
          action: 'redeem_code',
          details: {
            codeId: code.id,
            code: code.code,
            type: code.type,
            creditsAmount: code.creditsAmount,
            membershipTier: code.membershipTier,
            membershipDays: code.membershipDays,
          },
        });
      } catch {
        this.logger.error('Failed to log redeem_code activity');
      }

      return {
        type: code.type,
        ...(code.creditsAmount != null && {
          creditsAmount: code.creditsAmount,
        }),
        ...(code.membershipTier != null && {
          membershipTier: code.membershipTier,
        }),
        ...(code.membershipDays != null && {
          membershipDays: code.membershipDays,
        }),
      };
    });
  }
}

function isPrismaError(err: unknown, code: string): boolean {
  return (
    err !== null &&
    typeof err === 'object' &&
    'code' in err &&
    (err as Record<string, unknown>).code === code
  );
}

function isPrismaUniqueViolation(err: unknown): boolean {
  return isPrismaError(err, 'P2002');
}

function isPrismaRecordNotFound(err: unknown): boolean {
  return isPrismaError(err, 'P2025');
}
