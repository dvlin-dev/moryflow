/**
 * [INPUT]: /api/auth/* 的原始请求（包含 rawBody）
 * [OUTPUT]: Better Auth 统一响应透传
 * [POS]: Better Auth 的 NestJS 入口适配层
 */
import { All, Controller, Req, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators';
import { applyAuthResponse, buildAuthRequest } from './auth.handler.utils';

/**
 * Better Auth 路由控制器
 * 处理 /api/auth/* 的所有请求（不带版本号，因为 Better Auth 使用固定路径）
 */
@ApiTags('Auth')
@Controller({ path: 'auth', version: VERSION_NEUTRAL })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiExcludeEndpoint()
  @Public()
  @All('*path')
  async handleAuth(
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ): Promise<void> {
    const auth = this.authService.getAuth();

    const response = await auth.handler(buildAuthRequest(req));
    await applyAuthResponse(res, response);
  }
}
