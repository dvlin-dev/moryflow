import {
  Controller,
  Get,
  Post,
  Body,
  Ip,
  Headers,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import { DemoService } from './demo.service';
import {
  demoScreenshotSchema,
  demoScrapeSchema,
  demoMapSchema,
  demoCrawlSchema,
  demoExtractSchema,
  demoSearchSchema,
  type DemoScreenshotResponse,
  type DemoScrapeResponse,
  type DemoMapResponse,
  type DemoCrawlResponse,
  type DemoExtractResponse,
  type DemoSearchResponse,
} from './demo.dto';

/**
 * Demo 控制器
 * 提供官网 Playground 的演示 API
 */
@ApiTags('Demo')
@Controller({ path: 'demo', version: '1' })
@Public()
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  /**
   * 获取客户端 IP
   */
  private getClientIp(
    fallbackIp: string,
    cfIp?: string,
    realIp?: string,
    forwardedFor?: string,
  ): string {
    return (
      cfIp?.trim() ||
      realIp?.trim() ||
      forwardedFor?.split(',')[0]?.trim() ||
      fallbackIp
    );
  }

  /**
   * 检查 IP 验证状态
   */
  @Get('verify-status')
  @HttpCode(HttpStatus.OK)
  async verifyStatus(
    @Ip() fallbackIp: string,
    @Headers('cf-connecting-ip') cfIp?: string,
    @Headers('x-real-ip') realIp?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<{ verified: boolean }> {
    const clientIp = this.getClientIp(fallbackIp, cfIp, realIp, forwardedFor);
    const verified = await this.demoService.isIpVerified(clientIp);
    return { verified };
  }

  /**
   * 通用的预处理：验证请求、检查限流、验证 captcha
   */
  private async preprocess<T>(
    body: unknown,
    schema: {
      safeParse: (data: unknown) => {
        success: boolean;
        data?: T;
        error?: { issues: { message: string }[] };
      };
    },
    clientIp: string,
  ): Promise<T> {
    // 1. 验证请求体
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        message: parseResult.error?.issues[0]?.message || 'Invalid request',
      });
    }

    // 2. IP 限流检查
    const ipAllowed = await this.demoService.checkIpRateLimit(clientIp);
    if (!ipAllowed) {
      throw new BadRequestException({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please wait a moment and try again.',
      });
    }

    // 3. 验证码校验（已验证的 IP 跳过）
    const isVerified = await this.demoService.isIpVerified(clientIp);
    if (!isVerified) {
      const data = parseResult.data as T & { captcha?: string };
      if (data.captcha) {
        const valid = await this.demoService.verifyCaptcha(data.captcha);
        if (!valid) {
          throw new BadRequestException({
            code: 'CAPTCHA_INVALID',
            message: 'Captcha verification failed',
          });
        }
        // 验证成功，标记 IP 为已验证
        await this.demoService.markIpAsVerified(clientIp);
      } else {
        // 未验证且没有提供 captcha token
        throw new BadRequestException({
          code: 'CAPTCHA_REQUIRED',
          message: 'Captcha verification required',
        });
      }
    }

    return parseResult.data as T;
  }

  /**
   * 执行演示截图
   */
  @Post('screenshot')
  @HttpCode(HttpStatus.OK)
  async screenshot(
    @Body() body: unknown,
    @Ip() fallbackIp: string,
    @Headers('cf-connecting-ip') cfIp?: string,
    @Headers('x-real-ip') realIp?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<DemoScreenshotResponse> {
    const clientIp = this.getClientIp(fallbackIp, cfIp, realIp, forwardedFor);
    const data = await this.preprocess(body, demoScreenshotSchema, clientIp);
    const result = await this.demoService.captureScreenshot(data.url);
    await this.demoService.incrementHourlyCount();
    return result;
  }

  /**
   * 执行演示抓取
   */
  @Post('scrape')
  @HttpCode(HttpStatus.OK)
  async scrape(
    @Body() body: unknown,
    @Ip() fallbackIp: string,
    @Headers('cf-connecting-ip') cfIp?: string,
    @Headers('x-real-ip') realIp?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<DemoScrapeResponse> {
    const clientIp = this.getClientIp(fallbackIp, cfIp, realIp, forwardedFor);
    const data = await this.preprocess(body, demoScrapeSchema, clientIp);
    const result = await this.demoService.scrape(
      data.url,
      data.formats,
      data.onlyMainContent,
    );
    await this.demoService.incrementHourlyCount();
    return result;
  }

  /**
   * 执行演示 Map
   */
  @Post('map')
  @HttpCode(HttpStatus.OK)
  async map(
    @Body() body: unknown,
    @Ip() fallbackIp: string,
    @Headers('cf-connecting-ip') cfIp?: string,
    @Headers('x-real-ip') realIp?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<DemoMapResponse> {
    const clientIp = this.getClientIp(fallbackIp, cfIp, realIp, forwardedFor);
    const data = await this.preprocess(body, demoMapSchema, clientIp);
    const result = await this.demoService.map(
      data.url,
      data.search,
      data.includeSubdomains,
    );
    await this.demoService.incrementHourlyCount();
    return result;
  }

  /**
   * 执行演示 Crawl
   */
  @Post('crawl')
  @HttpCode(HttpStatus.OK)
  async crawl(
    @Body() body: unknown,
    @Ip() fallbackIp: string,
    @Headers('cf-connecting-ip') cfIp?: string,
    @Headers('x-real-ip') realIp?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<DemoCrawlResponse> {
    const clientIp = this.getClientIp(fallbackIp, cfIp, realIp, forwardedFor);
    const data = await this.preprocess(body, demoCrawlSchema, clientIp);
    const result = await this.demoService.crawl(
      data.url,
      data.maxDepth,
      data.limit,
    );
    await this.demoService.incrementHourlyCount();
    return result;
  }

  /**
   * 执行演示 Extract
   */
  @Post('extract')
  @HttpCode(HttpStatus.OK)
  async extract(
    @Body() body: unknown,
    @Ip() fallbackIp: string,
    @Headers('cf-connecting-ip') cfIp?: string,
    @Headers('x-real-ip') realIp?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<DemoExtractResponse> {
    const clientIp = this.getClientIp(fallbackIp, cfIp, realIp, forwardedFor);
    const data = await this.preprocess(body, demoExtractSchema, clientIp);
    const result = await this.demoService.extract(
      data.url,
      data.prompt,
      data.schema,
    );
    await this.demoService.incrementHourlyCount();
    return result;
  }

  /**
   * 执行演示 Search
   */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Body() body: unknown,
    @Ip() fallbackIp: string,
    @Headers('cf-connecting-ip') cfIp?: string,
    @Headers('x-real-ip') realIp?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<DemoSearchResponse> {
    const clientIp = this.getClientIp(fallbackIp, cfIp, realIp, forwardedFor);
    const data = await this.preprocess(body, demoSearchSchema, clientIp);
    const result = await this.demoService.search(data.query, data.limit);
    await this.demoService.incrementHourlyCount();
    return result;
  }
}
