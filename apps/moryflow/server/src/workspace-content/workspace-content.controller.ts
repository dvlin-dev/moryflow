import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import {
  WorkspaceContentBatchDeleteDto,
  WorkspaceContentBatchUpsertDto,
} from './dto/workspace-content.dto';
import { WorkspaceContentService } from './workspace-content.service';

@ApiTags('Workspace Content')
@ApiBearerAuth('bearer')
@ApiCookieAuth('better-auth.session_token')
@Controller({ path: 'workspace-content', version: '1' })
export class WorkspaceContentController {
  constructor(
    private readonly workspaceContentService: WorkspaceContentService,
  ) {}

  @Post('batch-upsert')
  @ApiOperation({ summary: 'Batch upsert workspace content revisions' })
  async batchUpsert(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: WorkspaceContentBatchUpsertDto,
  ) {
    return this.workspaceContentService.batchUpsert(user.id, body);
  }

  @Post('batch-delete')
  @ApiOperation({ summary: 'Batch delete workspace content documents' })
  async batchDelete(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: WorkspaceContentBatchDeleteDto,
  ) {
    return this.workspaceContentService.batchDelete(user.id, body);
  }
}
