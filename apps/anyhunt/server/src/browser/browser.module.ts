/**
 * Browser 模块
 *
 * [INPUT]: 浏览器会话与自动化请求
 * [OUTPUT]: 浏览器能力服务（Session/Snapshot/Action/Ports）
 * [POS]: L2 Browser API + Agent 端口提供方
 *
 * P2 扩展功能：
 * - CDP 连接：连接已运行的浏览器（调试、Electron 等）
 * - 网络拦截：请求头修改、响应 mock、请求阻止
 * - 会话持久化：cookies/localStorage 导出导入
 * - 增量快照：delta 模式节省 token
 *
 * 使用场景：screenshot（截图）、automation（智能化操作）、agent（AI Agent）
 * 依赖：Public L2 API 使用 ApiKeyGuard，因此必须导入 ApiKeyModule（提供 ApiKeyService）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Module, Global } from '@nestjs/common';
import { BrowserPool } from './browser-pool';
import { SessionManager } from './session';
import { SnapshotService } from './snapshot';
import { ActionHandler } from './handlers';
import { ActionPacingService, NavigationRetryService } from './runtime';
import { CdpConnectorService } from './cdp';
import { NetworkInterceptorService } from './network';
import {
  StoragePersistenceService,
  ProfilePersistenceService,
} from './persistence';
import { BrowserDiagnosticsService } from './diagnostics';
import { BrowserRiskTelemetryService } from './observability';
import { BrowserStreamService } from './streaming';
import { SitePolicyService, SiteRateLimiterService } from './policy';
import { BrowserSessionService } from './browser-session.service';
import { BrowserSessionController } from './browser-session.controller';
import { BrowserAgentPortService } from './ports';
import { ApiKeyModule } from '../api-key';
import { StorageModule } from '../storage';

@Global()
@Module({
  imports: [ApiKeyModule, StorageModule],
  controllers: [BrowserSessionController],
  providers: [
    // 基础设施
    BrowserPool,
    // L2 API 核心服务
    SessionManager,
    SnapshotService,
    ActionHandler,
    ActionPacingService,
    NavigationRetryService,
    // P2 扩展服务
    CdpConnectorService,
    NetworkInterceptorService,
    StoragePersistenceService,
    ProfilePersistenceService,
    BrowserDiagnosticsService,
    BrowserRiskTelemetryService,
    BrowserStreamService,
    SitePolicyService,
    SiteRateLimiterService,
    // 聚合服务
    BrowserSessionService,
    // Agent 端口（隔离 Playwright 类型）
    BrowserAgentPortService,
  ],
  exports: [
    BrowserPool,
    SessionManager,
    SnapshotService,
    ActionHandler,
    ActionPacingService,
    NavigationRetryService,
    CdpConnectorService,
    NetworkInterceptorService,
    StoragePersistenceService,
    ProfilePersistenceService,
    BrowserDiagnosticsService,
    BrowserRiskTelemetryService,
    BrowserStreamService,
    SitePolicyService,
    SiteRateLimiterService,
    BrowserSessionService,
    BrowserAgentPortService,
  ],
})
export class BrowserModule {}
