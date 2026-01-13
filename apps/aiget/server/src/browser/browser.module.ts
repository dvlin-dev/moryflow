/**
 * Browser 模块
 *
 * 提供两层功能：
 * 1. BrowserPool - 基础设施层，Playwright 浏览器实例池管理
 * 2. L2 Browser API - 会话管理、快照、动作执行
 *
 * 使用场景：screenshot（截图）、automation（智能化操作）、agent（AI Agent）
 */

import { Module, Global } from '@nestjs/common';
import { BrowserPool } from './browser-pool';
import { SessionManager } from './session';
import { SnapshotService } from './snapshot';
import { ActionHandler } from './handlers';
import { BrowserSessionService } from './browser-session.service';
import { BrowserSessionController } from './browser-session.controller';

@Global()
@Module({
  controllers: [BrowserSessionController],
  providers: [
    // 基础设施
    BrowserPool,
    // L2 API 服务
    SessionManager,
    SnapshotService,
    ActionHandler,
    BrowserSessionService,
  ],
  exports: [
    BrowserPool,
    SessionManager,
    SnapshotService,
    ActionHandler,
    BrowserSessionService,
  ],
})
export class BrowserModule {}
