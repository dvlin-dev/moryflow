/**
 * [DEFINES]: PreRegisterModule - 预注册模块
 * [USED_BY]: AppModule
 * [POS]: 提供预注册相关功能的 NestJS 模块
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Module } from '@nestjs/common';
import { PreRegisterController } from './pre-register.controller';
import { PreRegisterService } from './pre-register.service';
import { RedisModule } from '../redis';
import { EmailModule } from '../email';
import { PrismaModule } from '../prisma';
import { AuthModule } from '../auth';

@Module({
  imports: [RedisModule, EmailModule, PrismaModule, AuthModule],
  controllers: [PreRegisterController],
  providers: [PreRegisterService],
})
export class PreRegisterModule {}
