# Moryflow

> 本文档是 AI Agent 的核心指南。遵循 [agents.md 规范](https://agents.md/)。

## 🔄 核心同步协议（强制）

1. **原子更新规则**：任何代码变更完成后，必须同步更新相关目录的 CLAUDE.md
2. **递归触发**：文件变更 → 更新文件 Header → 更新所属目录 CLAUDE.md → （若影响全局）更新根 CLAUDE.md
3. **分形自治**：任何子目录的 CLAUDE.md 都应让 AI 能独立理解该模块的上下文
4. **禁止历史包袱**：不做向后兼容，无用代码直接删除/重构，不保留废弃注释
5. **零兼容原则**：除非直接影响用户已有数据，否则一律不兼容旧代码/旧数据结构。遇到设计问题直接按最佳实践重构，不留历史负担

## 📁 项目结构

| 目录              | 说明                                        | 详细规范                  |
| ----------------- | ------------------------------------------- | ------------------------- |
| `apps/mobile/`    | 移动端 App（Expo + React Native + uniwind） | → `apps/mobile/CLAUDE.md` |
| `apps/pc/`        | 桌面端 App（Electron + React）              | → `apps/pc/CLAUDE.md`     |
| `apps/server/`    | 后端服务（NestJS）                          | → `apps/server/CLAUDE.md` |
| `apps/admin/`     | 后台管理系统（React）                       | → `apps/admin/CLAUDE.md`  |
| `apps/storage/`   | 对象存储服务                                | -                         |
| `apps/vectorize/` | 向量化独立服务                              | -                         |
| `packages/`       | 共享包（Monorepo）                          | → `packages/CLAUDE.md`    |
| `docs/`           | 项目文档                                    | → `docs/CLAUDE.md`        |
| `moryflow-meta/`  | 官网与文档站点                              | -                         |

### 技术栈速查

| 层级   | 技术                                    |
| ------ | --------------------------------------- |
| 移动端 | Expo + React Native + uniwind + Zustand |
| 桌面端 | Electron + React + TailwindCSS          |
| 后端   | NestJS + Prisma + PostgreSQL + Redis    |
| Agent  | 自研 Agent 框架（packages/agents-\*）   |
| 包管理 | pnpm workspace                          |

## 📚 功能文档

- **功能索引**（需求/技术文档）：→ [`docs/CLAUDE.md`](./docs/CLAUDE.md)
- **分形文档规范**（完整指南）：→ [`docs/agents-md-guide.md`](./docs/agents-md-guide.md)

## 🤝 协作总则

- 全程中文沟通、提交、文档
- 先查后做：不猜实现，用搜索对照现有代码
- 不定义业务语义：产品/数据含义先确认需求方
- 复用优先：现有接口、类型、工具优先复用

## 📝 工作流程

1. **计划**：改动前给出最小范围 plan，说明动机与风险
2. **实施**：聚焦单一问题，不盲改
3. **校验**：本地跑 lint/typecheck，通过再提交
4. **同步**：更新相关 CLAUDE.md（本条强制）

## 📄 文件头注释规范

关键文件需在开头添加注释，格式根据文件类型选择：

| 文件类型   | 格式                                 |
| ---------- | ------------------------------------ |
| 服务/逻辑  | `[INPUT]` / `[OUTPUT]` / `[POS]`     |
| React 组件 | `[PROPS]` / `[EMITS]` / `[POS]`      |
| 工具函数集 | `[PROVIDES]` / `[DEPENDS]` / `[POS]` |
| 类型定义   | `[DEFINES]` / `[USED_BY]` / `[POS]`  |

示例：

```typescript
/**
 * [PROPS]: { noteId, onSave } - 笔记 ID 与保存回调
 * [EMITS]: onSave(content) - 内容变更时触发
 * [POS]: 编辑器核心组件，被 EditorPage 直接使用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */
```

## 📂 目录规范

### 前端组件结构

```
ComponentName/
├── index.ts              # 导出
├── ComponentName.tsx     # 主组件
├── components/           # 子组件
└── hooks/                # 组件专属 Hooks
```

### 通用模块结构

```
module-name/
├── index.tsx     # 入口
├── const.ts      # 类型/常量
├── helper.ts     # 纯函数逻辑
└── components/   # 子组件
```

### 公共函数区分

- **组件内 `helper.ts`** - 组件专属逻辑，仅服务于当前组件
- **全局 `helpers/`** - 跨组件复用的业务逻辑、自定义 Hooks
- **全局 `utils/`** - 纯工具函数，无业务状态依赖，可跨项目复用

## ⚡ 代码原则

### 核心原则

1. **单一职责（SRP）**：每个函数/组件只做一件事
2. **开放封闭（OCP）**：对扩展开放，对修改封闭
3. **最小知识（LoD）**：只与直接依赖交互，避免深层调用
4. **依赖倒置（DIP）**：依赖抽象而非具体实现
5. **组合优于继承**：用 Hooks 和组合模式复用逻辑
6. 不确定的事情要联网搜索，用到的库也要使用最新的版本，并联网查询最新的使用文档

### 代码实践

1. **纯函数优先**：逻辑尽量实现为纯函数，便于测试
2. **提前返回**：early return 减少嵌套，提高可读性
3. **职责分离**：常量、工具、逻辑、UI 各司其职
4. **DRY 原则**：相同逻辑抽离复用，不重复自己
5. **避免过早优化**：先保证正确性和可读性

### 注释规范

1. **核心逻辑必须注释**：复杂算法、业务规则、边界条件需要注释说明
2. **命名辅助理解**：清晰命名 + 必要注释，两者配合而非二选一
3. **中文注释**：使用简短中文注释，对外 API 补充 JSDoc

### 禁止事项

1. **不要历史兼容**：无用代码直接删除/重构，不写兼容层、适配器、迁移逻辑（除非影响用户数据）
2. **不保留废弃注释**：禁止 `// deprecated`、`// removed`、`_unused` 等
3. **不猜测实现**：先搜索确认，再动手修改
4. **不迁就旧设计**：发现设计问题直接重构，不在烂基础上打补丁

## 🎨 视觉风格

> 关键词：圆润、留白、黑白灰、微妙层次、丝滑动效

- 黑白灰为主，彩色克制使用
- 统一圆润边角，禁止生硬直角
- 留白即设计，避免拥挤
- 阴影微妙克制
- 动效自然不抢戏

参考：Arc、Notion、Linear

## 📛 命名规范

| 类型       | 规范             | 示例            |
| ---------- | ---------------- | --------------- |
| 组件/类型  | PascalCase       | `PublishDialog` |
| 函数/变量  | camelCase        | `handleSubmit`  |
| 常量       | UPPER_SNAKE_CASE | `MAX_RETRY`     |
| 组件文件夹 | PascalCase       | `EditorPanel/`  |
| 工具文件   | camelCase        | `formatDate.ts` |

## 🌐 语言规范

返回给用户的信息，如果不支持多语言的场景，默认使用英文

| 场景                | 语言   | 说明                     |
| ------------------- | ------ | ------------------------ |
| 文档/注释/提交      | 中文   | 沟通一致性               |
| 代码标识符          | 英文   | 编程惯例                 |
| Agent Tool 返回消息 | 英文   | 默认语言，暂不支持多语言 |
| 用户界面（UI）      | 多语言 | 支持多语言               |

**Agent Tool 规范**：

- Tool 的 `description` 使用英文（供 LLM 理解）
- Tool 返回的 `error`、`note` 等提示信息使用英文
- 参数 schema 的 `describe()` 使用英文
