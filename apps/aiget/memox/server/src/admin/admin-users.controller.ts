/**
 * Admin Users Controller
 *
 * [INPUT]: User management requests
 * [OUTPUT]: User data
 * [POS]: Admin API for user management
 */

import {
  Controller,
  Get,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiParam,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { AdminService } from './admin.service';
import { UserQueryDto, UpdateUserDto } from './dto';

@ApiTags('Admin')
@ApiCookieAuth()
@Controller({ path: 'admin/users', version: VERSION_NEUTRAL })
@RequireAdmin()
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get users list
   */
  @Get()
  @ApiOperation({ summary: 'Get users list' })
  @ApiOkResponse({ description: 'List of users' })
  async getUsers(@Query() query: UserQueryDto) {
    return this.adminService.getUsers(query);
  }

  /**
   * Get single user
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiOkResponse({ description: 'User details' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  /**
   * Update user
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiOkResponse({ description: 'User updated' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  /**
   * Delete user (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user' })
  @ApiNoContentResponse({ description: 'User deleted' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async deleteUser(@Param('id') id: string): Promise<void> {
    await this.adminService.deleteUser(id);
  }
}
