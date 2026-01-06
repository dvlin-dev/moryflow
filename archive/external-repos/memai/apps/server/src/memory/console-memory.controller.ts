/**
 * Console Memory Controller
 * Memory 管理接口（控制台使用，Session 认证）
 */

import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCookieAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../auth';
import { SkipResponseWrap } from '../common/decorators';
import type { CurrentUserDto } from '../types';
import { MemoryService } from './memory.service';
import { parsePaginationParams } from '../common/utils';

@ApiTags('Console - Memory')
@ApiCookieAuth()
@Controller({ path: 'console/memories', version: VERSION_NEUTRAL })
export class ConsoleMemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  /**
   * 获取所有 Memories
   * GET /api/console/memories
   */
  @Get()
  @ApiOperation({ summary: 'List all memories' })
  @ApiOkResponse({ description: 'List of memories' })
  @ApiQuery({ name: 'apiKeyId', required: false, description: 'Filter by API Key ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit (default: 20, max: 100)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset (default: 0)' })
  async findAll(
    @CurrentUser() user: CurrentUserDto,
    @Query('apiKeyId') apiKeyId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const pagination = parsePaginationParams(limit, offset);

    const result = await this.memoryService.listByUser(user.id, {
      apiKeyId,
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return {
      items: result.memories,
      pagination: {
        total: result.total,
        limit: pagination.limit,
        offset: pagination.offset,
      },
    };
  }

  /**
   * 导出 Memories
   * GET /api/console/memories/export
   */
  @Get('export')
  @ApiOperation({ summary: 'Export memories' })
  @ApiOkResponse({ description: 'Exported memories file' })
  @ApiQuery({ name: 'apiKeyId', required: false, description: 'Filter by API Key ID' })
  @ApiQuery({ name: 'format', required: false, description: 'Export format: json or csv (default: json)' })
  @SkipResponseWrap()
  async export(
    @CurrentUser() user: CurrentUserDto,
    @Res() res: Response,
    @Query('apiKeyId') apiKeyId?: string,
    @Query('format') format?: string,
  ) {
    if (format && !['json', 'csv'].includes(format)) {
      throw new BadRequestException('Format must be "json" or "csv"');
    }

    const result = await this.memoryService.exportByUser(user.id, {
      apiKeyId,
      format: (format as 'json' | 'csv') || 'json',
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }
}
