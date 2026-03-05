/**
 * [INPUT]: runtimeDir (CLI arg) - 服务 deploy 产物根目录（包含 package.json / node_modules）
 * [OUTPUT]: stdout 成功日志；失败时 stderr 输出根因并返回非 0
 * [POS]: Docker 构建期 fail-fast 校验 Better Auth Prisma adapter 运行时依赖完整性
 */

import { access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

function assertInput(runtimeDir) {
  if (!runtimeDir) {
    throw new Error('Usage: node assert-better-auth-prisma-adapter.mjs <runtime-dir>');
  }
}

async function main() {
  const runtimeDir = process.argv[2];
  assertInput(runtimeDir);

  const resolvedRuntimeDir = resolve(runtimeDir);
  const runtimeRequire = createRequire(join(resolvedRuntimeDir, 'package.json'));

  const prismaAdapterEntryPath = runtimeRequire.resolve('@better-auth/prisma-adapter');
  const betterAuthEntryPath = runtimeRequire.resolve('better-auth');

  const betterAuthPrismaAdapterEntrypoint = join(
    dirname(betterAuthEntryPath),
    '..',
    'dist',
    'adapters',
    'prisma-adapter',
    'index.mjs'
  );
  await access(betterAuthPrismaAdapterEntrypoint);

  const betterAuthPrismaSubpath = runtimeRequire.resolve('better-auth/adapters/prisma');

  await import(pathToFileURL(betterAuthPrismaAdapterEntrypoint).href);
  await import(pathToFileURL(betterAuthPrismaSubpath).href);

  console.log(
    `[assert-better-auth-prisma-adapter] OK runtimeDir=${resolvedRuntimeDir} adapter=${prismaAdapterEntryPath}`
  );
}

main().catch((error) => {
  console.error('[assert-better-auth-prisma-adapter] FAIL', error);
  process.exit(1);
});
