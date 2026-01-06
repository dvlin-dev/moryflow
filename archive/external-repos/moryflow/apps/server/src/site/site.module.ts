/**
 * Site Module
 * 站点发布功能模块
 */

import { Module } from '@nestjs/common';
import { SiteController } from './site.controller';
import { SitePublishController } from './site-publish.controller';
import { SiteService } from './site.service';
import { SitePublishService } from './site-publish.service';

@Module({
  controllers: [SiteController, SitePublishController],
  providers: [SiteService, SitePublishService],
  exports: [SiteService, SitePublishService],
})
export class SiteModule {}
