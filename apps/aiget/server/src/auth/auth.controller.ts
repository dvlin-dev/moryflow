import { All, Controller, Req, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators';
import { SkipResponseWrap } from '../common/decorators';

/**
 * Better Auth 路由控制器
 * 处理 /api/auth/* 的所有请求
 */
@ApiTags('Auth')
@Controller({ path: 'auth', version: VERSION_NEUTRAL })
@SkipResponseWrap()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiExcludeEndpoint()
  @Public()
  @All('*')
  async handleAuth(
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ): Promise<void> {
    const auth = this.authService.getAuth();

    // 构建 Web Request 对象
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers.set(key, value);
      } else if (Array.isArray(value)) {
        headers.set(key, value.join(', '));
      }
    }

    const webRequest = new Request(url, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method)
        ? undefined
        : JSON.stringify(req.body),
    });

    const response = await auth.handler(webRequest);

    // 复制 Better Auth 响应到 Express Response
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.status(response.status);

    if (response.body) {
      const body = await response.text();
      res.send(body);
    } else {
      res.end();
    }
  }
}
