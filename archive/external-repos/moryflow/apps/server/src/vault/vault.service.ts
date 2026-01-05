/**
 * [INPUT]: (userId, vaultId?, deviceId?) - 用户与 Vault/设备标识
 * [OUTPUT]: (VaultDto[], VaultDeviceDto[]) - Vault 列表与设备信息
 * [POS]: Vault 管理服务，处理 Vault CRUD 和设备注册，被 SyncService 依赖
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { StorageClient } from '../storage';
import type {
  CreateVaultDto,
  UpdateVaultDto,
  RegisterDeviceDto,
  VaultDto,
  VaultDeviceDto,
} from './dto';

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageClient: StorageClient,
  ) {}

  /**
   * 获取用户的 Vault 列表
   */
  async listVaults(userId: string): Promise<VaultDto[]> {
    const vaults = await this.prisma.vault.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            files: { where: { isDeleted: false } },
            devices: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return vaults.map((vault) => ({
      id: vault.id,
      name: vault.name,
      createdAt: vault.createdAt,
      fileCount: vault._count.files,
      deviceCount: vault._count.devices,
    }));
  }

  /**
   * 获取单个 Vault
   */
  async getVault(userId: string, vaultId: string): Promise<VaultDto> {
    const vault = await this.prisma.vault.findUnique({
      where: { id: vaultId },
      include: {
        _count: {
          select: {
            files: { where: { isDeleted: false } },
            devices: true,
          },
        },
      },
    });

    if (!vault) {
      throw new NotFoundException('Vault not found');
    }

    if (vault.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return {
      id: vault.id,
      name: vault.name,
      createdAt: vault.createdAt,
      fileCount: vault._count.files,
      deviceCount: vault._count.devices,
    };
  }

  /**
   * 创建 Vault
   */
  async createVault(userId: string, dto: CreateVaultDto): Promise<VaultDto> {
    const vault = await this.prisma.vault.create({
      data: {
        userId,
        name: dto.name,
      },
    });

    return {
      id: vault.id,
      name: vault.name,
      createdAt: vault.createdAt,
      fileCount: 0,
      deviceCount: 0,
    };
  }

  /**
   * 更新 Vault
   */
  async updateVault(
    userId: string,
    vaultId: string,
    dto: UpdateVaultDto,
  ): Promise<VaultDto> {
    // 验证所有权
    await this.verifyOwnership(userId, vaultId);

    const vault = await this.prisma.vault.update({
      where: { id: vaultId },
      data: { name: dto.name },
      include: {
        _count: {
          select: {
            files: { where: { isDeleted: false } },
            devices: true,
          },
        },
      },
    });

    return {
      id: vault.id,
      name: vault.name,
      createdAt: vault.createdAt,
      fileCount: vault._count.files,
      deviceCount: vault._count.devices,
    };
  }

  /**
   * 删除 Vault
   * 同时清理 R2 中的所有文件
   */
  async deleteVault(userId: string, vaultId: string): Promise<void> {
    await this.verifyOwnership(userId, vaultId);

    // 获取该 Vault 下所有文件 ID
    const files = await this.prisma.syncFile.findMany({
      where: { vaultId },
      select: { id: true },
    });

    // 清理 R2 存储（软操作，失败不阻塞）
    if (files.length > 0) {
      const fileIds = files.map((f) => f.id);
      const deleted = await this.storageClient.deleteFiles(
        userId,
        vaultId,
        fileIds,
      );
      if (!deleted) {
        this.logger.warn(
          `Failed to delete R2 files for vault ${vaultId}, proceeding with DB deletion`,
        );
      }
    }

    // 删除数据库记录（Prisma 级联删除会清理 syncFile 和 vaultDevice）
    await this.prisma.vault.delete({
      where: { id: vaultId },
    });
  }

  /**
   * 注册设备到 Vault
   */
  async registerDevice(
    userId: string,
    vaultId: string,
    dto: RegisterDeviceDto,
  ): Promise<VaultDeviceDto> {
    await this.verifyOwnership(userId, vaultId);

    const device = await this.prisma.vaultDevice.upsert({
      where: {
        vaultId_deviceId: {
          vaultId,
          deviceId: dto.deviceId,
        },
      },
      create: {
        vaultId,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
      },
      update: {
        deviceName: dto.deviceName,
      },
    });

    return {
      id: device.id,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      lastSyncAt: device.lastSyncAt,
    };
  }

  /**
   * 获取 Vault 的设备列表
   */
  async listDevices(
    userId: string,
    vaultId: string,
  ): Promise<VaultDeviceDto[]> {
    await this.verifyOwnership(userId, vaultId);

    const devices = await this.prisma.vaultDevice.findMany({
      where: { vaultId },
      orderBy: { lastSyncAt: 'desc' },
    });

    return devices.map((device) => ({
      id: device.id,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      lastSyncAt: device.lastSyncAt,
    }));
  }

  /**
   * 移除设备
   */
  async removeDevice(
    userId: string,
    vaultId: string,
    deviceId: string,
  ): Promise<void> {
    await this.verifyOwnership(userId, vaultId);

    await this.prisma.vaultDevice.delete({
      where: {
        vaultId_deviceId: {
          vaultId,
          deviceId,
        },
      },
    });
  }

  /**
   * 更新设备最后同步时间
   */
  async updateDeviceSyncTime(vaultId: string, deviceId: string): Promise<void> {
    await this.prisma.vaultDevice.update({
      where: {
        vaultId_deviceId: {
          vaultId,
          deviceId,
        },
      },
      data: {
        lastSyncAt: new Date(),
      },
    });
  }

  /**
   * 验证用户对 Vault 的所有权
   */
  private async verifyOwnership(
    userId: string,
    vaultId: string,
  ): Promise<void> {
    const vault = await this.prisma.vault.findUnique({
      where: { id: vaultId },
      select: { userId: true },
    });

    if (!vault) {
      throw new NotFoundException('Vault not found');
    }

    if (vault.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
