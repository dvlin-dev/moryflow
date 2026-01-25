/**
 * Digest Console Inbox Controller
 *
 * [INPUT]: 收件箱查询/操作请求
 * [OUTPUT]: Inbox 条目列表、统计、操作结果
 * [POS]: Console 收件箱管理 API（Session 认证）
 */

import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { CurrentUserDto } from '../../types';
import { DigestInboxService } from '../services/inbox.service';
import { DigestContentService } from '../services/content.service';
import {
  InboxQuerySchema,
  UpdateInboxItemSchema,
  type InboxQuery,
  type UpdateInboxItemInput,
} from '../dto';

@ApiTags('Console - Digest Inbox')
@ApiCookieAuth()
@Controller({ path: 'console/digest/inbox', version: '1' })
export class DigestConsoleInboxController {
  constructor(
    private readonly inboxService: DigestInboxService,
    private readonly contentService: DigestContentService,
  ) {}

  /**
   * 获取收件箱条目列表
   * GET /api/console/digest/inbox
   */
  @Get()
  @ApiOperation({ summary: 'List inbox items' })
  @ApiOkResponse({ description: 'Inbox items with pagination' })
  async findAll(
    @CurrentUser() user: CurrentUserDto,
    @Query(new ZodValidationPipe(InboxQuerySchema)) query: InboxQuery,
  ) {
    const { items, total, page, limit, totalPages } =
      await this.inboxService.findMany(user.id, query);

    return {
      items: items.map((item) => this.inboxService.toResponse(item)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 获取收件箱统计
   * GET /api/console/digest/inbox/stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get inbox statistics' })
  @ApiOkResponse({ description: 'Inbox stats (unread, saved, total)' })
  async getStats(@CurrentUser() user: CurrentUserDto) {
    return this.inboxService.getStats(user.id);
  }

  /**
   * 更新条目状态（已读/收藏/不感兴趣）
   * PATCH /api/console/digest/inbox/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update inbox item state' })
  @ApiParam({ name: 'id', description: 'Inbox item ID' })
  @ApiOkResponse({ description: 'Item state updated' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateState(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateInboxItemSchema))
    input: UpdateInboxItemInput,
  ): Promise<void> {
    await this.inboxService.updateItemState(user.id, id, input);
    return;
  }

  /**
   * 批量标记已读
   * POST /api/console/digest/inbox/mark-all-read
   */
  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all inbox items as read' })
  @ApiOkResponse({ description: 'Items marked as read' })
  async markAllRead(
    @CurrentUser() user: CurrentUserDto,
    @Query('subscriptionId') subscriptionId?: string,
  ) {
    const count = await this.inboxService.markAllRead(user.id, subscriptionId);
    return { markedCount: count };
  }

  /**
   * 获取条目全文内容
   * GET /api/console/digest/inbox/:id/content
   */
  @Get(':id/content')
  @ApiOperation({ summary: 'Get inbox item full content' })
  @ApiParam({ name: 'id', description: 'Inbox item ID' })
  @ApiOkResponse({ description: 'Full content markdown (if cached)' })
  async getContent(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ) {
    const info = await this.inboxService.getItemContentInfo(user.id, id);
    const markdown = await this.contentService.getFulltext(info.contentId);
    return {
      markdown,
      titleSnapshot: info.titleSnapshot,
      urlSnapshot: info.urlSnapshot,
    };
  }
}
