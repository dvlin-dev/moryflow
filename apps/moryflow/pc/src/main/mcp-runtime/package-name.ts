/**
 * [PROVIDES]: 受管 MCP packageName 校验（拒绝本地路径/非法 scoped 结构）
 * [DEPENDS]: none
 * [POS]: main/mcp-runtime 包安装与解析前置安全校验
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

const PACKAGE_PART_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

const assertValidPackagePart = (part: string, original: string): void => {
  if (!PACKAGE_PART_PATTERN.test(part)) {
    throw new Error(`Invalid package name: ${original}`);
  }
};

export const resolveManagedPackageNameParts = (packageName: string): string[] => {
  const normalized = packageName.trim();
  if (!normalized) {
    throw new Error('Invalid package name');
  }
  if (normalized.startsWith('/') || normalized.startsWith('~') || normalized.includes('\\')) {
    throw new Error(`Invalid package name: ${packageName}`);
  }
  if (normalized.includes(':')) {
    throw new Error(`Invalid package name: ${packageName}`);
  }

  const segments = normalized.split('/');
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    throw new Error(`Invalid package name: ${packageName}`);
  }

  if (normalized.startsWith('@')) {
    if (segments.length !== 2 || !segments[0]?.startsWith('@')) {
      throw new Error(`Invalid scoped package name: ${packageName}`);
    }
    const scope = segments[0].slice(1);
    if (!scope) {
      throw new Error(`Invalid scoped package name: ${packageName}`);
    }
    assertValidPackagePart(scope, packageName);
    assertValidPackagePart(segments[1], packageName);
    return [`@${scope}`, segments[1]];
  }

  if (segments.length !== 1) {
    throw new Error(`Invalid package name: ${packageName}`);
  }
  assertValidPackagePart(segments[0], packageName);
  return segments;
};

export const normalizeManagedPackageName = (packageName: string): string =>
  resolveManagedPackageNameParts(packageName).join('/');
