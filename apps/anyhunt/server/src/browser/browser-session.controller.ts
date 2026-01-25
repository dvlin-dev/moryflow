/**
 * Browser Session Controller
 *
 * [INPUT]: L2 Browser API 请求
 * [OUTPUT]: 会话信息、快照、操作结果
 * [POS]: L2 Browser API 控制器，路由 /api/v1/browser/*
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
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../common';
import { CurrentUser, Public } from '../auth';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { BillingKey } from '../billing/billing.decorators';
import {
  BrowserSessionService,
  UrlNotAllowedError,
} from './browser-session.service';
import {
  SessionNotFoundError,
  SessionExpiredError,
  SessionOwnershipError,
  SessionOperationNotAllowedError,
} from './session';
import { BrowserUnavailableError } from './browser-pool';
import type { CurrentUserDto } from '../types';
import {
  CreateSessionSchema,
  OpenUrlSchema,
  SnapshotSchema,
  DeltaSnapshotSchema,
  ActionSchema,
  ActionBatchSchema,
  ScreenshotSchema,
  CreateWindowSchema,
  ConnectCdpSchemaRefined,
  SetInterceptRulesSchema,
  InterceptRuleSchema,
  SetHeadersSchema,
  ClearHeadersSchema,
  TraceStartSchema,
  TraceStopSchema,
  HarStartSchema,
  HarStopSchema,
  LogQuerySchema,
  ExportStorageSchema,
  ImportStorageSchema,
  SaveProfileSchema,
  LoadProfileSchema,
  CreateStreamSchema,
  type CreateSessionInput,
  type OpenUrlInput,
  type SnapshotInput,
  type DeltaSnapshotInput,
  type ActionInput,
  type ActionBatchInput,
  type ActionBatchResponse,
  type ScreenshotInput,
  type CreateWindowInput,
  type ConnectCdpInput,
  type InterceptRule,
  type SetHeadersInput,
  type ClearHeadersInput,
  type ExportStorageInput,
  type ImportStorageInput,
  type TraceStartInput,
  type TraceStopInput,
  type HarStartInput,
  type HarStopInput,
  type LogQueryInput,
  type SaveProfileInput,
  type LoadProfileInput,
  type CreateStreamInput,
} from './dto';
import { CdpConnectionError, CdpEndpointError, CdpPolicyError } from './cdp';
import { InvalidInterceptRuleError } from './network';
import {
  StorageImportError,
  StorageExportError,
  ProfilePersistenceNotConfiguredError,
} from './persistence';
import { StreamNotConfiguredError } from './streaming';

@ApiTags('Browser')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'browser/session', version: '1' })
@UseGuards(ApiKeyGuard)
export class BrowserSessionController {
  constructor(private readonly browserSessionService: BrowserSessionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new browser session' })
  @ApiCreatedResponse({ description: 'Session created successfully' })
  @BillingKey('fetchx.browser.session')
  async createSession(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(CreateSessionSchema))
    options: CreateSessionInput,
  ) {
    return this.browserSessionService.createSession(user.id, options);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session status' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'Session status' })
  @ApiNotFoundResponse({ description: 'Session not found or expired' })
  async getSessionStatus(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
  ) {
    try {
      return await this.browserSessionService.getSessionStatus(
        user.id,
        sessionId,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Close a browser session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async closeSession(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
  ) {
    await this.browserSessionService.closeSession(user.id, sessionId);
  }

  @Post(':id/open')
  @ApiOperation({ summary: 'Open a URL in the session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'URL opened successfully' })
  async openUrl(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(OpenUrlSchema)) options: OpenUrlInput,
  ) {
    try {
      return await this.browserSessionService.openUrl(
        user.id,
        sessionId,
        options,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Post(':id/snapshot')
  @ApiOperation({
    summary: 'Get accessibility tree snapshot with element refs',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'Page snapshot with refs' })
  async getSnapshot(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(SnapshotSchema)) options: SnapshotInput,
  ) {
    try {
      return await this.browserSessionService.getSnapshot(
        user.id,
        sessionId,
        options,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Post(':id/action')
  @ApiOperation({ summary: 'Execute an action in the session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'Action result' })
  async executeAction(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ActionSchema)) action: ActionInput,
  ) {
    try {
      return await this.browserSessionService.executeAction(
        user.id,
        sessionId,
        action,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Post(':id/action/batch')
  @ApiOperation({ summary: 'Execute a batch of actions in the session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'Batch action result' })
  async executeActionBatch(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ActionBatchSchema)) input: ActionBatchInput,
  ): Promise<ActionBatchResponse | undefined> {
    try {
      return await this.browserSessionService.executeActionBatch(
        user.id,
        sessionId,
        input,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Post(':id/screenshot')
  @ApiOperation({ summary: 'Take a screenshot of the page' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'Screenshot data' })
  @BillingKey('fetchx.browser.screenshot')
  async getScreenshot(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ScreenshotSchema)) options: ScreenshotInput,
  ) {
    try {
      return await this.browserSessionService.getScreenshot(
        user.id,
        sessionId,
        options,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  // ==================== 多标签页管理 ====================

  @Post(':id/tabs')
  @ApiOperation({ summary: 'Create a new tab in the session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiCreatedResponse({ description: 'New tab created' })
  async createTab(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
  ) {
    try {
      return await this.browserSessionService.createTab(user.id, sessionId);
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Get(':id/tabs')
  @ApiOperation({ summary: 'List all tabs in the session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'List of tabs' })
  async listTabs(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
  ) {
    try {
      return await this.browserSessionService.listTabs(user.id, sessionId);
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Post(':id/tabs/:tabIndex/activate')
  @ApiOperation({ summary: 'Switch to a specific tab' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiParam({ name: 'tabIndex', description: 'Tab index to activate' })
  @ApiOkResponse({ description: 'Tab activated' })
  async switchTab(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Param('tabIndex', ParseIntPipe) tabIndex: number,
  ) {
    try {
      return await this.browserSessionService.switchTab(
        user.id,
        sessionId,
        tabIndex,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Delete(':id/tabs/:tabIndex')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Close a specific tab' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiParam({ name: 'tabIndex', description: 'Tab index to close' })
  async closeTab(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Param('tabIndex', ParseIntPipe) tabIndex: number,
  ) {
    try {
      await this.browserSessionService.closeTab(user.id, sessionId, tabIndex);
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  // ==================== 对话框历史 ====================

  @Get(':id/dialogs')
  @ApiOperation({ summary: 'Get dialog history for the session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'List of recent dialogs' })
  getDialogHistory(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
  ) {
    try {
      return this.browserSessionService.getDialogHistory(user.id, sessionId);
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  // ==================== 多窗口管理 ====================

  @Post(':id/windows')
  @ApiOperation({
    summary: 'Create a new window with isolated cookies/storage',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiCreatedResponse({ description: 'New window created' })
  async createWindow(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(CreateWindowSchema)) options: CreateWindowInput,
  ) {
    try {
      return await this.browserSessionService.createWindow(
        user.id,
        sessionId,
        options,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Get(':id/windows')
  @ApiOperation({ summary: 'List all windows in the session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'List of windows' })
  async listWindows(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
  ) {
    try {
      return await this.browserSessionService.listWindows(user.id, sessionId);
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Post(':id/windows/:windowIndex/activate')
  @ApiOperation({ summary: 'Switch to a specific window' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiParam({ name: 'windowIndex', description: 'Window index to activate' })
  @ApiOkResponse({ description: 'Window activated' })
  async switchWindow(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Param('windowIndex', ParseIntPipe) windowIndex: number,
  ) {
    try {
      return await this.browserSessionService.switchWindow(
        user.id,
        sessionId,
        windowIndex,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Delete(':id/windows/:windowIndex')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Close a specific window' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiParam({ name: 'windowIndex', description: 'Window index to close' })
  async closeWindow(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Param('windowIndex', ParseIntPipe) windowIndex: number,
  ) {
    try {
      await this.browserSessionService.closeWindow(
        user.id,
        sessionId,
        windowIndex,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  // ==================== P2.1 CDP 连接 ====================

  @Post('cdp/connect')
  @ApiOperation({ summary: 'Connect to an existing browser via CDP' })
  @ApiCreatedResponse({ description: 'CDP session created successfully' })
  async connectCdp(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(ConnectCdpSchemaRefined))
    options: ConnectCdpInput,
  ) {
    try {
      return await this.browserSessionService.connectCdp(user.id, options);
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  // ==================== P2.2 网络拦截 ====================

  @Post(':id/intercept/rules')
  @ApiOperation({ summary: 'Set network interception rules' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'Rules set successfully' })
  async setInterceptRules(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(SetInterceptRulesSchema))
    body: { rules: InterceptRule[] },
  ) {
    try {
      return await this.browserSessionService.setInterceptRules(
        user.id,
        sessionId,
        body.rules,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Post(':id/intercept/rule')
  @ApiOperation({ summary: 'Add a single interception rule' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiCreatedResponse({ description: 'Rule added successfully' })
  async addInterceptRule(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(InterceptRuleSchema)) rule: InterceptRule,
  ) {
    try {
      return await this.browserSessionService.addInterceptRule(
        user.id,
        sessionId,
        rule,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Delete(':id/intercept/rule/:ruleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an interception rule' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiParam({ name: 'ruleId', description: 'Rule ID to remove' })
  removeInterceptRule(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Param('ruleId') ruleId: string,
  ) {
    try {
      this.browserSessionService.removeInterceptRule(
        user.id,
        sessionId,
        ruleId,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Delete(':id/intercept/rules')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear all interception rules' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async clearInterceptRules(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
  ) {
    try {
      await this.browserSessionService.clearInterceptRules(user.id, sessionId);
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Get(':id/intercept/rules')
  @ApiOperation({ summary: 'Get current interception rules' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'List of rules' })
  getInterceptRules(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
  ) {
    try {
      return this.browserSessionService.getInterceptRules(user.id, sessionId);
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Get(':id/network/history')
  @ApiOperation({ summary: 'Get network request history' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'List of network requests' })
  getNetworkHistory(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
  ) {
    try {
      return this.browserSessionService.getNetworkHistory(user.id, sessionId);
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Delete(':id/network/history')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear network request history' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  clearNetworkHistory(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
  ) {
    try {
      this.browserSessionService.clearNetworkHistory(user.id, sessionId);
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  // ==================== P2.2.1 Headers ====================

  @Post(':id/headers')
  @ApiOperation({ summary: 'Set global/origin-scoped headers' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async setHeaders(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(SetHeadersSchema)) input: SetHeadersInput,
  ) {
    try {
      return await this.browserSessionService.setHeaders(
        user.id,
        sessionId,
        input,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Post(':id/headers/clear')
  @ApiOperation({ summary: 'Clear headers (global/scoped)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async clearHeaders(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ClearHeadersSchema)) input: ClearHeadersInput,
  ) {
    try {
      return await this.browserSessionService.clearHeaders(
        user.id,
        sessionId,
        input,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  // ==================== P2.3 诊断与观测 ====================

  @Get(':id/console')
  @ApiOperation({ summary: 'Get console messages' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  getConsoleMessages(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Query(new ZodValidationPipe(LogQuerySchema)) query: LogQueryInput,
  ) {
    try {
      return this.browserSessionService.getConsoleMessages(
        user.id,
        sessionId,
        query,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Delete(':id/console')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear console messages' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  clearConsoleMessages(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
  ) {
    try {
      this.browserSessionService.clearConsoleMessages(user.id, sessionId);
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Get(':id/errors')
  @ApiOperation({ summary: 'Get page errors' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  getPageErrors(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Query(new ZodValidationPipe(LogQuerySchema)) query: LogQueryInput,
  ) {
    try {
      return this.browserSessionService.getPageErrors(
        user.id,
        sessionId,
        query,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Delete(':id/errors')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear page errors' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  clearPageErrors(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
  ) {
    try {
      this.browserSessionService.clearPageErrors(user.id, sessionId);
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Post(':id/trace/start')
  @ApiOperation({ summary: 'Start tracing' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async startTrace(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(TraceStartSchema)) input: TraceStartInput,
  ) {
    try {
      return await this.browserSessionService.startTrace(
        user.id,
        sessionId,
        input,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Post(':id/trace/stop')
  @ApiOperation({ summary: 'Stop tracing' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async stopTrace(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(TraceStopSchema)) input: TraceStopInput,
  ) {
    try {
      return await this.browserSessionService.stopTrace(
        user.id,
        sessionId,
        input,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Post(':id/har/start')
  @ApiOperation({ summary: 'Start HAR recording' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async startHar(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(HarStartSchema)) input: HarStartInput,
  ) {
    try {
      return await this.browserSessionService.startHar(
        user.id,
        sessionId,
        input,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Post(':id/har/stop')
  @ApiOperation({ summary: 'Stop HAR recording' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async stopHar(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(HarStopSchema)) input: HarStopInput,
  ) {
    try {
      return await this.browserSessionService.stopHar(
        user.id,
        sessionId,
        input,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  // ==================== P2.3.1 Profile ====================

  @Post(':id/profile/save')
  @ApiOperation({ summary: 'Save profile (storage snapshot)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async saveProfile(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(SaveProfileSchema)) input: SaveProfileInput,
  ) {
    try {
      return await this.browserSessionService.saveProfile(
        user.id,
        sessionId,
        input,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Post(':id/profile/load')
  @ApiOperation({ summary: 'Load profile into session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async loadProfile(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(LoadProfileSchema)) input: LoadProfileInput,
  ) {
    try {
      return await this.browserSessionService.loadProfile(
        user.id,
        sessionId,
        input,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  // ==================== P2.3.2 Streaming ====================

  @Post(':id/stream')
  @ApiOperation({ summary: 'Create streaming token' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  createStreamToken(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(CreateStreamSchema)) input: CreateStreamInput,
  ) {
    try {
      return this.browserSessionService.createStreamToken(
        user.id,
        sessionId,
        input,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  // ==================== P2.3 会话持久化 ====================

  @Post(':id/storage/export')
  @ApiOperation({ summary: 'Export session storage (cookies, localStorage)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'Exported storage data' })
  async exportStorage(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ExportStorageSchema))
    options: ExportStorageInput,
  ) {
    try {
      return await this.browserSessionService.exportStorage(
        user.id,
        sessionId,
        options,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Post(':id/storage/import')
  @ApiOperation({ summary: 'Import session storage (cookies, localStorage)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'Import result' })
  async importStorage(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ImportStorageSchema)) data: ImportStorageInput,
  ) {
    try {
      return await this.browserSessionService.importStorage(
        user.id,
        sessionId,
        data,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Delete(':id/storage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear session storage' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async clearStorage(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
  ) {
    try {
      await this.browserSessionService.clearStorage(user.id, sessionId);
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  // ==================== P2.4 增量快照 ====================

  @Post(':id/snapshot/delta')
  @ApiOperation({
    summary: 'Get delta snapshot (incremental changes only)',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'Delta snapshot with changes' })
  async getDeltaSnapshot(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(DeltaSnapshotSchema))
    options: DeltaSnapshotInput,
  ) {
    try {
      return await this.browserSessionService.getDeltaSnapshot(
        user.id,
        sessionId,
        options,
      );
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  /**
   * 统一处理会话相关错误
   */
  private handleSessionError(error: unknown): never {
    if (error instanceof SessionNotFoundError) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }

    if (error instanceof SessionExpiredError) {
      throw new HttpException('Session expired', HttpStatus.GONE);
    }

    if (error instanceof SessionOwnershipError) {
      throw new HttpException('Session forbidden', HttpStatus.FORBIDDEN);
    }

    if (error instanceof SessionOperationNotAllowedError) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }

    if (error instanceof UrlNotAllowedError) {
      throw new HttpException('URL not allowed', HttpStatus.FORBIDDEN);
    }

    if (error instanceof BrowserUnavailableError) {
      throw new HttpException(
        'Browser capacity is currently unavailable. Please retry later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // P2.1 CDP 错误
    if (error instanceof CdpConnectionError) {
      throw new HttpException(
        'CDP connection failed',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (error instanceof CdpEndpointError) {
      throw new HttpException('Invalid CDP endpoint', HttpStatus.BAD_REQUEST);
    }

    if (error instanceof CdpPolicyError) {
      throw new HttpException(error.message, HttpStatus.FORBIDDEN);
    }

    // P2.2 网络拦截错误
    if (error instanceof InvalidInterceptRuleError) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }

    // P2.3 存储持久化错误
    if (error instanceof StorageImportError) {
      throw new HttpException('Storage import failed', HttpStatus.BAD_REQUEST);
    }

    if (error instanceof StorageExportError) {
      throw new HttpException(
        'Storage export failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (error instanceof ProfilePersistenceNotConfiguredError) {
      throw new HttpException(error.message, HttpStatus.SERVICE_UNAVAILABLE);
    }

    if (error instanceof StreamNotConfiguredError) {
      throw new HttpException(error.message, HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 重新抛出其他错误
    throw error;
  }
}
