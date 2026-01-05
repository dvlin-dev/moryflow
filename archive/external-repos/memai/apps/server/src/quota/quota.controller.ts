/**
 * Quota Controller
 *
 * [INPUT]: API requests (Session auth)
 * [OUTPUT]: Quota status
 * [POS]: Quota module API routes
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiOkResponse } from '@nestjs/swagger';
import { QuotaService } from './quota.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators';
import type { User } from '../../generated/prisma/client';

@ApiTags('Quota')
@ApiSecurity('apiKey')
@Controller({ path: 'quota', version: '1' })
@UseGuards(AuthGuard)
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

  /**
   * Get current quota status
   */
  @Get()
  @ApiOperation({ summary: 'Get quota status' })
  @ApiOkResponse({ description: 'Quota status' })
  async getQuotaStatus(@CurrentUser() user: User) {
    return this.quotaService.getQuotaStatus(user.id);
  }
}
