/**
 * [PROVIDES]: UsersModule - 用户管理模块
 * [DEPENDS]: PrismaModule
 * [POS]: 用户管理 NestJS 模块
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
