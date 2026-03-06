/**
 * Vault Controller
 * Vault 管理 API
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { VaultService } from './vault.service';
import {
  CreateVaultSchema,
  UpdateVaultSchema,
  RegisterDeviceSchema,
  type CreateVaultDto,
  type UpdateVaultDto,
  type RegisterDeviceDto,
  type VaultDto,
  type VaultDeviceDto,
  type VaultListDto,
} from './dto';

@Controller({ path: 'vaults', version: '1' })
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  /**
   * 获取 Vault 列表
   * GET /api/v1/vaults
   */
  @Get()
  async listVaults(@CurrentUser() user: CurrentUserDto): Promise<VaultListDto> {
    const vaults = await this.vaultService.listVaults(user.id);
    return { vaults };
  }

  /**
   * 获取单个 Vault
   * GET /api/v1/vaults/:id
   */
  @Get(':id')
  async getVault(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') vaultId: string,
  ): Promise<VaultDto> {
    return this.vaultService.getVault(user.id, vaultId);
  }

  /**
   * 创建 Vault
   * POST /api/v1/vaults
   */
  @Post()
  async createVault(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: CreateVaultDto,
  ): Promise<VaultDto> {
    const parsed = CreateVaultSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.vaultService.createVault(user.id, parsed.data);
  }

  /**
   * 更新 Vault
   * PUT /api/v1/vaults/:id
   */
  @Put(':id')
  async updateVault(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') vaultId: string,
    @Body() body: UpdateVaultDto,
  ): Promise<VaultDto> {
    const parsed = UpdateVaultSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.vaultService.updateVault(user.id, vaultId, parsed.data);
  }

  /**
   * 删除 Vault
   * DELETE /api/v1/vaults/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVault(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') vaultId: string,
  ): Promise<void> {
    await this.vaultService.deleteVault(user.id, vaultId);
  }

  /**
   * 获取 Vault 设备列表
   * GET /api/v1/vaults/:id/devices
   */
  @Get(':id/devices')
  async listDevices(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') vaultId: string,
  ): Promise<VaultDeviceDto[]> {
    return this.vaultService.listDevices(user.id, vaultId);
  }

  /**
   * 注册设备到 Vault
   * POST /api/v1/vaults/:id/devices
   */
  @Post(':id/devices')
  async registerDevice(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') vaultId: string,
    @Body() body: RegisterDeviceDto,
  ): Promise<VaultDeviceDto> {
    const parsed = RegisterDeviceSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.vaultService.registerDevice(user.id, vaultId, parsed.data);
  }

  /**
   * 移除设备
   * DELETE /api/v1/vaults/:id/devices/:deviceId
   */
  @Delete(':id/devices/:deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDevice(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') vaultId: string,
    @Param('deviceId') deviceId: string,
  ): Promise<void> {
    await this.vaultService.removeDevice(user.id, vaultId, deviceId);
  }
}
