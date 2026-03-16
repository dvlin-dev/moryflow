import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma';
import {
  Prisma,
  QuotaTransactionType,
  QuotaSource,
} from '../../generated/prisma-main/client';
import { TIER_MONTHLY_QUOTA, addOneMonth } from '../payment/payment.constants';
import { activateSubscriptionWithQuota } from '../payment/subscription-activation';
import type {
  CreateRedemptionCodeDto,
  UpdateRedemptionCodeDto,
  RedemptionCodeQuery,
} from './redemption.dto';
import type { RedeemResult } from './redemption.types';

@Injectable()
export class RedemptionService {
  constructor(private readonly prisma: PrismaService) {}

  async createCode(actorUserId: string, dto: CreateRedemptionCodeDto) {
    let code = dto.code;

    if (!code) {
      code = await this.generateUniqueCode();
    }

    return this.prisma.redemptionCode.create({
      data: {
        code,
        type: dto.type,
        creditsAmount: dto.creditsAmount,
        membershipTier: dto.membershipTier,
        membershipDays: dto.membershipDays,
        maxRedemptions: dto.maxRedemptions,
        expiresAt: dto.expiresAt,
        note: dto.note,
        createdBy: actorUserId,
      },
    });
  }

  async listCodes(query: RedemptionCodeQuery) {
    const { page, limit, search, type, isActive } = query;

    const where: Prisma.RedemptionCodeWhereInput = {};

    if (type) {
      where.type = type;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (search) {
      where.code = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.redemptionCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { usages: true } },
        },
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
          orderBy: { redeemedAt: 'desc' as const },
        },
      },
    });

    if (!code) {
      throw new NotFoundException('Redemption code not found');
    }

    return code;
  }

  async updateCode(id: string, dto: UpdateRedemptionCodeDto) {
    const existing = await this.prisma.redemptionCode.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Redemption code not found');
    }

    return this.prisma.redemptionCode.update({
      where: { id },
      data: {
        ...(dto.maxRedemptions !== undefined && {
          maxRedemptions: dto.maxRedemptions,
        }),
        ...(dto.expiresAt !== undefined && { expiresAt: dto.expiresAt }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.note !== undefined && { note: dto.note }),
      },
    });
  }

  async deactivateCode(id: string) {
    const existing = await this.prisma.redemptionCode.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Redemption code not found');
    }

    return this.prisma.redemptionCode.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async redeemCode(userId: string, code: string): Promise<RedeemResult> {
    return this.prisma.$transaction(async (tx) => {
      const normalizedCode = code.trim().toUpperCase();
      const now = new Date();

      // Step 1: Find and validate the code
      const found = await tx.redemptionCode.findUnique({
        where: { code: normalizedCode },
      });

      if (!found) {
        throw new NotFoundException('Redemption code not found');
      }
      if (!found.isActive) {
        throw new BadRequestException('Redemption code is no longer active');
      }
      if (found.expiresAt !== null && found.expiresAt <= now) {
        throw new BadRequestException('Redemption code has expired');
      }

      // Step 2: Atomic increment with optimistic concurrency check
      const result = await tx.redemptionCode.updateMany({
        where: {
          id: found.id,
          currentRedemptions: { lt: found.maxRedemptions },
          isActive: true,
        },
        data: { currentRedemptions: { increment: 1 } },
      });

      if (result.count === 0) {
        throw new BadRequestException('Code has reached maximum redemptions');
      }

      // Step 3: Create usage record (unique constraint catches duplicates)
      try {
        await tx.redemptionCodeUsage.create({
          data: {
            redemptionCodeId: found.id,
            userId,
            type: found.type,
            creditsAmount: found.creditsAmount,
            membershipTier: found.membershipTier,
            membershipDays: found.membershipDays,
          },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw new ConflictException('You have already redeemed this code');
        }
        throw err;
      }

      // Step 4/5: Apply benefits based on type
      if (found.type === 'CREDITS') {
        const amount = found.creditsAmount!;

        // Upsert Quota
        const existing = await tx.quota.findUnique({
          where: { userId },
          select: { purchasedQuota: true },
        });

        if (!existing) {
          await tx.quota.create({
            data: {
              userId,
              monthlyLimit: TIER_MONTHLY_QUOTA.FREE,
              monthlyUsed: 0,
              periodStartAt: now,
              periodEndAt: addOneMonth(now),
              purchasedQuota: amount,
            },
          });
        } else {
          await tx.quota.update({
            where: { userId },
            data: { purchasedQuota: { increment: amount } },
          });
        }

        // Create QuotaTransaction
        const updatedQuota = await tx.quota.findUniqueOrThrow({
          where: { userId },
          select: { purchasedQuota: true },
        });
        await tx.quotaTransaction.create({
          data: {
            userId,
            type: QuotaTransactionType.ADMIN_GRANT,
            amount,
            source: QuotaSource.PURCHASED,
            balanceBefore: updatedQuota.purchasedQuota - amount,
            balanceAfter: updatedQuota.purchasedQuota,
            reason: `Redemption code: ${normalizedCode}`,
          },
        });
      } else {
        // MEMBERSHIP
        await activateSubscriptionWithQuota(tx, {
          userId,
          tier: found.membershipTier!,
          periodStart: now,
          periodEnd: new Date(now.getTime() + found.membershipDays! * 86400000),
        });
      }

      // Step 6: Create audit log
      await tx.adminAuditLog.create({
        data: {
          actorUserId: userId, // self-service redemption
          targetUserId: userId,
          action: 'CODE_REDEEM',
          reason: `Redeemed code: ${normalizedCode}`,
          metadata: {
            code: normalizedCode,
            type: found.type,
            creditsAmount: found.creditsAmount,
            membershipTier: found.membershipTier,
            membershipDays: found.membershipDays,
          },
        },
      });

      return {
        type: found.type as RedeemResult['type'],
        ...(found.type === 'CREDITS' && {
          creditsAmount: found.creditsAmount!,
        }),
        ...(found.type === 'MEMBERSHIP' && {
          membershipTier: found.membershipTier!,
          membershipDays: found.membershipDays!,
        }),
      };
    });
  }

  private async generateUniqueCode(): Promise<string> {
    for (;;) {
      const code =
        'MF-' +
        randomBytes(4).toString('hex').toUpperCase().slice(0, 4) +
        '-' +
        randomBytes(4).toString('hex').toUpperCase().slice(0, 4);

      const existing = await this.prisma.redemptionCode.findUnique({
        where: { code },
        select: { id: true },
      });

      if (!existing) {
        return code;
      }
    }
  }
}
