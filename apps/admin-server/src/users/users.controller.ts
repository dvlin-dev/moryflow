/**
 * [INPUT]: HTTP 请求
 * [OUTPUT]: 用户管理响应
 * [POS]: 用户管理 API 控制器（/api/admin/users/*）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SessionGuard, CurrentUser, type RequestUser } from '@aiget/auth-server';
import { AdminGuard } from '../common/guards/admin.guard';
import { UsersService } from './users.service';
import {
  ListUsersQuerySchema,
  SetTierInputSchema,
  GrantCreditsInputSchema,
  type SetTierInput,
  type GrantCreditsInput,
} from './dto';

@Controller('admin/users')
@UseGuards(SessionGuard, AdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 获取用户列表
   * GET /api/admin/users
   */
  @Get()
  async listUsers(@Query() query: Record<string, unknown>) {
    const parsed = ListUsersQuerySchema.parse(query);
    return this.usersService.listUsers(parsed);
  }

  /**
   * 获取用户详情
   * GET /api/admin/users/:id
   */
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  /**
   * 设置用户等级
   * POST /api/admin/users/:id/tier
   */
  @Post(':id/tier')
  @HttpCode(HttpStatus.OK)
  async setTier(
    @Param('id') id: string,
    @Body() body: SetTierInput,
    @CurrentUser() admin: RequestUser
  ) {
    const parsed = SetTierInputSchema.parse(body);
    return this.usersService.setTier(id, parsed, admin);
  }

  /**
   * 发放积分
   * POST /api/admin/users/:id/credits
   */
  @Post(':id/credits')
  @HttpCode(HttpStatus.OK)
  async grantCredits(
    @Param('id') id: string,
    @Body() body: GrantCreditsInput,
    @CurrentUser() admin: RequestUser
  ) {
    const parsed = GrantCreditsInputSchema.parse(body);
    return this.usersService.grantCredits(id, parsed, admin);
  }

  /**
   * 软删除用户
   * DELETE /api/admin/users/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string, @CurrentUser() admin: RequestUser) {
    await this.usersService.deleteUser(id, admin);
  }

  /**
   * 恢复用户
   * POST /api/admin/users/:id/restore
   */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restoreUser(@Param('id') id: string, @CurrentUser() admin: RequestUser) {
    return this.usersService.restoreUser(id, admin);
  }
}
