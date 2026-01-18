/**
 * Digest Admin Welcome Controller
 *
 * [INPUT]: WelcomeConfig update payload
 * [OUTPUT]: Updated config
 * [POS]: Admin Welcome 配置管理（RequireAdmin）
 */

import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { RequireAdmin } from '../../auth';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  DigestWelcomeConfigService,
  DigestWelcomePagesService,
} from '../services';
import {
  UpdateWelcomeConfigSchema,
  type UpdateWelcomeConfigInput,
} from '../dto';

@ApiTags('Admin - Digest Welcome')
@ApiSecurity('session')
@Controller({ path: 'admin/digest/welcome', version: '1' })
@RequireAdmin()
export class DigestAdminWelcomeController {
  constructor(
    private readonly welcomeConfigService: DigestWelcomeConfigService,
    private readonly welcomePagesService: DigestWelcomePagesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get welcome config (admin)' })
  @ApiOkResponse({ description: 'Welcome config' })
  async getWelcome() {
    return this.welcomeConfigService.getAdminConfig();
  }

  @Put()
  @ApiOperation({ summary: 'Update welcome config (admin)' })
  @ApiOkResponse({ description: 'Updated welcome config' })
  async updateWelcome(
    @Body(new ZodValidationPipe(UpdateWelcomeConfigSchema))
    input: UpdateWelcomeConfigInput,
  ) {
    await this.welcomePagesService.assertSlugExists(input.defaultSlug);
    return this.welcomeConfigService.updateConfig(input);
  }
}
