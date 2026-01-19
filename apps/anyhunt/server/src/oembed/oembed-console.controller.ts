/**
 * Console oEmbed Controller
 * 用户控制台 oEmbed API
 */

import {
  Controller,
  Post,
  Body,
  BadRequestException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { ApiKeyService } from '../api-key/api-key.service';
import { OembedService } from './oembed.service';
import { oembedRequestSchema } from './dto/oembed-request.dto';
import { FormatNotSupportedError } from './oembed.errors';

@ApiTags('OembedConsole')
@Controller({ path: 'console', version: '1' })
export class OembedConsoleController {
  constructor(
    private readonly oembedService: OembedService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  /**
   * Playground oEmbed
   * POST /api/v1/console/oembed
   * 使用会话认证，apiKeyId 用于选择使用哪个 API Key
   */
  @Post('oembed')
  @HttpCode(HttpStatus.OK)
  async fetchOembed(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: unknown,
  ) {
    // 验证 apiKeyId
    const bodyObj = body as Record<string, unknown>;
    const apiKeyId = bodyObj?.apiKeyId;
    if (!apiKeyId || typeof apiKeyId !== 'string') {
      throw new BadRequestException('apiKeyId is required');
    }

    // 解析并验证 oEmbed 请求参数
    const parsed = oembedRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    // 检查 format 参数（仅支持 JSON，返回 501）
    const { format } = parsed.data;
    if (format && format !== 'json') {
      throw new FormatNotSupportedError(format);
    }

    // 验证 API Key 属于当前用户
    const apiKey = await this.apiKeyService.findOne(user.id, apiKeyId);
    if (!apiKey.isActive) {
      throw new ForbiddenException('API Key is inactive');
    }

    return this.oembedService.fetch(parsed.data);
  }
}
