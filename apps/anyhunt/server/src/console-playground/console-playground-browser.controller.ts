/**
 * Console Playground Browser Controller
 *
 * [INPUT]: apiKeyId + Browser 请求参数
 * [OUTPUT]: Browser 会话/快照/动作响应
 * [POS]: Console Playground Browser 代理入口（Session 认证）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  VERSION_NEUTRAL,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { BillingKey } from '../billing/billing.decorators';
import type { CurrentUserDto } from '../types';
import { ConsolePlaygroundService } from './console-playground.service';
import {
  SessionNotFoundError,
  SessionExpiredError,
  SessionOwnershipError,
} from '../browser/session';
import { UrlNotAllowedError } from '../browser/browser-session.service';
import { CdpConnectionError, CdpEndpointError } from '../browser/cdp';
import { InvalidInterceptRuleError } from '../browser/network';
import { StorageExportError, StorageImportError } from '../browser/persistence';
import {
  ConsoleBrowserSessionSchema,
  ConsoleBrowserOpenSchema,
  ConsoleBrowserSnapshotSchema,
  ConsoleBrowserDeltaSnapshotSchema,
  ConsoleBrowserActionSchema,
  ConsoleBrowserScreenshotSchema,
  ConsoleBrowserCreateWindowSchema,
  ConsoleBrowserConnectCdpSchema,
  ConsoleBrowserInterceptRulesSchema,
  ConsoleBrowserInterceptRuleSchema,
  ConsoleBrowserExportStorageSchema,
  ConsoleBrowserImportStorageSchema,
  ApiKeyIdQuerySchema,
  BrowserNetworkHistoryQuerySchema,
  type ConsoleBrowserSessionDto,
  type ConsoleBrowserOpenDto,
  type ConsoleBrowserSnapshotDto,
  type ConsoleBrowserDeltaSnapshotDto,
  type ConsoleBrowserActionDto,
  type ConsoleBrowserScreenshotDto,
  type ConsoleBrowserCreateWindowDto,
  type ConsoleBrowserConnectCdpDto,
  type ConsoleBrowserInterceptRulesDto,
  type ConsoleBrowserInterceptRuleDto,
  type ConsoleBrowserExportStorageDto,
  type ConsoleBrowserImportStorageDto,
  type ApiKeyIdQueryDto,
  type BrowserNetworkHistoryQueryDto,
} from './dto';

@ApiTags('Console - Playground')
@ApiCookieAuth()
@Controller({ path: 'console/playground/browser', version: VERSION_NEUTRAL })
export class ConsolePlaygroundBrowserController {
  constructor(private readonly service: ConsolePlaygroundService) {}

  @Post('session')
  @ApiOperation({ summary: 'Create browser session (console proxy)' })
  @ApiCreatedResponse({ description: 'Session created' })
  @BillingKey('fetchx.browser.session')
  async createSession(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(ConsoleBrowserSessionSchema))
    dto: ConsoleBrowserSessionDto,
  ) {
    const { apiKeyId, ...options } = dto;
    return this.withBrowserErrors(() =>
      this.service.createBrowserSession(user.id, apiKeyId, options),
    );
  }

  @Get('session/:id')
  @ApiOperation({ summary: 'Get browser session status (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'Session status' })
  async getSessionStatus(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.withBrowserErrors(() =>
      this.service.getBrowserSessionStatus(user.id, query.apiKeyId, sessionId),
    );
  }

  @Delete('session/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Close browser session (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async closeSession(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.withBrowserErrors(() =>
      this.service.closeBrowserSession(user.id, query.apiKeyId, sessionId),
    );
  }

  @Post('session/:id/open')
  @ApiOperation({ summary: 'Open URL (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async openUrl(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ConsoleBrowserOpenSchema))
    dto: ConsoleBrowserOpenDto,
  ) {
    const { apiKeyId, ...options } = dto;
    return this.withBrowserErrors(() =>
      this.service.openBrowserUrl(user.id, apiKeyId, sessionId, options),
    );
  }

  @Post('session/:id/snapshot')
  @ApiOperation({ summary: 'Snapshot (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async getSnapshot(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ConsoleBrowserSnapshotSchema))
    dto: ConsoleBrowserSnapshotDto,
  ) {
    const { apiKeyId, ...options } = dto;
    return this.withBrowserErrors(() =>
      this.service.getBrowserSnapshot(user.id, apiKeyId, sessionId, options),
    );
  }

  @Post('session/:id/snapshot/delta')
  @ApiOperation({ summary: 'Delta snapshot (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async getDeltaSnapshot(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ConsoleBrowserDeltaSnapshotSchema))
    dto: ConsoleBrowserDeltaSnapshotDto,
  ) {
    const { apiKeyId, ...options } = dto;
    return this.withBrowserErrors(() =>
      this.service.getBrowserDeltaSnapshot(
        user.id,
        apiKeyId,
        sessionId,
        options,
      ),
    );
  }

  @Post('session/:id/action')
  @ApiOperation({ summary: 'Execute action (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async executeAction(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ConsoleBrowserActionSchema))
    dto: ConsoleBrowserActionDto,
  ) {
    const { apiKeyId, ...action } = dto;
    return this.withBrowserErrors(() =>
      this.service.executeBrowserAction(user.id, apiKeyId, sessionId, action),
    );
  }

  @Post('session/:id/screenshot')
  @ApiOperation({ summary: 'Screenshot (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'Screenshot data' })
  @BillingKey('fetchx.browser.screenshot')
  async getScreenshot(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ConsoleBrowserScreenshotSchema))
    dto: ConsoleBrowserScreenshotDto,
  ) {
    const { apiKeyId, ...options } = dto;
    return this.withBrowserErrors(() =>
      this.service.getBrowserScreenshot(user.id, apiKeyId, sessionId, options),
    );
  }

  // ==================== Tabs ====================

  @Post('session/:id/tabs')
  @ApiOperation({ summary: 'Create tab (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiCreatedResponse({ description: 'Tab created' })
  async createTab(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.withBrowserErrors(() =>
      this.service.createBrowserTab(user.id, query.apiKeyId, sessionId),
    );
  }

  @Get('session/:id/tabs')
  @ApiOperation({ summary: 'List tabs (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async listTabs(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.withBrowserErrors(() =>
      this.service.listBrowserTabs(user.id, query.apiKeyId, sessionId),
    );
  }

  @Post('session/:id/tabs/:tabIndex/activate')
  @ApiOperation({ summary: 'Activate tab (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiParam({ name: 'tabIndex', description: 'Tab index to activate' })
  async switchTab(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Param('tabIndex') tabIndex: string,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.withBrowserErrors(() =>
      this.service.switchBrowserTab(
        user.id,
        query.apiKeyId,
        sessionId,
        parseInt(tabIndex, 10),
      ),
    );
  }

  @Delete('session/:id/tabs/:tabIndex')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Close tab (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiParam({ name: 'tabIndex', description: 'Tab index to close' })
  async closeTab(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Param('tabIndex') tabIndex: string,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.withBrowserErrors(() =>
      this.service.closeBrowserTab(
        user.id,
        query.apiKeyId,
        sessionId,
        parseInt(tabIndex, 10),
      ),
    );
  }

  @Get('session/:id/dialogs')
  @ApiOperation({ summary: 'Dialog history (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async getDialogHistory(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.withBrowserErrors(() =>
      this.service.getBrowserDialogHistory(user.id, query.apiKeyId, sessionId),
    );
  }

  // ==================== Windows ====================

  @Post('session/:id/windows')
  @ApiOperation({ summary: 'Create window (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiCreatedResponse({ description: 'Window created' })
  async createWindow(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ConsoleBrowserCreateWindowSchema))
    dto: ConsoleBrowserCreateWindowDto,
  ) {
    const { apiKeyId, ...options } = dto;
    return this.withBrowserErrors(() =>
      this.service.createBrowserWindow(user.id, apiKeyId, sessionId, options),
    );
  }

  @Get('session/:id/windows')
  @ApiOperation({ summary: 'List windows (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async listWindows(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.withBrowserErrors(() =>
      this.service.listBrowserWindows(user.id, query.apiKeyId, sessionId),
    );
  }

  @Post('session/:id/windows/:windowIndex/activate')
  @ApiOperation({ summary: 'Activate window (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiParam({ name: 'windowIndex', description: 'Window index to activate' })
  async switchWindow(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Param('windowIndex') windowIndex: string,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.withBrowserErrors(() =>
      this.service.switchBrowserWindow(
        user.id,
        query.apiKeyId,
        sessionId,
        parseInt(windowIndex, 10),
      ),
    );
  }

  @Delete('session/:id/windows/:windowIndex')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Close window (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiParam({ name: 'windowIndex', description: 'Window index to close' })
  async closeWindow(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Param('windowIndex') windowIndex: string,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.withBrowserErrors(() =>
      this.service.closeBrowserWindow(
        user.id,
        query.apiKeyId,
        sessionId,
        parseInt(windowIndex, 10),
      ),
    );
  }

  // ==================== CDP ====================

  @Post('cdp/connect')
  @ApiOperation({ summary: 'Connect CDP (console proxy)' })
  @ApiCreatedResponse({ description: 'CDP session created' })
  async connectCdp(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(ConsoleBrowserConnectCdpSchema))
    dto: ConsoleBrowserConnectCdpDto,
  ) {
    const { apiKeyId, ...options } = dto;
    return this.withBrowserErrors(() =>
      this.service.connectBrowserCdp(user.id, apiKeyId, options),
    );
  }

  // ==================== Network Intercept ====================

  @Post('session/:id/intercept/rules')
  @ApiOperation({ summary: 'Set intercept rules (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async setInterceptRules(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ConsoleBrowserInterceptRulesSchema))
    dto: ConsoleBrowserInterceptRulesDto,
  ) {
    const { apiKeyId, rules } = dto;
    return this.withBrowserErrors(() =>
      this.service.setBrowserInterceptRules(
        user.id,
        apiKeyId,
        sessionId,
        rules,
      ),
    );
  }

  @Post('session/:id/intercept/rule')
  @ApiOperation({ summary: 'Add intercept rule (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async addInterceptRule(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ConsoleBrowserInterceptRuleSchema))
    dto: ConsoleBrowserInterceptRuleDto,
  ) {
    const { apiKeyId, ...rule } = dto;
    return this.withBrowserErrors(() =>
      this.service.addBrowserInterceptRule(user.id, apiKeyId, sessionId, rule),
    );
  }

  @Delete('session/:id/intercept/rule/:ruleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove intercept rule (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiParam({ name: 'ruleId', description: 'Rule ID' })
  async removeInterceptRule(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Param('ruleId') ruleId: string,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.withBrowserErrors(() =>
      this.service.removeBrowserInterceptRule(
        user.id,
        query.apiKeyId,
        sessionId,
        ruleId,
      ),
    );
  }

  @Delete('session/:id/intercept/rules')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear intercept rules (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async clearInterceptRules(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.withBrowserErrors(() =>
      this.service.clearBrowserInterceptRules(
        user.id,
        query.apiKeyId,
        sessionId,
      ),
    );
  }

  @Get('session/:id/intercept/rules')
  @ApiOperation({ summary: 'List intercept rules (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async getInterceptRules(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.withBrowserErrors(() =>
      this.service.getBrowserInterceptRules(user.id, query.apiKeyId, sessionId),
    );
  }

  @Get('session/:id/network/history')
  @ApiOperation({ summary: 'Network history (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async getNetworkHistory(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Query(new ZodValidationPipe(BrowserNetworkHistoryQuerySchema))
    query: BrowserNetworkHistoryQueryDto,
  ) {
    return this.withBrowserErrors(() =>
      this.service.getBrowserNetworkHistory(
        user.id,
        query.apiKeyId,
        sessionId,
        {
          limit: query.limit,
          urlFilter: query.urlFilter,
        },
      ),
    );
  }

  @Delete('session/:id/network/history')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear network history (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async clearNetworkHistory(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.withBrowserErrors(() =>
      this.service.clearBrowserNetworkHistory(
        user.id,
        query.apiKeyId,
        sessionId,
      ),
    );
  }

  // ==================== Storage ====================

  @Post('session/:id/storage/export')
  @ApiOperation({ summary: 'Export storage (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async exportStorage(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ConsoleBrowserExportStorageSchema))
    dto: ConsoleBrowserExportStorageDto,
  ) {
    const { apiKeyId, ...options } = dto;
    return this.withBrowserErrors(() =>
      this.service.exportBrowserStorage(user.id, apiKeyId, sessionId, options),
    );
  }

  @Post('session/:id/storage/import')
  @ApiOperation({ summary: 'Import storage (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async importStorage(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ConsoleBrowserImportStorageSchema))
    dto: ConsoleBrowserImportStorageDto,
  ) {
    const { apiKeyId, ...data } = dto;
    return this.withBrowserErrors(() =>
      this.service.importBrowserStorage(user.id, apiKeyId, sessionId, data),
    );
  }

  @Delete('session/:id/storage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear storage (console proxy)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async clearStorage(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Query(new ZodValidationPipe(ApiKeyIdQuerySchema)) query: ApiKeyIdQueryDto,
  ) {
    return this.withBrowserErrors(() =>
      this.service.clearBrowserStorage(user.id, query.apiKeyId, sessionId),
    );
  }

  private async withBrowserErrors<T>(handler: () => Promise<T>): Promise<T> {
    try {
      return await handler();
    } catch (error) {
      this.handleBrowserError(error);
    }
  }

  private handleBrowserError(error: unknown): never {
    if (error instanceof SessionNotFoundError) {
      throw new HttpException(
        { error: 'Session not found', message: error.message },
        HttpStatus.NOT_FOUND,
      );
    }

    if (error instanceof SessionExpiredError) {
      throw new HttpException(
        { error: 'Session expired', message: error.message },
        HttpStatus.GONE,
      );
    }

    if (error instanceof SessionOwnershipError) {
      throw new HttpException(
        { error: 'Session forbidden', message: error.message },
        HttpStatus.FORBIDDEN,
      );
    }

    if (error instanceof UrlNotAllowedError) {
      throw new HttpException(
        { error: 'URL not allowed', message: error.message },
        HttpStatus.FORBIDDEN,
      );
    }

    if (error instanceof CdpConnectionError) {
      throw new HttpException(
        { error: 'CDP connection failed', message: error.message },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (error instanceof CdpEndpointError) {
      throw new HttpException(
        { error: 'Invalid CDP endpoint', message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (error instanceof InvalidInterceptRuleError) {
      throw new HttpException(
        { error: 'Invalid intercept rule', message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (error instanceof StorageImportError) {
      throw new HttpException(
        { error: 'Storage import failed', message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (error instanceof StorageExportError) {
      throw new HttpException(
        { error: 'Storage export failed', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    throw error;
  }
}
