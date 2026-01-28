/**
 * [INPUT]: HTTP requests for user profile management, password change, account deletion
 * [OUTPUT]: User profile data, success responses, or validation errors
 * [POS]: User API controller, handles /api/v1/app/user/* endpoints
 *
 * [PROTOCOL]: When this file changes, you MUST update this header and apps/server/CLAUDE.md
 */

import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UserService } from './user.service';
import {
  deleteAccountSchema,
  updateProfileSchema,
  changePasswordSchema,
  type UpdateProfileDto,
  type ChangePasswordDto,
  type DeleteAccountDto,
} from './dto';

@ApiTags('User')
@ApiSecurity('session')
@Controller({ path: 'app/user', version: '1' })
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 获取当前用户完整信息（包括配额）
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile with quota information' })
  @ApiOkResponse({ description: 'Successfully returned user profile' })
  async getMe(@CurrentUser() user: CurrentUserDto) {
    return this.userService.getUserProfile(user.id);
  }

  /**
   * 更新用户资料
   */
  @Patch('me')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiOkResponse({ description: 'User profile updated successfully' })
  async updateProfile(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(user.id, dto);
  }

  /**
   * 修改密码
   */
  @Post('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change user password' })
  @ApiNoContentResponse({ description: 'Password changed successfully' })
  async changePassword(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordDto,
  ): Promise<void> {
    await this.userService.changePassword(user.id, dto);
  }

  /**
   * 删除账户（软删除）
   */
  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user account (soft delete)' })
  @ApiNoContentResponse({ description: 'Account deleted successfully' })
  async deleteAccount(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(deleteAccountSchema)) dto: DeleteAccountDto,
  ): Promise<void> {
    await this.userService.deleteAccount(user.id, dto);
  }
}
