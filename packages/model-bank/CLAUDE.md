# /model-bank

> 统一模型与 Provider 元数据包（仓内独立可编译版本）

## 职责范围

- 提供 Provider 元数据（名称、API 地址、SDK 类型、模型抓取能力、浏览器请求能力等）
- 提供模型元数据（能力、上下文、价格、扩展参数、默认开关）
- 提供标准参数 Schema（image/video）与默认值提取工具
- 作为 Moryflow / Anyhunt 模型设置与运行时映射的单一事实源

## 入口与关键文件

- `src/index.ts`：统一导出入口
- `src/aiModels/index.ts`：内置模型总表（`DEFAULT_AI_MODEL_LIST`）
- `src/modelProviders/index.ts`：Provider 总表（`DEFAULT_MODEL_PROVIDER_LIST`）
- `src/types/aiModel.ts`：模型核心类型与扩展参数定义
- `src/types/llm.ts`：ProviderCard/ChatModelCard 本地类型（去耦上游别名）
- `src/standard-parameters/*`：模型参数元信息 Schema 与默认值工具
- `src/thinking/*`：thinking 等级与参数规则中心（resolver + rules + types）

## 约束与约定

- 禁止重新引入历史上游业务常量包与 `@/types/llm` 这类跨仓耦合依赖
- 模型能力与参数定义以 model-native 为准，不在 UI 组件重复硬编码
- 新增模型优先按 provider 文件拆分，保持 `package.json` 的 `./aiModels/*` wildcard 导出覆盖

## 校验命令

```bash
pnpm --filter @moryflow/model-bank typecheck
pnpm --filter @moryflow/model-bank test:unit
```
