/**
 * [INPUT]: refresh token / access token / userId
 * [OUTPUT]: accessToken 与 refreshToken 的签发/校验结果
 * [POS]: Auth Token 核心服务（access/refresh/JWKS）
 */

import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import type { JwtOptions } from 'better-auth/plugins/jwt';
import type { JWTPayload } from 'jose';
import { PrismaService } from '../prisma';
import { AuthService } from './auth.service';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_BYTES,
  REFRESH_TOKEN_TTL_SECONDS,
} from './auth.constants';
import { getAuthBaseUrl, getJwtPluginOptions } from './auth.config';
import type { CurrentUserDto } from '../types';

type RefreshTokenMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

type AccessTokenPayload = JWTPayload & {
  tokenType?: string;
};

@Injectable()
export class AuthTokensService {
  private readonly jwtOptions: JwtOptions =
    getJwtPluginOptions(getAuthBaseUrl());

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async createAccessToken(userId: string): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    const auth = this.authService.getAuth();
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = new Date((issuedAt + ACCESS_TOKEN_TTL_SECONDS) * 1000);

    const { token } = await auth.api.signJWT({
      body: {
        payload: {
          sub: userId,
          iat: issuedAt,
          exp: Math.floor(expiresAt.getTime() / 1000),
          jti: randomBytes(16).toString('hex'),
          tokenType: 'access',
        },
        overrideOptions: this.jwtOptions,
      },
    });

    return { token, expiresAt };
  }

  async verifyAccessToken(token: string): Promise<{
    session: { id: string; tokenType?: 'access'; expiresAt: Date };
    user: CurrentUserDto;
  } | null> {
    const payload = await this.verifyJwtPayload(token);
    const tokenType = payload?.tokenType;
    if (!payload?.sub || tokenType !== 'access') {
      return null;
    }

    const exp = payload.exp;
    if (!exp || exp * 1000 <= Date.now()) {
      return null;
    }

    const user = await this.getUserSnapshot(String(payload.sub));
    if (!user) {
      return null;
    }

    const expiresAt = new Date(exp * 1000);

    return {
      session: {
        id: String(payload.jti ?? payload.sub),
        tokenType: 'access',
        expiresAt,
      },
      user,
    };
  }

  async issueRefreshToken(
    userId: string,
    meta: RefreshTokenMeta,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = this.generateRefreshToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    return { token, expiresAt };
  }

  async rotateRefreshToken(
    rawToken: string,
    meta: RefreshTokenMeta,
  ): Promise<{
    user: CurrentUserDto;
    refreshToken: { token: string; expiresAt: Date };
  } | null> {
    const tokenHash = this.hashToken(rawToken);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.refreshToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          userId: true,
          expiresAt: true,
          revokedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              isAdmin: true,
              deletedAt: true,
              subscription: { select: { tier: true } },
            },
          },
        },
      });

      if (!record) {
        return null;
      }

      if (record.revokedAt || record.expiresAt <= now) {
        await tx.refreshToken.update({
          where: { id: record.id },
          data: { revokedAt: record.revokedAt ?? now },
        });
        return null;
      }

      if (record.user.deletedAt) {
        await tx.refreshToken.updateMany({
          where: { userId: record.userId, revokedAt: null },
          data: { revokedAt: now },
        });
        return null;
      }

      const refreshToken = this.generateRefreshToken();
      const refreshTokenHash = this.hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

      const newToken = await tx.refreshToken.create({
        data: {
          userId: record.userId,
          tokenHash: refreshTokenHash,
          expiresAt,
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        },
      });

      const rotation = await tx.refreshToken.updateMany({
        where: {
          id: record.id,
          revokedAt: null,
          replacedById: null,
          expiresAt: { gte: now },
        },
        data: {
          revokedAt: now,
          replacedById: newToken.id,
        },
      });

      if (rotation.count === 0) {
        await tx.refreshToken.update({
          where: { id: newToken.id },
          data: { revokedAt: now },
        });
        return null;
      }

      return {
        user: {
          id: record.user.id,
          email: record.user.email,
          name: record.user.name,
          subscriptionTier: record.user.subscription?.tier ?? 'free',
          isAdmin: record.user.isAdmin,
        },
        refreshToken: { token: refreshToken, expiresAt },
      };
    });
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async verifyJwtPayload(
    token: string,
  ): Promise<AccessTokenPayload | null> {
    const auth = this.authService.getAuth();
    try {
      const result = await auth.api.verifyJWT({
        body: { token },
      });
      return result.payload ? (result.payload as AccessTokenPayload) : null;
    } catch {
      return null;
    }
  }

  private async getUserSnapshot(
    userId: string,
  ): Promise<CurrentUserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        deletedAt: true,
        subscription: {
          select: { tier: true },
        },
      },
    });

    if (!user || user.deletedAt) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      subscriptionTier: user.subscription?.tier ?? 'free',
      isAdmin: user.isAdmin,
    };
  }

  private generateRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
