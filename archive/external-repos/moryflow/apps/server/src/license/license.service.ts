/**
 * License Service
 * 处理 License 的验证、激活、停用、撤销等业务逻辑
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  Prisma,
  LicenseStatus,
  LicenseActivation,
} from '../../generated/prisma/client';
import type {
  ActivateLicenseDto,
  LicenseValidationResultDto,
  LicenseDetailDto,
  LicenseActivationDto,
} from './dto/license.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getPrismaClient(
    tx?: Prisma.TransactionClient,
  ): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }

  /**
   * 验证 License Key
   */
  async validateLicense(
    licenseKey: string,
    instanceName?: string,
  ): Promise<LicenseValidationResultDto> {
    const license = await this.prisma.license.findUnique({
      where: { licenseKey },
    });

    if (!license) {
      return { valid: false, status: 'not_found' };
    }

    if (license.status === 'revoked') {
      return { valid: false, status: 'revoked' };
    }

    // 如果提供了 instanceName，检查是否已激活
    if (instanceName) {
      const activation = await this.prisma.licenseActivation.findFirst({
        where: {
          licenseId: license.id,
          instanceName,
          status: 'active',
        },
      });

      if (activation) {
        return {
          valid: true,
          status: 'active',
          license: {
            id: license.id,
            tier: license.tier,
            activationCount: license.activationCount,
            activationLimit: license.activationLimit,
          },
          instanceId: activation.instanceId,
        };
      }
    }

    return {
      valid: true,
      status: 'active',
      license: {
        id: license.id,
        tier: license.tier,
        activationCount: license.activationCount,
        activationLimit: license.activationLimit,
      },
    };
  }

  /**
   * 激活 License
   */
  async activateLicense(
    dto: ActivateLicenseDto,
  ): Promise<LicenseValidationResultDto> {
    const { licenseKey, instanceName } = dto;

    this.logger.log(
      `Activating license: ${licenseKey.slice(0, 8)}... for ${instanceName}`,
    );

    // 先验证 License
    const validation = await this.validateLicense(licenseKey, instanceName);
    if (!validation.valid) {
      return validation;
    }

    // 如果已经激活了这个 instance，直接返回
    if (validation.instanceId) {
      this.logger.log(
        `License already activated for instance: ${instanceName}`,
      );
      return validation;
    }

    const license = await this.prisma.license.findUnique({
      where: { licenseKey },
    });

    if (!license) {
      return { valid: false, status: 'not_found' };
    }

    // 检查激活数量限制
    if (license.activationCount >= license.activationLimit) {
      this.logger.warn(
        `License activation limit exceeded: ${license.id} (${license.activationCount}/${license.activationLimit})`,
      );
      return { valid: false, status: 'limit_exceeded' };
    }

    // 生成实例 ID
    const instanceId = randomUUID();

    // 使用事务创建激活记录并更新计数
    await this.prisma.$transaction([
      this.prisma.licenseActivation.create({
        data: {
          licenseId: license.id,
          instanceName,
          instanceId,
          status: 'active',
        },
      }),
      this.prisma.license.update({
        where: { id: license.id },
        data: { activationCount: license.activationCount + 1 },
      }),
    ]);

    this.logger.log(
      `License activated: ${license.id}, instanceId: ${instanceId}`,
    );

    return {
      valid: true,
      status: 'active',
      license: {
        id: license.id,
        tier: license.tier,
        activationCount: license.activationCount + 1,
        activationLimit: license.activationLimit,
      },
      instanceId,
    };
  }

  /**
   * 停用 License 激活
   */
  async deactivateLicense(
    licenseKey: string,
    instanceId: string,
  ): Promise<boolean> {
    this.logger.log(
      `Deactivating license: ${licenseKey.slice(0, 8)}..., instanceId: ${instanceId}`,
    );

    const license = await this.prisma.license.findUnique({
      where: { licenseKey },
    });

    if (!license) {
      return false;
    }

    const activation = await this.prisma.licenseActivation.findFirst({
      where: {
        licenseId: license.id,
        instanceId,
        status: 'active',
      },
    });

    if (!activation) {
      return false;
    }

    // 使用事务停用激活记录并更新计数
    await this.prisma.$transaction([
      this.prisma.licenseActivation.update({
        where: { id: activation.id },
        data: {
          status: 'deactivated',
          deactivatedAt: new Date(),
        },
      }),
      this.prisma.license.update({
        where: { id: license.id },
        data: { activationCount: Math.max(0, license.activationCount - 1) },
      }),
    ]);

    this.logger.log(
      `License deactivated: ${license.id}, instanceId: ${instanceId}`,
    );
    return true;
  }

  /**
   * 撤销 License（管理员操作）
   */
  async revokeLicense(licenseId: string): Promise<boolean> {
    this.logger.log(`Revoking license: ${licenseId}`);

    const license = await this.prisma.license.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      return false;
    }

    // 停用所有激活并更新 License 状态
    await this.prisma.$transaction([
      this.prisma.licenseActivation.updateMany({
        where: {
          licenseId,
          status: 'active',
        },
        data: {
          status: 'deactivated',
          deactivatedAt: new Date(),
        },
      }),
      this.prisma.license.update({
        where: { id: licenseId },
        data: { status: 'revoked' },
      }),
    ]);

    this.logger.log(`License revoked: ${licenseId}`);
    return true;
  }

  /**
   * 获取用户的所有 License
   */
  async getUserLicenses(userId: string): Promise<LicenseDetailDto[]> {
    const licenses = await this.prisma.license.findMany({
      where: { userId },
      include: { activations: true },
      orderBy: { createdAt: 'desc' },
    });

    return licenses.map((license) => ({
      id: license.id,
      userId: license.userId,
      licenseKey: license.licenseKey,
      orderId: license.orderId,
      tier: license.tier,
      status: license.status,
      activationCount: license.activationCount,
      activationLimit: license.activationLimit,
      createdAt: license.createdAt,
      activations: license.activations.map(
        (a): LicenseActivationDto => ({
          id: a.id,
          instanceName: a.instanceName,
          instanceId: a.instanceId,
          status: a.status,
          activatedAt: a.activatedAt,
          deactivatedAt: a.deactivatedAt,
        }),
      ),
    }));
  }

  /**
   * 获取 License 详情
   */
  async getLicenseById(licenseId: string): Promise<LicenseDetailDto | null> {
    const license = await this.prisma.license.findUnique({
      where: { id: licenseId },
      include: { activations: true },
    });

    if (!license) {
      return null;
    }

    return {
      id: license.id,
      userId: license.userId,
      licenseKey: license.licenseKey,
      orderId: license.orderId,
      tier: license.tier,
      status: license.status,
      activationCount: license.activationCount,
      activationLimit: license.activationLimit,
      createdAt: license.createdAt,
      activations: license.activations.map(
        (a): LicenseActivationDto => ({
          id: a.id,
          instanceName: a.instanceName,
          instanceId: a.instanceId,
          status: a.status,
          activatedAt: a.activatedAt,
          deactivatedAt: a.deactivatedAt,
        }),
      ),
    };
  }

  /**
   * 获取 License 列表（管理员）
   */
  async listLicenses(options: {
    status?: LicenseStatus;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    licenses: LicenseDetailDto[];
    pagination: { limit: number; offset: number; count: number };
  }> {
    const { status, userId, limit = 50, offset = 0 } = options;

    const where: Prisma.LicenseWhereInput = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [licenses, total] = await this.prisma.$transaction([
      this.prisma.license.findMany({
        where,
        include: { activations: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.license.count({ where }),
    ]);

    return {
      licenses: licenses.map((license) => ({
        id: license.id,
        userId: license.userId,
        licenseKey: license.licenseKey,
        orderId: license.orderId,
        tier: license.tier,
        status: license.status,
        activationCount: license.activationCount,
        activationLimit: license.activationLimit,
        createdAt: license.createdAt,
        activations: license.activations.map(
          (a: LicenseActivation): LicenseActivationDto => ({
            id: a.id,
            instanceName: a.instanceName,
            instanceId: a.instanceId,
            status: a.status,
            activatedAt: a.activatedAt,
            deactivatedAt: a.deactivatedAt,
          }),
        ),
      })),
      pagination: {
        limit,
        offset,
        count: total,
      },
    };
  }

  /**
   * 创建 License（用于支付回调）
   */
  async createLicense(params: {
    userId: string;
    licenseKey: string;
    orderId: string;
    tier: 'standard' | 'pro';
    activationLimit: number;
    tx?: Prisma.TransactionClient;
  }): Promise<LicenseDetailDto> {
    const { userId, licenseKey, orderId, tier, activationLimit, tx } = params;
    const client = this.getPrismaClient(tx);

    // 检查是否已存在相同的 licenseKey（幂等性）
    const existing = await client.license.findUnique({
      where: { licenseKey },
      include: { activations: true },
    });

    if (existing) {
      this.logger.log(`License already exists: ${licenseKey.slice(0, 8)}...`);
      return {
        id: existing.id,
        userId: existing.userId,
        licenseKey: existing.licenseKey,
        orderId: existing.orderId,
        tier: existing.tier,
        status: existing.status,
        activationCount: existing.activationCount,
        activationLimit: existing.activationLimit,
        createdAt: existing.createdAt,
        activations: existing.activations.map(
          (a): LicenseActivationDto => ({
            id: a.id,
            instanceName: a.instanceName,
            instanceId: a.instanceId,
            status: a.status,
            activatedAt: a.activatedAt,
            deactivatedAt: a.deactivatedAt,
          }),
        ),
      };
    }

    const license = await client.license.create({
      data: {
        userId,
        licenseKey,
        orderId,
        tier,
        status: 'active',
        activationCount: 0,
        activationLimit,
      },
      include: { activations: true },
    });

    this.logger.log(`License created: ${license.id}, tier: ${tier}`);

    return {
      id: license.id,
      userId: license.userId,
      licenseKey: license.licenseKey,
      orderId: license.orderId,
      tier: license.tier,
      status: license.status,
      activationCount: license.activationCount,
      activationLimit: license.activationLimit,
      createdAt: license.createdAt,
      activations: [],
    };
  }
}
