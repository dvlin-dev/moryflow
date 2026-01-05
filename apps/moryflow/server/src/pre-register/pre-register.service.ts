/**
 * [INPUT]: SendOtpDto | VerifyDto
 * [OUTPUT]: void | { token, user }
 * [POS]: 预注册核心服务，负责 OTP 生成/验证、用户创建
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  Injectable,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomInt, timingSafeEqual } from 'crypto';
import { RedisService } from '../redis';
import { EmailService } from '../email';
import { PrismaService } from '../prisma';
import { AuthService } from '../auth';
import { isDisposableEmail } from '../auth/email-validator';
import { encrypt, decrypt } from './pre-register.crypto';
import type { SendOtpDto, VerifyDto } from './dto';
import type { CurrentUserDto } from '../types';

// Redis key 前缀
const REDIS_PREFIX = 'pre-register:';

// 配置常量
const OTP_TTL = 300; // 5 分钟
const MAX_ATTEMPTS = 3; // 最大验证次数
const MAX_SEND_PER_PERIOD = 10; // 每周期最多发送次数
const RATE_LIMIT_TTL = 600; // 10 分钟

// Redis 存储的 OTP 数据结构
interface StoredOtpData {
  otp: string;
  name: string;
  password: string; // 加密后的密码
  attempts: number;
}

@Injectable()
export class PreRegisterService {
  private readonly logger = new Logger(PreRegisterService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly email: EmailService,
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /**
   * 发送预注册验证码
   */
  async sendOtp(dto: SendOtpDto): Promise<void> {
    const { email, name, password } = dto;

    // 1. 检查邮箱是否已注册
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // 2. 检查临时邮箱
    if (isDisposableEmail(email)) {
      throw new BadRequestException('Disposable email is not allowed');
    }

    // 3. 检查发送频率
    const rateKey = `${REDIS_PREFIX}rate:${email}`;
    const sendCount = await this.redis.get(rateKey);
    if (sendCount && parseInt(sendCount, 10) >= MAX_SEND_PER_PERIOD) {
      throw new BadRequestException(
        'Too many requests, please try again later',
      );
    }

    // 4. 生成 OTP
    const otp = this.generateOtp();

    // 5. 加密密码并存储到 Redis
    const encryptedPassword = encrypt(password);
    const otpKey = `${REDIS_PREFIX}otp:${email}`;
    const otpData: StoredOtpData = {
      otp,
      name,
      password: encryptedPassword,
      attempts: 0,
    };
    await this.redis.set(otpKey, JSON.stringify(otpData), OTP_TTL);

    // 6. 更新发送计数
    const currentCount = await this.redis.incr(rateKey);
    if (currentCount === 1) {
      await this.redis.expire(rateKey, RATE_LIMIT_TTL);
    }

    // 7. 发送邮件（不 await，防止时序攻击）
    this.email.sendOTP(email, otp).catch((err) => {
      this.logger.error(`Failed to send OTP email to ${email}:`, err);
    });
  }

  /**
   * 验证 OTP 并完成注册
   */
  async verifyAndRegister(
    dto: VerifyDto,
  ): Promise<{ token: string; user: CurrentUserDto }> {
    const { email, otp } = dto;
    const otpKey = `${REDIS_PREFIX}otp:${email}`;
    const lockKey = `${REDIS_PREFIX}lock:${email}`;

    // 1. 获取分布式锁，防止并发注册
    const lockAcquired = await this.redis.setnx(lockKey, '1', 30);
    if (!lockAcquired) {
      throw new BadRequestException('Registration in progress, please wait');
    }

    try {
      // 2. 获取存储的 OTP 信息
      const stored = await this.redis.get(otpKey);
      if (!stored) {
        throw new BadRequestException('Verification code has expired');
      }

      const data = JSON.parse(stored) as StoredOtpData;

      // 3. 检查尝试次数
      if (data.attempts >= MAX_ATTEMPTS) {
        await this.redis.del(otpKey);
        throw new BadRequestException('Too many failed attempts');
      }

      // 4. 验证 OTP（使用时间安全比较）
      if (!this.verifyOtpSafe(data.otp, otp)) {
        data.attempts += 1;
        await this.redis.set(otpKey, JSON.stringify(data), OTP_TTL);
        throw new BadRequestException('Invalid verification code');
      }

      // 5. 解密密码
      const password = decrypt(data.password);

      // 6. 调用 Better Auth 创建用户
      const auth = this.auth.getAuth();
      const result = await auth.api.signUpEmail({
        returnHeaders: true,
        body: {
          email,
          password,
          name: data.name,
        },
      });

      this.logger.debug(
        `signUpEmail result: ${JSON.stringify({
          hasHeaders: !!result.headers,
          hasResponse: !!result.response,
          responseKeys: result.response ? Object.keys(result.response) : [],
        })}`,
      );

      // 7. 从响应中提取 token（优先从 response 获取，其次从 headers）
      const token =
        result.response?.token || result.headers?.get('set-auth-token') || '';
      const user = result.response?.user;

      if (!token) {
        this.logger.error('No token returned from signUpEmail');
        throw new BadRequestException('Failed to create session');
      }

      if (!user) {
        this.logger.error('No user returned from signUpEmail');
        throw new BadRequestException('Failed to create user');
      }

      // 8. 标记邮箱为已验证（因为已通过 OTP 验证）
      await this.prisma.user.update({
        where: { email },
        data: { emailVerified: true },
      });

      // 9. 删除 Redis 记录
      await this.redis.del(otpKey);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: 'free',
          isAdmin: false,
        },
      };
    } finally {
      // 释放锁
      await this.redis.del(lockKey);
    }
  }

  /**
   * 生成 6 位数字验证码
   * 使用 crypto.randomInt 确保密码学安全
   */
  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  /**
   * 时间安全的 OTP 比较
   * 防止时序攻击
   */
  private verifyOtpSafe(stored: string, provided: string): boolean {
    if (stored.length !== provided.length) {
      return false;
    }
    return timingSafeEqual(Buffer.from(stored), Buffer.from(provided));
  }
}
