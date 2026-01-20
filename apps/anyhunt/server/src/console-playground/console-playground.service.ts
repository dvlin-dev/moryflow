/**
 * Console Playground Service
 * 验证 apiKeyId 所有权，代理请求到实际服务
 * 所有抓取类操作强制使用同步模式，直接返回结果
 * Agent 相关请求会先校验 ApiKey 的 LLM 策略（llmEnabled/provider/model），避免无效调用产生成本
 *
 * [INPUT]: apiKeyId + 各服务的请求参数
 * [OUTPUT]: 各服务的响应（同步模式返回完整结果）
 * [POS]: 供 console-playground.controller.ts 使用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperService } from '../scraper/scraper.service';
import { CrawlerService } from '../crawler/crawler.service';
import { SearchService } from '../search/search.service';
import { MapService } from '../map/map.service';
import { ExtractService } from '../extract/extract.service';
import { BrowserSessionService } from '../browser/browser-session.service';
import { AgentService } from '../agent/agent.service';
import type { ScrapeOptions } from '../scraper/dto/scrape.dto';
import type { CrawlOptions } from '../crawler/dto/crawl.dto';
import type { SearchOptions } from '../search/dto/search.dto';
import type { MapOptions } from '../map/dto/map.dto';
import type { ExtractOptions } from '../extract/dto/extract.dto';
import type {
  CreateSessionInput,
  OpenUrlInput,
  SnapshotInput,
  DeltaSnapshotInput,
  ActionInput,
  ScreenshotInput,
  CreateWindowInput,
  ConnectCdpInput,
  InterceptRule,
  ExportStorageInput,
  ImportStorageInput,
  NetworkRequestRecord,
} from '../browser/dto';
import type { CreateAgentTaskInput, AgentStreamEvent } from '../agent/dto';

@Injectable()
export class ConsolePlaygroundService {
  private readonly logger = new Logger(ConsolePlaygroundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraperService: ScraperService,
    private readonly crawlerService: CrawlerService,
    private readonly searchService: SearchService,
    private readonly mapService: MapService,
    private readonly extractService: ExtractService,
    private readonly browserSessionService: BrowserSessionService,
    private readonly agentService: AgentService,
  ) {}

  /**
   * 验证 apiKeyId 属于当前用户
   * @returns ApiKey LLM policy fields (用于 Agent 模型选择)
   */
  private async validateApiKeyOwnership(
    userId: string,
    apiKeyId: string,
  ): Promise<{
    id: string;
    llmEnabled: boolean;
    llmProviderId: string;
    llmModelId: string;
  }> {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        userId,
      },
      select: {
        id: true,
        isActive: true,
        expiresAt: true,
        llmEnabled: true,
        llmProviderId: true,
        llmModelId: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (!apiKey.isActive) {
      throw new ForbiddenException('API key is inactive');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new ForbiddenException('API key has expired');
    }

    return {
      id: apiKey.id,
      llmEnabled: apiKey.llmEnabled ?? true,
      llmProviderId: apiKey.llmProviderId ?? 'openai',
      llmModelId: apiKey.llmModelId ?? 'gpt-4o',
    };
  }

  /**
   * Scrape 代理（强制同步模式）
   */
  async scrape(userId: string, apiKeyId: string, options: ScrapeOptions) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    this.logger.log(`Console scrape: user=${userId}, apiKey=${apiKeyId}`);
    return this.scraperService.scrape(userId, { ...options, sync: true });
  }

  /**
   * Crawl 代理（强制同步模式）
   */
  async crawl(userId: string, apiKeyId: string, options: CrawlOptions) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    this.logger.log(`Console crawl: user=${userId}, apiKey=${apiKeyId}`);
    return this.crawlerService.startCrawl(userId, { ...options, sync: true });
  }

  /**
   * 获取 Crawl 状态
   */
  async getCrawlStatus(userId: string, apiKeyId: string, jobId: string) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.crawlerService.getStatus(jobId);
  }

  /**
   * 取消 Crawl 任务
   */
  async cancelCrawl(userId: string, apiKeyId: string, jobId: string) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.crawlerService.cancelCrawl(jobId);
  }

  /**
   * Search 代理
   */
  async search(userId: string, apiKeyId: string, options: SearchOptions) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    this.logger.log(`Console search: user=${userId}, apiKey=${apiKeyId}`);
    return this.searchService.search(userId, options);
  }

  /**
   * Map 代理
   */
  async map(userId: string, apiKeyId: string, options: MapOptions) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    this.logger.log(`Console map: user=${userId}, apiKey=${apiKeyId}`);
    return this.mapService.map(userId, options);
  }

  /**
   * Extract 代理
   */
  async extract(userId: string, apiKeyId: string, options: ExtractOptions) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    this.logger.log(`Console extract: user=${userId}, apiKey=${apiKeyId}`);
    return this.extractService.extract(userId, options);
  }

  // ==================== Browser Playground ====================

  async createBrowserSession(
    userId: string,
    apiKeyId: string,
    options?: Partial<CreateSessionInput>,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    this.logger.log(
      `Console browser session create: user=${userId}, apiKey=${apiKeyId}`,
    );
    return this.browserSessionService.createSession(userId, options);
  }

  async getBrowserSessionStatus(
    userId: string,
    apiKeyId: string,
    sessionId: string,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.getSessionStatus(userId, sessionId);
  }

  async closeBrowserSession(
    userId: string,
    apiKeyId: string,
    sessionId: string,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.closeSession(userId, sessionId);
  }

  async openBrowserUrl(
    userId: string,
    apiKeyId: string,
    sessionId: string,
    options: OpenUrlInput,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.openUrl(userId, sessionId, options);
  }

  async getBrowserSnapshot(
    userId: string,
    apiKeyId: string,
    sessionId: string,
    options?: Partial<SnapshotInput>,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.getSnapshot(userId, sessionId, options);
  }

  async getBrowserDeltaSnapshot(
    userId: string,
    apiKeyId: string,
    sessionId: string,
    options?: Partial<DeltaSnapshotInput>,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.getDeltaSnapshot(
      userId,
      sessionId,
      options,
    );
  }

  async executeBrowserAction(
    userId: string,
    apiKeyId: string,
    sessionId: string,
    action: ActionInput,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.executeAction(userId, sessionId, action);
  }

  async getBrowserScreenshot(
    userId: string,
    apiKeyId: string,
    sessionId: string,
    options?: Partial<ScreenshotInput>,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.getScreenshot(userId, sessionId, options);
  }

  async createBrowserTab(userId: string, apiKeyId: string, sessionId: string) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.createTab(userId, sessionId);
  }

  async listBrowserTabs(userId: string, apiKeyId: string, sessionId: string) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.listTabs(userId, sessionId);
  }

  async switchBrowserTab(
    userId: string,
    apiKeyId: string,
    sessionId: string,
    tabIndex: number,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.switchTab(userId, sessionId, tabIndex);
  }

  async closeBrowserTab(
    userId: string,
    apiKeyId: string,
    sessionId: string,
    tabIndex: number,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.closeTab(userId, sessionId, tabIndex);
  }

  async getBrowserDialogHistory(
    userId: string,
    apiKeyId: string,
    sessionId: string,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.getDialogHistory(userId, sessionId);
  }

  async createBrowserWindow(
    userId: string,
    apiKeyId: string,
    sessionId: string,
    options?: CreateWindowInput,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.createWindow(userId, sessionId, options);
  }

  async listBrowserWindows(
    userId: string,
    apiKeyId: string,
    sessionId: string,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.listWindows(userId, sessionId);
  }

  async switchBrowserWindow(
    userId: string,
    apiKeyId: string,
    sessionId: string,
    windowIndex: number,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.switchWindow(
      userId,
      sessionId,
      windowIndex,
    );
  }

  async closeBrowserWindow(
    userId: string,
    apiKeyId: string,
    sessionId: string,
    windowIndex: number,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.closeWindow(
      userId,
      sessionId,
      windowIndex,
    );
  }

  async connectBrowserCdp(
    userId: string,
    apiKeyId: string,
    options: ConnectCdpInput,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.connectCdp(userId, options);
  }

  async setBrowserInterceptRules(
    userId: string,
    apiKeyId: string,
    sessionId: string,
    rules: InterceptRule[],
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.setInterceptRules(
      userId,
      sessionId,
      rules,
    );
  }

  async addBrowserInterceptRule(
    userId: string,
    apiKeyId: string,
    sessionId: string,
    rule: InterceptRule,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.addInterceptRule(userId, sessionId, rule);
  }

  async removeBrowserInterceptRule(
    userId: string,
    apiKeyId: string,
    sessionId: string,
    ruleId: string,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.removeInterceptRule(
      userId,
      sessionId,
      ruleId,
    );
  }

  async clearBrowserInterceptRules(
    userId: string,
    apiKeyId: string,
    sessionId: string,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.clearInterceptRules(userId, sessionId);
  }

  async getBrowserInterceptRules(
    userId: string,
    apiKeyId: string,
    sessionId: string,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.getInterceptRules(userId, sessionId);
  }

  async getBrowserNetworkHistory(
    userId: string,
    apiKeyId: string,
    sessionId: string,
    options?: { limit?: number; urlFilter?: string },
  ): Promise<NetworkRequestRecord[]> {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.getNetworkHistory(
      userId,
      sessionId,
      options,
    );
  }

  async clearBrowserNetworkHistory(
    userId: string,
    apiKeyId: string,
    sessionId: string,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.clearNetworkHistory(userId, sessionId);
  }

  async exportBrowserStorage(
    userId: string,
    apiKeyId: string,
    sessionId: string,
    options?: ExportStorageInput,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.exportStorage(userId, sessionId, options);
  }

  async importBrowserStorage(
    userId: string,
    apiKeyId: string,
    sessionId: string,
    data: ImportStorageInput,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.importStorage(userId, sessionId, data);
  }

  async clearBrowserStorage(
    userId: string,
    apiKeyId: string,
    sessionId: string,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.browserSessionService.clearStorage(userId, sessionId);
  }

  // ==================== Agent Playground ====================

  async assertAgentLlmPolicy(userId: string, apiKeyId: string): Promise<void> {
    const apiKey = await this.validateApiKeyOwnership(userId, apiKeyId);
    this.agentService.resolveLlmPolicyForApiKey(apiKey);
  }

  async estimateAgentCost(
    userId: string,
    apiKeyId: string,
    input: CreateAgentTaskInput,
  ) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.agentService.estimateCost(input);
  }

  async executeAgentTask(
    userId: string,
    apiKeyId: string,
    input: CreateAgentTaskInput,
  ) {
    const apiKey = await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.agentService.executeTask(input, userId, apiKey);
  }

  async *executeAgentTaskStream(
    userId: string,
    apiKeyId: string,
    input: CreateAgentTaskInput,
  ): AsyncGenerator<AgentStreamEvent, void, unknown> {
    const apiKey = await this.validateApiKeyOwnership(userId, apiKeyId);
    yield* this.agentService.executeTaskStream(input, userId, apiKey);
  }

  async getAgentTaskStatus(userId: string, apiKeyId: string, taskId: string) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.agentService.getTaskStatus(taskId, userId);
  }

  async cancelAgentTask(userId: string, apiKeyId: string, taskId: string) {
    await this.validateApiKeyOwnership(userId, apiKeyId);
    return this.agentService.cancelTask(taskId, userId);
  }
}
