import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import {
  MemoryBatchDeleteFactsDto,
  MemoryBatchUpdateFactsDto,
  MemoryCreateExportDto,
  MemoryCreateFactDto,
  MemoryEntityDetailQueryDto,
  MemoryFeedbackBodyDto,
  MemoryGetExportDto,
  MemoryGraphQueryDto,
  MemoryListFactsDto,
  MemorySearchDto,
  MemoryUpdateFactDto,
  MemoryVaultScopedQueryDto,
} from './dto/memory.dto';
import { MemoryService } from './memory.service';

@ApiTags('Memory')
@ApiBearerAuth('bearer')
@ApiCookieAuth('better-auth.session_token')
@Controller({ path: 'memory', version: '1' })
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get workspace memory overview' })
  async getOverview(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: MemoryVaultScopedQueryDto,
  ) {
    return this.memoryService.getOverview(user.id, query);
  }

  @Post('search')
  @ApiOperation({ summary: 'Search memory files and facts' })
  async search(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: MemorySearchDto,
  ) {
    return this.memoryService.search(user.id, body);
  }

  @Post('facts/query')
  @ApiOperation({ summary: 'List facts for a workspace memory scope' })
  async listFacts(
    @CurrentUser() user: CurrentUserDto,
    @Body() query: MemoryListFactsDto,
  ) {
    return this.memoryService.listFacts(user.id, query);
  }

  @Get('facts/:factId')
  @ApiOperation({ summary: 'Get fact detail' })
  async getFactDetail(
    @CurrentUser() user: CurrentUserDto,
    @Param('factId') factId: string,
    @Query() query: MemoryVaultScopedQueryDto,
  ) {
    return this.memoryService.getFactDetail(user.id, factId, query);
  }

  @Post('facts')
  @ApiOperation({ summary: 'Create manual fact' })
  async createFact(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: MemoryCreateFactDto,
  ) {
    return this.memoryService.createFact(user.id, body);
  }

  @Put('facts/:factId')
  @ApiOperation({ summary: 'Update manual fact' })
  async updateFact(
    @CurrentUser() user: CurrentUserDto,
    @Param('factId') factId: string,
    @Body() body: MemoryUpdateFactDto,
  ) {
    return this.memoryService.updateFact(user.id, factId, body);
  }

  @Delete('facts/:factId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete manual fact' })
  async deleteFact(
    @CurrentUser() user: CurrentUserDto,
    @Param('factId') factId: string,
    @Query() query: MemoryVaultScopedQueryDto,
  ) {
    await this.memoryService.deleteFact(user.id, factId, query);
  }

  @Post('facts/batch-update')
  @ApiOperation({ summary: 'Batch update manual facts' })
  async batchUpdateFacts(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: MemoryBatchUpdateFactsDto,
  ) {
    return this.memoryService.batchUpdateFacts(user.id, body);
  }

  @Post('facts/batch-delete')
  @ApiOperation({ summary: 'Batch delete manual facts' })
  async batchDeleteFacts(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: MemoryBatchDeleteFactsDto,
  ) {
    return this.memoryService.batchDeleteFacts(user.id, body);
  }

  @Get('facts/:factId/history')
  @ApiOperation({ summary: 'Get fact history' })
  async getFactHistory(
    @CurrentUser() user: CurrentUserDto,
    @Param('factId') factId: string,
    @Query() query: MemoryVaultScopedQueryDto,
  ) {
    return this.memoryService.getFactHistory(user.id, factId, query);
  }

  @Post('facts/:factId/feedback')
  @ApiOperation({ summary: 'Submit fact feedback' })
  async feedbackFact(
    @CurrentUser() user: CurrentUserDto,
    @Param('factId') factId: string,
    @Body() body: MemoryFeedbackBodyDto,
  ) {
    return this.memoryService.feedbackFact(user.id, {
      ...body,
      factId,
    });
  }

  @Post('graph/query')
  @ApiOperation({ summary: 'Query graph' })
  async queryGraph(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: MemoryGraphQueryDto,
  ) {
    return this.memoryService.queryGraph(user.id, body);
  }

  @Post('graph/entities/:entityId/detail')
  @ApiOperation({ summary: 'Get graph entity detail' })
  async getEntityDetail(
    @CurrentUser() user: CurrentUserDto,
    @Param('entityId') entityId: string,
    @Body() query: MemoryEntityDetailQueryDto,
  ) {
    return this.memoryService.getEntityDetail(user.id, entityId, query);
  }

  @Post('exports')
  @ApiOperation({ summary: 'Create facts export' })
  async createExport(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: MemoryCreateExportDto,
  ) {
    return this.memoryService.createExport(user.id, body);
  }

  @Post('exports/get')
  @ApiOperation({ summary: 'Get facts export payload' })
  async getExport(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: MemoryGetExportDto,
  ) {
    return this.memoryService.getExport(user.id, body);
  }
}
