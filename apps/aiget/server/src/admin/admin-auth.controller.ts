/**
 * Admin Auth Controller
 * 管理员认证 API
 */

import {
  Controller,
  Post,
  Body,
  Req,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { PrismaService } from '../prisma';
import { Public } from '../auth';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { generateSecureToken, generateSecureId } from '../common/utils';
import { adminLoginSchema, type AdminLoginDto } from './dto';
import * as bcrypt from 'bcryptjs';

/** Session 过期时间：7 天（毫秒） */
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

@ApiTags('Admin')
@Controller({ path: 'admin', version: '1' })
export class AdminAuthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 管理员登录
   * POST /api/admin/login
   */
  @Public()
  @ApiOperation({ summary: '管理员登录' })
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(adminLoginSchema)) dto: AdminLoginDto,
  ) {
    const { email, password } = dto;

    // 查找用户和账户信息
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        accounts: {
          where: { providerId: 'credential' },
        },
      },
    });

    if (!user || !user.accounts.length) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 检查是否是管理员
    if (!user.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    // 检查用户是否已删除
    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deleted');
    }

    // 验证密码
    const account = user.accounts[0];
    if (!account.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, account.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 创建 session token
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);
    const token = generateSecureToken();

    await this.prisma.session.create({
      data: {
        id: generateSecureId(),
        token,
        userId: user.id,
        expiresAt,
        ipAddress: null,
        userAgent: null,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      },
      token,
    };
  }

  /**
   * 管理员登出
   * POST /api/admin/logout
   */
  @Post('logout')
  async logout(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await this.prisma.session.deleteMany({
        where: { token },
      });
    }

    return { message: 'Logout successful' };
  }
}
