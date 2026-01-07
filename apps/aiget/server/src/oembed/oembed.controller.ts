/**
 * oEmbed API Controller
 */
import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { Public } from '../auth';
import { oembedRequestSchema } from './dto/oembed-request.dto';
import { FormatNotSupportedError } from './oembed.errors';
import { OembedService } from './oembed.service';

@ApiTags('Oembed')
@Public()
@Controller({ path: 'oembed', version: '1' })
@UseGuards(ApiKeyGuard)
export class OembedController {
  constructor(private readonly oembedService: OembedService) {}

  /**
   * 获取 oEmbed 数据
   * POST /api/v1/oembed
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async getOembed(@Body() body: unknown) {
    // Zod 验证
    const parsed = oembedRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    // 检查 format 参数（仅支持 JSON，返回 501）
    const { format } = parsed.data;
    if (format && format !== 'json') {
      throw new FormatNotSupportedError(format);
    }

    return this.oembedService.fetch(parsed.data);
  }
}
