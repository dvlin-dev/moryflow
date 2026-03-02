# @moryflow/tiptap

## 模块定位

`tiptap` 对应路径 `packages/tiptap`，编辑器扩展集合与交互能力封装，支持 Moryflow 富文本工作流。
该文档用于快速建立模块边界、职责与调用入口认知，并作为后续评审与重构的索引入口。

## 规模与结构快照

| 指标             | 数值              |
| ---------------- | ----------------- |
| 模块目录         | `packages/tiptap` |
| 文件总数         | 318               |
| 代码文件数       | 316               |
| 代码行数（估算） | 38043             |

### 目录分布（Top）

| 目录     | 文件数 |
| -------- | ------ |
| `src`    | 313    |
| `root`   | 4      |
| `styles` | 1      |

## 架构关系图

```mermaid
flowchart LR
  Upstream[上游调用方] --> Entry[tiptap: 入口层]
  Entry --> Core[核心实现]
  Core --> Infra[共享能力/基础设施]
  Core --> Output[输出接口/运行时行为]
```

**Diagram sources**

- [packages/tiptap/src/index.ts](file:///Users/zhangbaolin/code/me/moryflow/packages/tiptap/src/index.ts)
- [packages/tiptap/package.json](file:///Users/zhangbaolin/code/me/moryflow/packages/tiptap/package.json)
- [packages/tiptap/CLAUDE.md](file:///Users/zhangbaolin/code/me/moryflow/packages/tiptap/CLAUDE.md)
- [packages/tiptap/tsconfig.json](file:///Users/zhangbaolin/code/me/moryflow/packages/tiptap/tsconfig.json)

## 核心职责

1. 对外提供稳定入口与调用契约。
2. 对内收敛该模块的核心实现与约束。
3. 与上游业务模块保持边界清晰，避免跨层耦合。

## 公开入口与导出面

| 导出项                                                                         |
| ------------------------------------------------------------------------------ |
| `export * from './hooks';`                                                     |
| `export * from './utils';`                                                     |
| `export * from './extensions/node-background-extension';`                      |
| `export * from './extensions/node-alignment-extension';`                       |
| `export * from './extensions/ui-state-extension';`                             |
| `export * from './nodes/horizontal-rule-node/horizontal-rule-node-extension';` |

```ts
import * as ModuleApi from '@moryflow/tiptap';

export function inspectModuleSurface() {
  return Object.keys(ModuleApi);
}
```

## 集成示例

```ts
import * as ModuleApi from '@moryflow/tiptap';

export async function runModuleDemo() {
  const keys = Object.keys(ModuleApi);
  return { module: 'tiptap', apiCount: keys.length };
}
```

## 开发与验证命令

```bash
pnpm --filter @moryflow/tiptap typecheck
```

## Section sources

- [packages/tiptap/src/index.ts](file:///Users/zhangbaolin/code/me/moryflow/packages/tiptap/src/index.ts)
- [packages/tiptap/package.json](file:///Users/zhangbaolin/code/me/moryflow/packages/tiptap/package.json)
- [packages/tiptap/CLAUDE.md](file:///Users/zhangbaolin/code/me/moryflow/packages/tiptap/CLAUDE.md)
- [packages/tiptap/tsconfig.json](file:///Users/zhangbaolin/code/me/moryflow/packages/tiptap/tsconfig.json)
- [packages/tiptap/styles/notion-editor.scss](file:///Users/zhangbaolin/code/me/moryflow/packages/tiptap/styles/notion-editor.scss)
- [packages/tiptap/src/ui/ai-types.ts](file:///Users/zhangbaolin/code/me/moryflow/packages/tiptap/src/ui/ai-types.ts)
- [packages/tiptap/src/types/tiptap-extensions.d.ts](file:///Users/zhangbaolin/code/me/moryflow/packages/tiptap/src/types/tiptap-extensions.d.ts)
- [packages/tiptap/src/types/turndown-plugin-gfm.d.ts](file:///Users/zhangbaolin/code/me/moryflow/packages/tiptap/src/types/turndown-plugin-gfm.d.ts)

## 最佳实践

- 保持入口导出收敛，避免把内部实现细节暴露给上游。
- 变更对外类型或函数签名时，优先同步 API 文档与示例。
- 新增能力时优先在该模块内完成职责闭环，再向外暴露最小接口。

## 性能优化

- 将高频路径保持为纯函数或无副作用调用，减少跨层状态依赖。
- 对大体量数据处理路径优先做分页/分段处理，控制内存峰值。
- 对外部 IO 或网络访问路径增加超时与重试上限，避免级联阻塞。

## 错误处理与调试

| 问题       | 可能原因       | 排查入口                                |
| ---------- | -------------- | --------------------------------------- |
| 导入失败   | 入口导出未更新 | `src/index.ts` / `package.json#exports` |
| 运行时异常 | 参数契约不一致 | 入口函数签名与调用方对照                |
| 行为漂移   | 未同步约束文档 | 对照本页 sources 与 API 文档            |

## 相关文档

- [Wiki 首页](../index.md)
- [领域索引](_index.md)
- [API 参考](../api/tiptap-api.md)

---

_由 [Mini-Wiki v3.0.6](https://github.com/trsoliu/mini-wiki) 自动生成 | 2026-03-02_
