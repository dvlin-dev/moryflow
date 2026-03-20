import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { ResolveWorkspaceDto } from './dto/workspace.dto';
import { WorkspaceService } from './workspace.service';

@ApiTags('Workspace')
@ApiBearerAuth('bearer')
@ApiCookieAuth('better-auth.session_token')
@Controller({ path: 'workspaces', version: '1' })
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post('resolve')
  @ApiOperation({
    summary: 'Resolve or create the current logical workspace for the user',
  })
  async resolveWorkspace(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: ResolveWorkspaceDto,
  ) {
    return this.workspaceService.resolveWorkspace(user.id, body);
  }
}
