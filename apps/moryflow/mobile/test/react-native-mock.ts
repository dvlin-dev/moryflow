/**
 * [PROVIDES]: react-native 测试替身（AppState）
 * [DEPENDS]: none
 * [POS]: Mobile vitest 解析/运行 shim
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export const AppState = {
  addEventListener: () => ({
    remove() {},
  }),
};
