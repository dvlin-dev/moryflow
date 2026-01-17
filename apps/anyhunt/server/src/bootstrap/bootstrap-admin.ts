/**
 * [INPUT]: ENV(ADMIN_EMAIL/ADMIN_PASSWORD) + Prisma(User/Account)
 * [OUTPUT]: 确保指定邮箱存在可用的管理员账号（isAdmin=true + credential password hash）
 * [POS]: 启动期 bootstrap（避免依赖 prisma seed；用于 admin.anyhunt.app 登录）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/server/CLAUDE.md`
 */

import type { Logger } from '@nestjs/common';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import type { PrismaService } from '../prisma';

type LoggerLike = Pick<Logger, 'log' | 'warn'>;

function isInvalidPasswordHashError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if (!('message' in error)) return false;
  const message = String((error as { message?: unknown }).message ?? '');
  return message.toLowerCase().includes('invalid password hash');
}

export async function ensureBootstrapAdmin(
  prisma: PrismaService,
  logger: LoggerLike,
) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    logger.warn('ADMIN_EMAIL/ADMIN_PASSWORD not set, skipping admin bootstrap');
    return;
  }

  if (adminPassword.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, isAdmin: true },
  });

  const user =
    existingUser ??
    (await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        emailVerified: true,
        isAdmin: true,
      },
      select: { id: true, isAdmin: true },
    }));

  if (!user.isAdmin) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true, emailVerified: true },
    });
  }

  const existingAccount = await prisma.account.findUnique({
    where: {
      providerId_accountId: { providerId: 'credential', accountId: adminEmail },
    },
    select: { id: true, userId: true, password: true },
  });

  if (existingAccount && existingAccount.userId !== user.id) {
    throw new Error(
      `ADMIN_EMAIL ${adminEmail} is already linked to another user`,
    );
  }

  const nextPasswordHash = await hashPassword(adminPassword);

  if (!existingAccount) {
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: adminEmail,
        providerId: 'credential',
        password: nextPasswordHash,
      },
    });

    logger.log(`✅ Admin bootstrap created: ${adminEmail}`);
    return;
  }

  if (!existingAccount.password) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: nextPasswordHash },
    });

    logger.log(`✅ Admin bootstrap password set: ${adminEmail}`);
    return;
  }

  try {
    const isMatch = await verifyPassword({
      password: adminPassword,
      hash: existingAccount.password,
    });

    if (isMatch) {
      logger.log(`✅ Admin bootstrap ready: ${adminEmail}`);
      return;
    }

    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: nextPasswordHash },
    });

    logger.warn(`⚠️ Admin bootstrap password rotated: ${adminEmail}`);
  } catch (error) {
    if (!isInvalidPasswordHashError(error)) {
      throw error;
    }

    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: nextPasswordHash },
    });

    logger.warn(`⚠️ Admin bootstrap password rehashed: ${adminEmail}`);
  }
}
