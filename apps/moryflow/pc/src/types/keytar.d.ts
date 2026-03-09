/**
 * [DEFINES]: keytar module typing stub
 * [USED_BY]: src/main/membership-token-store.ts
 * [POS]: 解决 typecheck 缺失 keytar 类型定义的问题
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

declare module 'keytar' {
  const keytar: unknown;
  export default keytar;
}
