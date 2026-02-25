/**
 * 图片生成 Controller
 * OpenAI 兼容的图片生成 API 端点
 */

import { Controller, Post, Body, UseFilters } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AiImageService } from './ai-image.service';
import {
  ImageGenerationRequestSchema,
  type ImageGenerationRequest,
  type ImageGenerationResponse,
} from './dto';
import { CurrentUser } from '../auth/decorators';
import type { CurrentUserDto } from '../types/user.types';
import { AiImageExceptionFilter } from './ai-image.filter';
import { InvalidRequestException } from './exceptions';

@ApiTags('AI Image')
@ApiBearerAuth('bearer')
@Controller({ path: 'images', version: '1' })
@UseFilters(AiImageExceptionFilter)
export class AiImageController {
  constructor(private readonly aiImageService: AiImageService) {}

  /**
   * POST /v1/images/generations
   * 生成图片
   */
  @ApiOperation({
    summary: '生成图片',
    description: '通过文本描述生成图片 (OpenAI 兼容格式)',
  })
  @ApiResponse({ status: 200, description: '图片生成成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '模型权限不足' })
  @ApiResponse({ status: 402, description: '积分不足' })
  @Post('generations')
  async generateImages(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: ImageGenerationRequest,
  ): Promise<ImageGenerationResponse> {
    // 验证请求
    const parsed = ImageGenerationRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new InvalidRequestException(
        parsed.error.issues[0]?.message || 'Invalid request',
      );
    }

    return this.aiImageService.generateImage(
      user.id,
      user.subscriptionTier,
      parsed.data,
    );
  }
}
