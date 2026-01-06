/**
 * [INPUT]: HTTP Request
 * [OUTPUT]: HTTP Response
 * [POS]: 预注册 API 入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  Controller,
  Post,
  Body,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../auth';
import { PreRegisterService } from './pre-register.service';
import { sendOtpSchema, verifySchema } from './dto';
import type { CurrentUserDto } from '../types';

@Controller('api/pre-register')
export class PreRegisterController {
  constructor(private readonly preRegisterService: PreRegisterService) {}

  /**
   * 发送预注册验证码
   * POST /api/pre-register/send-otp
   */
  @Public()
  @Post('send-otp')
  async sendOtp(@Body() body: unknown): Promise<void> {
    // 使用 Zod 验证请求体
    const parsed = sendOtpSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    await this.preRegisterService.sendOtp(parsed.data);
  }

  /**
   * 验证 OTP 并完成注册
   * POST /api/pre-register/verify
   */
  @Public()
  @Post('verify')
  async verify(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ token: string; user: CurrentUserDto }> {
    // 使用 Zod 验证请求体
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    const result = await this.preRegisterService.verifyAndRegister(parsed.data);

    // 设置响应头（客户端可从此获取 token）
    res.setHeader('set-auth-token', result.token);

    return result;
  }
}
