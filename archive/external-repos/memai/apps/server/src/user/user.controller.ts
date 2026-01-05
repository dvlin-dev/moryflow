/**
 * User Controller
 *
 * [INPUT]: User profile and account management requests
 * [OUTPUT]: User profile data or success status
 * [POS]: Console API for user management
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
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { UserService } from './user.service';
import {
  UpdateProfileDto,
  ChangePasswordDto,
  DeleteAccountDto,
} from './dto';

@ApiTags('User')
@ApiCookieAuth()
@Controller({ path: 'user', version: VERSION_NEUTRAL })
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get current user profile with quota info
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ description: 'User profile details' })
  async getMe(@CurrentUser() user: CurrentUserDto) {
    return this.userService.getUserProfile(user.id);
  }

  /**
   * Update user profile
   */
  @Patch('me')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiOkResponse({ description: 'Profile updated' })
  async updateProfile(
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(user.id, dto);
  }

  /**
   * Change password
   */
  @Post('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change password' })
  @ApiNoContentResponse({ description: 'Password changed' })
  async changePassword(
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.userService.changePassword(user.id, dto);
  }

  /**
   * Delete account (soft delete)
   */
  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user account' })
  @ApiNoContentResponse({ description: 'Account deleted' })
  async deleteAccount(
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: DeleteAccountDto,
  ): Promise<void> {
    await this.userService.deleteAccount(user.id, dto);
  }
}
