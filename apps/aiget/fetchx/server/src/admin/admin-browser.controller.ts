/**
 * Admin Browser Controller
 * 管理后台浏览器池状态 API
 */

import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { BrowserPool } from '../browser';

@ApiTags('Admin - Browser')
@ApiSecurity('session')
@Controller({ path: 'admin/browser', version: '1' })
@RequireAdmin()
export class AdminBrowserController {
  constructor(private readonly browserPool: BrowserPool) {}

  @Get('status')
  @ApiOperation({ summary: 'Get browser pool status' })
  @ApiOkResponse({ description: 'Browser pool status' })
  getBrowserStatus() {
    return this.browserPool.getDetailedStatus();
  }
}
