/**
 * [DEFINES]: keytar module typing stub
 * [USED_BY]: src/main/membership-token-store.ts
 * [POS]: 解决 typecheck 缺失 keytar 类型定义的问题
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

declare module 'keytar' {
  const keytar: unknown;
  export default keytar;
}
