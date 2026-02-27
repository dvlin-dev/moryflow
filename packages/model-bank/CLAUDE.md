# /model-bank

> 统一模型与 Provider 元数据包（对齐 LobeHub 结构，仓内独立可编译版本）
> 最近更新：2026-02-28（新增 `thinking/contract.ts`：云端 `capabilities.reasoning` 解析 + thinking 选择到 reasoning 映射单源；Anyhunt/Moryflow Server 统一接入）
> 最近更新：2026-02-28（删除 `resolveSdkDefaultThinkingProfile`，thinking API 仅保留 model-native 路径）
> 最近更新：2026-02-27（新增 thinking 规则中心：`src/thinking/*`，统一等级定义/默认值/可见参数/约束与 profile 解析；对外新增 `./thinking` 导出）
> 最近更新：2026-02-27（thinking resolver 增加“语义前缀模型 ID”解析：`openai/gpt-5.2` 等聚合模型在 provider miss 时可直接命中 model-native 合同，业务侧删除二次 fallback）
> 最近更新：2026-02-27（修复 renderer 白屏：`feature-flags.ts` 改为 `globalThis.process?.env` 安全读取，避免浏览器上下文 `process is not defined`）
> 最近更新：2026-02-27（云服务商命名统一：`lobehub` 全量改为 `moryflow`，含 aiModels 目录、provider id、exports 与枚举）
> 最近更新：2026-02-27（引入 model-bank 完整包：aiModels/modelProviders/standard-parameters/types；移除上游 workspace 依赖并改为本地 feature flag + 本地 llm 类型）
> 最近更新：2026-02-27（包导出收口：切换 dist 双格式入口，补齐 `./aiModels/*` / `./modelProviders/*` wildcard exports，修复 Node CJS 运行时导入）

## 职责范围

- 提供 Provider 元数据（名称、API 地址、SDK 类型、模型抓取能力、浏览器请求能力等）
- 提供模型元数据（能力、上下文、价格、扩展参数、默认开关）
- 提供标准参数 Schema（image/video）与默认值提取工具
- 作为 Moryflow / Anyhunt 模型设置与运行时映射的单一事实源

## 入口与关键文件

- `src/index.ts`：统一导出入口
- `src/aiModels/index.ts`：内置模型总表（`LOBE_DEFAULT_MODEL_LIST`）
- `src/modelProviders/index.ts`：Provider 总表（`DEFAULT_MODEL_PROVIDER_LIST`）
- `src/types/aiModel.ts`：模型核心类型与扩展参数定义
- `src/types/llm.ts`：ProviderCard/ChatModelCard 本地类型（去耦上游别名）
- `src/const/feature-flags.ts`：`ENABLE_BUSINESS_FEATURES` 本地开关
- `src/standard-parameters/*`：模型参数元信息 Schema 与默认值工具
- `src/thinking/*`：thinking 等级与参数规则中心（resolver + rules + types）

## 约束与约定

- 禁止重新引入 `@lobechat/business-const` 与 `@/types/llm` 这类跨仓耦合依赖
- 模型能力与参数定义以 model-native 为准，不在 UI 组件重复硬编码
- 新增模型优先按 provider 文件拆分，保持 `package.json` 的 `./aiModels/*` wildcard 导出覆盖

## 校验命令

```bash
pnpm --filter @moryflow/model-bank typecheck
pnpm --filter @moryflow/model-bank test:unit
```

## 近期变更

- 初始化 `packages/model-bank` 完整目录与数据清单（来自 `.analysis-ref/lobehub/packages/model-bank`）
- 新增 `src/types/llm.ts`，替代上游应用层别名类型导入
- 新增 `src/const/feature-flags.ts`，替代上游 business 常量依赖
- 包配置改为 workspace 可运行版本（`@moryflow/model-bank`，含 typecheck/test:unit）
- 云服务商命名统一：`src/aiModels/moryflow/*` + `src/modelProviders/moryflow.ts`；`ModelProvider.Moryflow = 'moryflow'`
- 新增 `thinking` 子域：统一输出 `ModelThinkingProfile`、`THINKING_LEVEL_LABELS`、约束规则与按模型解析入口
- `thinking/resolver` 新增跨 provider 语义候选链（exact -> prefixed alias -> global id），保障 Router/Custom provider 对第三方模型 ID 的单次解析一致性
- `thinking/contract` 新增服务端共用 contract API（`buildThinkingProfileFromCapabilities`/`resolveReasoningFromThinkingSelection`）与结构化错误类型
- 删除 `resolveSdkDefaultThinkingProfile` 过渡壳层，避免 SDK 级默认 thinking 被误当事实源
- 导出策略更新为 dist 双格式（`import`/`require`/`types`），并以 wildcard 子路径覆盖 `aiModels/modelProviders/registry/thinking/types`
