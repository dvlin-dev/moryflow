/**
 * Admin Auth Controller
 *
 * [INPUT]: Admin login credentials
 * [OUTPUT]: Auth token and user info
 * [POS]: Admin API for authentication
 */

import {
  Controller,
  Post,
  Body,
  Req,
  UnauthorizedException,
  ForbiddenException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiNoContentResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { PrismaService } from '../prisma';
import { Public } from '../auth';
import * as bcrypt from 'bcryptjs';
import { AdminLoginDto } from './dto';

@ApiTags('Admin')
@Controller({ path: 'admin', version: VERSION_NEUTRAL })
export class AdminAuthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Admin login
   */
  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  @ApiOkResponse({ description: 'Login successful' })
  async login(@Body() dto: AdminLoginDto) {
    const { email, password } = dto;

    // Find user and account info
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

    // Check if admin
    if (!user.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    // Check if deleted
    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deleted');
    }

    // Verify password
    const account = user.accounts[0];
    if (!account.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, account.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Create session token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const token = this.generateToken();

    await this.prisma.session.create({
      data: {
        id: this.generateId(),
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
   * Admin logout
   */
  @Post('logout')
  @ApiOperation({ summary: 'Admin logout' })
  @ApiNoContentResponse({ description: 'Logout successful' })
  async logout(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await this.prisma.session.deleteMany({
        where: { token },
      });
    }

    return null;
  }

  private generateToken(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateId(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
