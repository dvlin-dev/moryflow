/**
 * Browser 模块
 *
 * 提供两层功能：
 * 1. BrowserPool - 基础设施层，Playwright 浏览器实例池管理
 * 2. L2 Browser API - 会话管理、快照、动作执行
 *
 * P2 扩展功能：
 * - CDP 连接：连接已运行的浏览器（调试、Electron 等）
 * - 网络拦截：请求头修改、响应 mock、请求阻止
 * - 会话持久化：cookies/localStorage 导出导入
 * - 增量快照：delta 模式节省 token
 *
 * 使用场景：screenshot（截图）、automation（智能化操作）、agent（AI Agent）
 */

import { Module, Global } from '@nestjs/common';
import { BrowserPool } from './browser-pool';
import { SessionManager } from './session';
import { SnapshotService } from './snapshot';
import { ActionHandler } from './handlers';
import { CdpConnectorService } from './cdp';
import { NetworkInterceptorService } from './network';
import { StoragePersistenceService } from './persistence';
import { BrowserSessionService } from './browser-session.service';
import { BrowserSessionController } from './browser-session.controller';

@Global()
@Module({
  controllers: [BrowserSessionController],
  providers: [
    // 基础设施
    BrowserPool,
    // L2 API 核心服务
    SessionManager,
    SnapshotService,
    ActionHandler,
    // P2 扩展服务
    CdpConnectorService,
    NetworkInterceptorService,
    StoragePersistenceService,
    // 聚合服务
    BrowserSessionService,
  ],
  exports: [
    BrowserPool,
    SessionManager,
    SnapshotService,
    ActionHandler,
    CdpConnectorService,
    NetworkInterceptorService,
    StoragePersistenceService,
    BrowserSessionService,
  ],
})
export class BrowserModule {}
