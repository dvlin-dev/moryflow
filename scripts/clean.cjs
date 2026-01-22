/**
 * [PROVIDES]: 跨平台清理根 node_modules
 * [DEPENDS]: node:fs, node:path
 * [POS]: 根 clean 脚本的删除步骤
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

const { rmSync } = require('node:fs');
const { resolve } = require('node:path');

const target = resolve(process.cwd(), 'node_modules');

try {
  rmSync(target, { recursive: true, force: true });
} catch (error) {
  if (error && error.code !== 'ENOENT') {
    console.error(`Failed to remove ${target}`, error);
    process.exitCode = 1;
  }
}
