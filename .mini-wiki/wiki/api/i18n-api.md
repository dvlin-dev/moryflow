# `@moryflow/i18n` API 参考

## 模块导入

```ts
import * as ModuleApi from '@moryflow/i18n';
```

## 导出概览

| 导出                                                                                           | 说明     |
| ---------------------------------------------------------------------------------------------- | -------- |
| `export type {`                                                                                | 核心导出 |
| `export type { HealthTranslationKeys } from './translations/health/types';`                    | 核心导出 |
| `export {`                                                                                     | 核心导出 |
| `export { initI18n, initI18nSync, getI18nInstance, isI18nInitialized } from './core/i18n';`    | 核心导出 |
| `export { useTranslation } from './hooks/useTranslation';`                                     | 核心导出 |
| `export { useLanguage } from './hooks/useLanguage';`                                           | 核心导出 |
| `export { default as translations } from './translations';`                                    | 核心导出 |
| `export { getDateLocale, getDateFormat, dateLocaleUtils } from './utils/date-locale';`         | 核心导出 |
| `export { formatSmartRelativeTime, formatDate, formatHelpers } from './utils/format-helpers';` | 核心导出 |

## API 调用流程

```mermaid
sequenceDiagram
  participant Caller as 调用方
  participant Entry as Module Entry
  participant Core as Internal Core

  Caller->>Entry: import + invoke
  Entry->>Core: 参数归一/执行
  Core-->>Entry: 结果/错误
  Entry-->>Caller: 标准化输出
```

**Diagram sources**

- [packages/i18n/src/index.ts](file:///Users/zhangbaolin/code/me/moryflow/packages/i18n/src/index.ts)
- [packages/i18n/package.json](file:///Users/zhangbaolin/code/me/moryflow/packages/i18n/package.json)
- [packages/i18n/CLAUDE.md](file:///Users/zhangbaolin/code/me/moryflow/packages/i18n/CLAUDE.md)

## 常见调用示例

```ts
import * as ModuleApi from '@moryflow/i18n';

export function listModuleApis() {
  return Object.keys(ModuleApi);
}
```

```ts
import * as ModuleApi from '@moryflow/i18n';

export async function safeInvoke(name: string, ...args: unknown[]) {
  const fn = (ModuleApi as Record<string, unknown>)[name];
  if (typeof fn !== 'function') return { ok: false, reason: 'not-function' };
  return { ok: true, result: await (fn as (...x: unknown[]) => unknown)(...args) };
}
```

## 类型与契约建议

- 对外 API 优先暴露稳定类型，避免泄露内部实现细节。
- 新增导出时同步维护入口文件与调用示例。
- 对可失败分支返回结构化错误，避免仅抛出非语义异常。

## Section sources

- [packages/i18n/src/index.ts](file:///Users/zhangbaolin/code/me/moryflow/packages/i18n/src/index.ts)
- [packages/i18n/package.json](file:///Users/zhangbaolin/code/me/moryflow/packages/i18n/package.json)
- [packages/i18n/CLAUDE.md](file:///Users/zhangbaolin/code/me/moryflow/packages/i18n/CLAUDE.md)
- [packages/i18n/.eslintrc.js](file:///Users/zhangbaolin/code/me/moryflow/packages/i18n/.eslintrc.js)
- [packages/i18n/tsconfig.json](file:///Users/zhangbaolin/code/me/moryflow/packages/i18n/tsconfig.json)
- [packages/i18n/tsc-multi.json](file:///Users/zhangbaolin/code/me/moryflow/packages/i18n/tsc-multi.json)
- [packages/i18n/src/core/i18n.ts](file:///Users/zhangbaolin/code/me/moryflow/packages/i18n/src/core/i18n.ts)
- [packages/i18n/src/core/types.ts](file:///Users/zhangbaolin/code/me/moryflow/packages/i18n/src/core/types.ts)

## 最佳实践

1. 所有对外导出都应经过入口聚合与命名约束。
2. 调用方优先通过封装方法消费 API，避免散落直接调用。
3. 版本升级时先校验导出变更，再做批量迁移。

## 性能优化

- 减少热路径中的动态反射与重复序列化。
- 对可缓存结果建立短生命周期缓存，降低重复计算成本。
- 对高频导出添加最小可观测日志，便于定位瓶颈。

## 错误处理与调试

| 症状                    | 根因候选     | 处理建议                         |
| ----------------------- | ------------ | -------------------------------- |
| import 成功但函数不存在 | 导出名变更   | 对照入口 export 列表更新调用方   |
| 参数错误导致运行失败    | 调用签名漂移 | 为入口增加 schema 校验或类型收紧 |
| 行为与预期不一致        | 版本混用     | 锁定 workspace 版本并重建依赖    |

## 相关文档

- [模块深度文档](../组件库/i18n.md)
- [Wiki 首页](../index.md)

---

_由 [Mini-Wiki v3.0.6](https://github.com/trsoliu/mini-wiki) 自动生成 | 2026-03-02_
