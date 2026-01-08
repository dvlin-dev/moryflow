/**
 * [INPUT]: MapOptionsDto - Starting URL, search filter, limit
 * [OUTPUT]: MapResult - Discovered URLs and count
 * [POS]: Public API controller for URL discovery operations
 *
 * [PROTOCOL]: When this file changes, update this header and src/map/CLAUDE.md
 */
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { MapService } from './map.service';
import { MapOptionsSchema } from './dto/map.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, Public } from '../auth';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import type { CurrentUserDto } from '../types';
import { BillingKey } from '../billing/billing.decorators';

@ApiTags('Map')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'map', version: '1' })
@UseGuards(ApiKeyGuard)
export class MapController {
  constructor(private mapService: MapService) {}

  @Post()
  @ApiOperation({ summary: 'Discover URLs on a website' })
  @ApiOkResponse({ description: 'List of discovered URLs' })
  @BillingKey('fetchx.map')
  async map(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(MapOptionsSchema)) options: unknown,
  ) {
    return this.mapService.map(
      user.id,
      options as Parameters<typeof this.mapService.map>[1],
    );
  }
}
