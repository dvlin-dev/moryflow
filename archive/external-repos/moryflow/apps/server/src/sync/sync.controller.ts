/**
 * Sync Controller
 * 同步 API
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthGuard, CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { SyncService } from './sync.service';
import {
  SyncDiffRequestDto,
  SyncCommitRequestDto,
  type SyncDiffResponseDto,
  type SyncCommitResponseDto,
  type FileListResponseDto,
} from './dto';

@ApiTags('Sync')
@ApiBearerAuth('bearer')
@ApiCookieAuth('better-auth.session_token')
@UseGuards(AuthGuard)
@Controller('api/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * 计算同步差异
   * POST /api/sync/diff
   */
  @Post('diff')
  @ApiOperation({ summary: '计算同步差异' })
  @ApiOkResponse({ description: '同步差异结果' })
  async calculateDiff(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: SyncDiffRequestDto,
  ): Promise<SyncDiffResponseDto> {
    return this.syncService.calculateDiff(user.id, user.tier, body);
  }

  /**
   * 提交同步结果
   * POST /api/sync/commit
   */
  @Post('commit')
  @ApiOperation({ summary: '提交同步结果' })
  @ApiOkResponse({ description: '同步提交结果' })
  async commitSync(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: SyncCommitRequestDto,
  ): Promise<SyncCommitResponseDto> {
    return this.syncService.commitSync(user.id, body);
  }

  /**
   * 获取 Vault 文件列表（支持分页）
   * GET /api/sync/files/:vaultId?limit=100&offset=0
   */
  @Get('files/:vaultId')
  @ApiOperation({ summary: '获取 Vault 文件列表' })
  @ApiOkResponse({ description: '文件列表' })
  @ApiParam({ name: 'vaultId', description: 'Vault ID' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量（默认 100）' })
  @ApiQuery({ name: 'offset', required: false, description: '偏移量（默认 0）' })
  async listFiles(
    @CurrentUser() user: CurrentUserDto,
    @Param('vaultId') vaultId: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<FileListResponseDto> {
    return this.syncService.listFiles(user.id, vaultId, { limit, offset });
  }
}
