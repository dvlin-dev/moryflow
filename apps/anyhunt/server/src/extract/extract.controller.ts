/**
 * [INPUT]: ExtractOptionsDto - URLs, prompt, and JSON schema
 * [OUTPUT]: ExtractResponse - Structured data extracted from pages
 * [POS]: Public API controller for AI-powered data extraction
 *
 * [PROTOCOL]: When this file changes, update this header and src/extract/CLAUDE.md
 */
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { ExtractService } from './extract.service';
import { ExtractOptionsSchema } from './dto/extract.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, Public } from '../auth';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import type { CurrentUserDto } from '../types';
import { BillingKey } from '../billing/billing.decorators';

@ApiTags('Extract')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'extract', version: '1' })
@UseGuards(ApiKeyGuard)
export class ExtractController {
  constructor(private extractService: ExtractService) {}

  @Post()
  @ApiOperation({ summary: 'Extract structured data from URLs using AI' })
  @ApiOkResponse({ description: 'Extracted data' })
  @BillingKey('fetchx.extract')
  async extract(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(ExtractOptionsSchema)) options: unknown,
  ) {
    return this.extractService.extract(
      user.id,
      options as Parameters<typeof this.extractService.extract>[1],
    );
  }
}
