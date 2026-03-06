#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolvePath(inputPath) {
  return path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(process.cwd(), inputPath);
}

function getClientVersionFromGeneratedClient(classFilePath) {
  const content = fs.readFileSync(classFilePath, 'utf8');
  const match = content.match(/"clientVersion"\s*:\s*"([^"]+)"/);
  if (!match?.[1]) {
    throw new Error(
      `Cannot find Prisma clientVersion in generated file: ${classFilePath}`,
    );
  }
  return match[1];
}

const [, , generatedClassPathArg, prismaClientPkgPathArg, prismaCliPkgPathArg] =
  process.argv;

if (!generatedClassPathArg || !prismaClientPkgPathArg || !prismaCliPkgPathArg) {
  console.error(
    [
      'Usage:',
      '  node scripts/assert-prisma-runtime-version.cjs \\',
      '    <generated/internal/class.js> \\',
      '    <node_modules/@prisma/client/package.json> \\',
      '    <node_modules/prisma/package.json>',
    ].join('\n'),
  );
  process.exit(1);
}

const generatedClassPath = resolvePath(generatedClassPathArg);
const prismaClientPkgPath = resolvePath(prismaClientPkgPathArg);
const prismaCliPkgPath = resolvePath(prismaCliPkgPathArg);

const generatedClientVersion =
  getClientVersionFromGeneratedClient(generatedClassPath);
const prismaClientVersion = readJson(prismaClientPkgPath).version;
const prismaCliVersion = readJson(prismaCliPkgPath).version;

if (generatedClientVersion !== prismaClientVersion) {
  throw new Error(
    [
      'Prisma generated client version mismatch:',
      `- generated: ${generatedClientVersion} (${generatedClassPath})`,
      `- @prisma/client: ${prismaClientVersion} (${prismaClientPkgPath})`,
    ].join('\n'),
  );
}

if (generatedClientVersion !== prismaCliVersion) {
  throw new Error(
    [
      'Prisma CLI/runtime version mismatch:',
      `- generated: ${generatedClientVersion} (${generatedClassPath})`,
      `- prisma: ${prismaCliVersion} (${prismaCliPkgPath})`,
    ].join('\n'),
  );
}

console.log(
  `[prisma-version-check] OK generated=@prisma/client=prisma=${generatedClientVersion}`,
);
