/**
 * Digest Public Welcome Controller
 *
 * [INPUT]: locale query / Accept-Language
 * [OUTPUT]: locale-resolved welcome config
 * [POS]: Public Welcome API（无需认证）
 */

import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../auth';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DigestWelcomeService } from '../services/welcome.service';
import { PublicWelcomeQuerySchema, type PublicWelcomeQuery } from '../dto';

@ApiTags('Public - Digest Welcome')
@Controller({ path: 'digest/welcome', version: '1' })
export class DigestPublicWelcomeController {
  constructor(private readonly welcomeService: DigestWelcomeService) {}

  /**
   * 获取 Welcome 配置（已按 locale 解析）
   * GET /api/v1/digest/welcome
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get welcome config (locale resolved)' })
  @ApiQuery({
    name: 'locale',
    required: false,
    type: String,
    description: 'Preferred locale (BCP-47), overrides Accept-Language',
  })
  @ApiOkResponse({ description: 'Welcome config' })
  async getWelcome(
    @Req() req: Request,
    @Query(new ZodValidationPipe(PublicWelcomeQuerySchema))
    query: PublicWelcomeQuery,
  ) {
    return this.welcomeService.getPublicWelcome({
      locale: query.locale,
      acceptLanguage: req.headers['accept-language'],
    });
  }
}
