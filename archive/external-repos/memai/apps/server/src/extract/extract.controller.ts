/**
 * Extract API Controller
 *
 * [INPUT]: Text for entity/relation extraction
 * [OUTPUT]: Extracted entities and relations
 * [POS]: Public API for knowledge extraction
 */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiOkResponse } from '@nestjs/swagger';
import { ExtractService } from './extract.service';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { ApiKeyDataIsolationInterceptor } from '../common/interceptors/api-key-isolation.interceptor';
import { ApiKeyId } from '../common/decorators/api-key.decorator';
import { ExtractDto, ExtractBatchDto } from './dto';

@ApiTags('Extract')
@ApiSecurity('apiKey')
@Controller({ path: 'extract', version: '1' })
@UseGuards(ApiKeyGuard, QuotaGuard)
@UseInterceptors(ApiKeyDataIsolationInterceptor)
export class ExtractController {
  constructor(private readonly extractService: ExtractService) {}

  /**
   * Extract entities and relations from text
   */
  @Post()
  @ApiOperation({ summary: 'Extract entities and relations from text' })
  @ApiOkResponse({ description: 'Extracted entities and relations' })
  async extract(@ApiKeyId() apiKeyId: string, @Body() dto: ExtractDto) {
    return this.extractService.extractFromText(apiKeyId, dto.text, {
      userId: dto.userId,
      entityTypes: dto.entityTypes,
      relationTypes: dto.relationTypes,
      minConfidence: dto.minConfidence,
      saveToGraph: dto.saveToGraph,
    });
  }

  /**
   * Batch extract from multiple texts
   */
  @Post('batch')
  @ApiOperation({ summary: 'Batch extract from multiple texts' })
  @ApiOkResponse({ description: 'Batch extraction results' })
  async extractBatch(@ApiKeyId() apiKeyId: string, @Body() dto: ExtractBatchDto) {
    return this.extractService.extractFromTexts(apiKeyId, dto.texts, {
      userId: dto.userId,
      entityTypes: dto.entityTypes,
      relationTypes: dto.relationTypes,
      minConfidence: dto.minConfidence,
      saveToGraph: dto.saveToGraph,
    });
  }
}
