/**
 * [PROVIDES]: PrismaClient instance with PostgreSQL adapter
 * [DEPENDS]: DATABASE_URL environment variable, @prisma/adapter-pg
 * [POS]: Database access layer - wraps Prisma with connection lifecycle management
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and apps/server/CLAUDE.md
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
