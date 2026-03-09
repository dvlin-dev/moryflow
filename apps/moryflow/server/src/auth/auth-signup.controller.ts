import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpException,
  Post,
  Req,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { Public } from './decorators';
import { AuthSignupService } from './auth-signup.service';
import { AuthTokensService } from './auth.tokens.service';
import {
  completeEmailSignUpSchema,
  startEmailSignUpSchema,
  verifyEmailSignUpOTPSchema,
} from './dto/auth-signup.dto';
import { ManagedAuthFlowError } from './auth.service';

@Controller({ path: 'auth', version: '1' })
export class AuthSignupController {
  constructor(
    private readonly authSignupService: AuthSignupService,
    private readonly authTokensService: AuthTokensService,
  ) {}

  @Public()
  @Post('sign-up/email')
  @HttpCode(410)
  rejectLegacyEmailSignUp(): never {
    throw new HttpException(
      {
        code: 'LEGACY_SIGN_UP_DISABLED',
        message: 'Use the new multi-step email sign-up flow.',
      },
      410,
    );
  }

  @Public()
  @Post('sign-up/email/start')
  async startEmailSignUp(
    @Req() req: ExpressRequest,
    @Body() body: unknown,
  ): Promise<{ success: true }> {
    const parsed = startEmailSignUpSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    await this.applyRateLimit('/api/v1/auth/sign-up/email/start', req);
    await this.authSignupService.startEmailSignUp(parsed.data.email);
    return { success: true };
  }

  @Public()
  @Post('sign-up/email/verify-otp')
  async verifyEmailSignUpOTP(
    @Req() req: ExpressRequest,
    @Body() body: unknown,
  ): Promise<{ signupToken: string; signupTokenExpiresAt: string }> {
    const parsed = verifyEmailSignUpOTPSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    await this.applyRateLimit('/api/v1/auth/sign-up/email/verify-otp', req);
    return this.authSignupService.verifyEmailSignUpOTP(
      parsed.data.email,
      parsed.data.otp,
    );
  }

  @Public()
  @Post('sign-up/email/complete')
  async completeEmailSignUp(
    @Req() req: ExpressRequest,
    @Body() body: unknown,
  ): Promise<{
    status: true;
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
    user: {
      id: string;
      email: string;
      emailVerified: boolean;
      name: string;
    };
  }> {
    const parsed = completeEmailSignUpSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    await this.applyRateLimit('/api/v1/auth/sign-up/email/complete', req);
    const result = await this.authSignupService.completeEmailSignUp(
      parsed.data.signupToken,
      parsed.data.password,
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.authTokensService.createAccessToken(result.user.id),
      this.authTokensService.issueRefreshToken(result.user.id, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? null,
      }),
    ]);

    return {
      status: true,
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt.toISOString(),
      refreshToken: refreshToken.token,
      refreshTokenExpiresAt: refreshToken.expiresAt.toISOString(),
      user: result.user,
    };
  }

  private async applyRateLimit(
    pathname: string,
    req: ExpressRequest,
  ): Promise<void> {
    try {
      await this.authSignupService.assertManagedAuthRateLimit(
        pathname,
        req.ip ?? 'unknown',
      );
    } catch (error) {
      if (error instanceof ManagedAuthFlowError) {
        throw new HttpException(
          { code: error.code, message: error.message },
          error.status,
        );
      }
      throw error;
    }
  }
}
