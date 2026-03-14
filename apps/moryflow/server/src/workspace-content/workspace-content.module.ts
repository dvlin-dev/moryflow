import { Module } from '@nestjs/common';
import { WorkspaceContentController } from './workspace-content.controller';
import { WorkspaceContentService } from './workspace-content.service';

@Module({
  controllers: [WorkspaceContentController],
  providers: [WorkspaceContentService],
  exports: [WorkspaceContentService],
})
export class WorkspaceContentModule {}
