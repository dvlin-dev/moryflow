/**
 * [PROVIDES]: react-native 测试替身（AppState）
 * [DEPENDS]: none
 * [POS]: Mobile vitest 解析/运行 shim
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export const AppState = {
  addEventListener: () => ({
    remove() {},
  }),
};
