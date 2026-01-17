/**
 * Digest Admin Welcome Controller
 *
 * [INPUT]: WelcomeConfig update payload
 * [OUTPUT]: Updated config (raw by-locale maps)
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
import { DigestWelcomeService } from '../services/welcome.service';
import { UpdateWelcomeSchema, type UpdateWelcomeInput } from '../dto';

@ApiTags('Admin - Digest Welcome')
@ApiSecurity('session')
@Controller({ path: 'admin/digest/welcome', version: '1' })
@RequireAdmin()
export class DigestAdminWelcomeController {
  constructor(private readonly welcomeService: DigestWelcomeService) {}

  @Get()
  @ApiOperation({ summary: 'Get welcome config (admin)' })
  @ApiOkResponse({ description: 'Welcome config (raw locale maps)' })
  async getWelcome() {
    return this.welcomeService.getAdminWelcome();
  }

  @Put()
  @ApiOperation({ summary: 'Update welcome config (admin)' })
  @ApiOkResponse({ description: 'Updated welcome config' })
  async updateWelcome(
    @Body(new ZodValidationPipe(UpdateWelcomeSchema)) input: UpdateWelcomeInput,
  ) {
    await this.welcomeService.updateWelcome(input);
    return this.welcomeService.getAdminWelcome();
  }
}
