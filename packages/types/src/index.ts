/**
 * [DEFINES]: Anyhunt 统一平台共享类型
 * [USED_BY]: 所有产品的服务端和客户端
 * [POS]: 类型包入口
 *
 * [PROTOCOL]: 修改此文件时必须同步更新 packages/types/CLAUDE.md
 */

// 平台通用类型
export * from './common';

// 产品特定类型（命名空间导出）
export * from './products';
