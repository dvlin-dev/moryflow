/**
 * Digest Public Welcome Controller
 *
 * [INPUT]: locale query / Accept-Language
 * [OUTPUT]: welcome overview (config + pages list, locale resolved)
 * [POS]: Public Welcome API（无需认证，/public/welcome 的列表数据源）
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
import {
  DigestWelcomeConfigService,
  DigestWelcomePagesService,
} from '../services';
import { PublicWelcomeQuerySchema, type PublicWelcomeQuery } from '../dto';

@ApiTags('Public - Digest Welcome')
@Controller({ path: 'public/digest/welcome', version: '1' })
export class DigestPublicWelcomeController {
  constructor(
    private readonly welcomeConfigService: DigestWelcomeConfigService,
    private readonly welcomePagesService: DigestWelcomePagesService,
  ) {}

  /**
   * 获取 Welcome overview（config + pages list，已按 locale 解析）
   * GET /api/v1/public/digest/welcome
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get welcome overview (locale resolved)' })
  @ApiQuery({
    name: 'locale',
    required: false,
    type: String,
    description: 'Preferred locale (BCP-47), overrides Accept-Language',
  })
  @ApiOkResponse({ description: 'Welcome overview (config + pages list)' })
  async getWelcome(
    @Req() req: Request,
    @Query(new ZodValidationPipe(PublicWelcomeQuerySchema))
    query: PublicWelcomeQuery,
  ) {
    const locale = query.locale;
    const acceptLanguage = req.headers['accept-language'];

    const [config, pages] = await Promise.all([
      this.welcomeConfigService.getPublicConfig({ locale, acceptLanguage }),
      this.welcomePagesService.listPublicPages({ locale, acceptLanguage }),
    ]);

    return {
      ...config,
      pages,
    };
  }
}
