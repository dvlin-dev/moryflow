/**
 * User Controller
 * 用户相关 API
 */

import {
  Controller,
  Get,
  Delete,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../auth';
import { CreditService, type CreditsBalance } from '../credit';
import type { CurrentUserDto } from '../types';
import { UserService } from './user.service';
import { deleteAccountSchema, type DeleteAccountDto } from './dto';

@Controller({ path: 'user', version: '1' })
export class UserController {
  constructor(
    private readonly creditService: CreditService,
    private readonly userService: UserService,
  ) {}

  /**
   * 获取积分余额（轻量级端点，用于频繁刷新）
   */
  @Get('credits')
  async getCredits(
    @CurrentUser() user: CurrentUserDto,
  ): Promise<CreditsBalance> {
    return this.creditService.getCreditsBalance(user.id);
  }

  /**
   * 获取当前用户完整信息（包括 credits）
   * 用于登录后初始化或完整信息刷新
   */
  @Get('me')
  async getMe(@CurrentUser() user: CurrentUserDto) {
    const credits = await this.creditService.getCreditsBalance(user.id);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      subscriptionTier: user.subscriptionTier,
      isAdmin: user.isAdmin,
      credits,
    };
  }

  /**
   * 删除账户（软删除）
   */
  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<void> {
    // 验证请求体
    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    const dto: DeleteAccountDto = parsed.data;
    const ip = req.ip || req.headers['x-forwarded-for']?.toString();

    await this.userService.deleteAccount(user.id, dto, ip);
  }
}
