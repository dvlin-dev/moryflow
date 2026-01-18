/**
 * [INPUT]: userId, grantCredits body, list query
 * [OUTPUT]: credits grant result + recent grants list
 * [POS]: Admin 用户 Credits 管理 API（仅增不减），用于内部员工测试
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { RequireAdmin, CurrentUser } from '../auth';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  creditsGrantsQuerySchema,
  grantCreditsSchema,
  type CreditsGrantsQuery,
  type GrantCreditsDto,
} from './dto';
import { AdminUserCreditsService } from './admin-user-credits.service';
import type { CurrentUserDto } from '../types/user.types';

@ApiTags('Admin - Users - Credits')
@ApiSecurity('session')
@Controller({ path: 'admin/users/:userId/credits', version: '1' })
@RequireAdmin()
export class AdminUserCreditsController {
  constructor(private readonly creditsService: AdminUserCreditsService) {}

  @Post('grant')
  @ApiOperation({ summary: 'Grant credits to a user (internal testing)' })
  @ApiOkResponse({ description: 'Credits granted' })
  async grantCredits(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: CurrentUserDto,
    @Body(new ZodValidationPipe(grantCreditsSchema)) dto: GrantCreditsDto,
  ) {
    return this.creditsService.grantCredits({
      actorUserId: currentUser.id,
      targetUserId: userId,
      amount: dto.amount,
      reason: dto.reason,
    });
  }

  @Get('grants')
  @ApiOperation({ summary: 'List recent credit grants for a user' })
  @ApiOkResponse({ description: 'Recent grants' })
  async listGrants(
    @Param('userId') userId: string,
    @Query(new ZodValidationPipe(creditsGrantsQuerySchema))
    query: CreditsGrantsQuery,
  ) {
    return this.creditsService.listCreditGrants({
      userId,
      limit: query.limit,
    });
  }
}
