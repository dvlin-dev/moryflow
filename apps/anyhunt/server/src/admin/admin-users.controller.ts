/**
 * Admin Users Controller
 * 用户管理 API
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiParam,
} from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminService } from './admin.service';
import {
  userQuerySchema,
  updateUserSchema,
  type UserQuery,
  type UpdateUserDto,
} from './dto';

@ApiTags('Admin - Users')
@ApiSecurity('session')
@Controller({ path: 'admin/users', version: '1' })
@RequireAdmin()
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get user list' })
  @ApiOkResponse({ description: 'User list with pagination' })
  async getUsers(
    @Query(new ZodValidationPipe(userQuerySchema)) query: UserQuery,
  ) {
    return this.adminService.getUsers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOkResponse({ description: 'User details' })
  async getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOkResponse({ description: 'Updated user' })
  async updateUser(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiNoContentResponse({ description: 'User deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string): Promise<void> {
    await this.adminService.deleteUser(id);
  }
}
