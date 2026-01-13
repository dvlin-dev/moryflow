/**
 * Browser Session Controller
 *
 * [INPUT]: L2 Browser API 请求
 * [OUTPUT]: 会话信息、快照、操作结果
 * [POS]: L2 Browser API 控制器，路由 /api/v1/browser/*
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
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
import { Public } from '../auth';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { BillingKey } from '../billing/billing.decorators';
import {
  BrowserSessionService,
  UrlNotAllowedError,
} from './browser-session.service';
import { SessionNotFoundError, SessionExpiredError } from './session';
import {
  CreateSessionSchema,
  OpenUrlSchema,
  SnapshotSchema,
  ActionSchema,
  ScreenshotSchema,
  type CreateSessionInput,
  type OpenUrlInput,
  type SnapshotInput,
  type ActionInput,
  type ScreenshotInput,
} from './dto';

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
    @Body(new ZodValidationPipe(CreateSessionSchema))
    options: CreateSessionInput,
  ) {
    return this.browserSessionService.createSession(options);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session status' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'Session status' })
  @ApiNotFoundResponse({ description: 'Session not found or expired' })
  async getSessionStatus(@Param('id') sessionId: string) {
    try {
      return await this.browserSessionService.getSessionStatus(sessionId);
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Close a browser session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async closeSession(@Param('id') sessionId: string) {
    await this.browserSessionService.closeSession(sessionId);
  }

  @Post(':id/open')
  @ApiOperation({ summary: 'Open a URL in the session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'URL opened successfully' })
  async openUrl(
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(OpenUrlSchema)) options: OpenUrlInput,
  ) {
    try {
      return await this.browserSessionService.openUrl(sessionId, options);
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
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(SnapshotSchema)) options: SnapshotInput,
  ) {
    try {
      return await this.browserSessionService.getSnapshot(sessionId, options);
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Post(':id/action')
  @ApiOperation({ summary: 'Execute an action in the session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'Action result' })
  async executeAction(
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ActionSchema)) action: ActionInput,
  ) {
    try {
      return await this.browserSessionService.executeAction(sessionId, action);
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  @Get(':id/screenshot')
  @ApiOperation({ summary: 'Take a screenshot of the page' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiOkResponse({ description: 'Screenshot data' })
  @BillingKey('fetchx.browser.screenshot')
  async getScreenshot(
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(ScreenshotSchema)) options: ScreenshotInput,
  ) {
    try {
      return await this.browserSessionService.getScreenshot(sessionId, options);
    } catch (error) {
      this.handleSessionError(error);
    }
  }

  /**
   * 统一处理会话相关错误
   */
  private handleSessionError(error: unknown): never {
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

    if (error instanceof UrlNotAllowedError) {
      throw new HttpException(
        { error: 'URL not allowed', message: error.message },
        HttpStatus.FORBIDDEN,
      );
    }

    // 重新抛出其他错误
    throw error;
  }
}
