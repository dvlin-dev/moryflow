/**
 * Digest Public Welcome Pages Controller
 *
 * [INPUT]: slug + locale query / Accept-Language
 * [OUTPUT]: locale-resolved welcome page detail
 * [POS]: Public Welcome 页面详情 API（无需认证）
 */

import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../auth';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DigestWelcomePagesService } from '../services';
import { PublicWelcomeQuerySchema, type PublicWelcomeQuery } from '../dto';

@ApiTags('Public - Digest Welcome')
@Controller({ path: 'digest/welcome/pages', version: '1' })
export class DigestPublicWelcomePagesController {
  constructor(
    private readonly welcomePagesService: DigestWelcomePagesService,
  ) {}

  /**
   * 获取 Welcome Page 详情（已按 locale 解析）
   * GET /api/v1/digest/welcome/pages/:slug
   */
  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get welcome page (locale resolved)' })
  @ApiParam({ name: 'slug', type: String })
  @ApiQuery({
    name: 'locale',
    required: false,
    type: String,
    description: 'Preferred locale (BCP-47), overrides Accept-Language',
  })
  @ApiOkResponse({ description: 'Welcome page detail' })
  async getWelcomePage(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(PublicWelcomeQuerySchema))
    query: PublicWelcomeQuery,
  ) {
    return this.welcomePagesService.getPublicPage({
      slug,
      locale: query.locale,
      acceptLanguage: req.headers['accept-language'],
    });
  }
}
