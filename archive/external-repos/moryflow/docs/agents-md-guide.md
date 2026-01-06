# CLAUDE.md 分形文档规范

> 通过分形结构的文档系统，让 AI Agent 在任何代码位置都能快速重建上下文，实现「局部自治、整体协同」。

## 为什么需要这个规范？

AI 辅助开发面临三个核心挑战：

1. **上下文丢失**：代码库太大，AI 无法一次性理解全貌
2. **文档腐化**：代码更新后文档不同步，AI 获取的是过时信息
3. **认知碎片化**：AI 在不同目录间跳转时，容易丢失整体架构认知

## 解决方案：分形文档结构

借鉴《哥德尔、艾舍尔、巴赫》中的「复调、自指」思想，构建三层分形结构：

```
根目录 CLAUDE.md     →  系统的「宪法」，定义核心协议和全局规范
    ↓
子目录 CLAUDE.md     →  局部的「地图」，让 AI 在任何子目录都能独立工作
    ↓
文件头注释           →  细胞级信息，描述单个文件的输入、输出、定位
```

这是一个**自指系统**：文件描述如何修改自己，文件夹描述文件如何协作，根目录描述文件夹如何共生。

---

## 快速开始

### 第一步：创建根目录 CLAUDE.md

复制下方「根目录模板」，根据你的项目填写：
- 项目结构表
- 技术栈速查
- 团队协作规范

### 第二步：创建 AGENTS.md 软链接

```bash
ln -s CLAUDE.md AGENTS.md
```

### 第三步：为核心目录创建 CLAUDE.md

满足以下任一条件时创建：
- 目录下超过 10 个文件
- 包含复杂业务逻辑
- 作为独立功能模块
- 有跨目录依赖关系需要说明

使用「子目录模板」创建对应的 CLAUDE.md，并创建 AGENTS.md 软链接。

### 第四步：为关键文件添加头注释

优先为以下文件添加头注释：
- 模块入口文件（index.ts）
- 核心服务文件
- 复杂业务组件
- 共享类型定义

### 第五步：建立更新习惯

每次代码变更后，检查是否需要同步更新：
- 文件头注释
- 所属目录 CLAUDE.md
- 根目录 CLAUDE.md（如影响全局）

---

## CLAUDE.md 与 AGENTS.md 的关系

不同的 AI 工具识别不同的配置文件名：
- Claude 工具链读取 `CLAUDE.md`
- 其他 AI 工具（如 Cursor）读取 `AGENTS.md`

**规范**：以 `CLAUDE.md` 为主文件，`AGENTS.md` 为软链接

```bash
# 创建软链接（在每个需要的目录下执行）
ln -s CLAUDE.md AGENTS.md
```

这样修改 `CLAUDE.md` 时，`AGENTS.md` 自动同步，无需维护两份文件。

---

## 核心协议

### 原子更新规则（强制）

任何代码变更完成后，**必须**同步更新相关文档：

```
代码变更 → 更新文件头注释 → 更新所属目录 CLAUDE.md → （若影响全局）更新根 CLAUDE.md
```

### 触发器机制

每个文档都包含更新触发器：

```markdown
> ⚠️ 本文件夹结构变更时，必须同步更新此文档
```

```typescript
/**
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */
```

### 禁止历史包袱

- 不做向后兼容，无用代码直接删除/重构
- 不保留 `_deprecated`、`// removed`、`// TODO: remove` 等废弃注释
- 不创建 `_old`、`_backup` 等临时文件

---

## 三层文档结构

### 层级一：根目录 CLAUDE.md

**地位**：系统的「宪法」

**职责**：
- 定义核心同步协议
- 提供全局技术栈速查
- 声明通用代码规范
- 索引到各子目录 CLAUDE.md

### 层级二：子目录 CLAUDE.md

**地位**：局部的「地图」

**创建阈值**：满足以下任一条件时创建：
1. 目录下超过 10 个文件
2. 包含复杂业务逻辑
3. 作为独立功能模块
4. 有跨目录依赖关系需要说明

**职责**：
- 3 行极简定位（定位、职责、约束）
- 成员文件清单
- 本目录特有的技术约束
- 常见修改场景指引

### 层级三：文件头注释

**地位**：细胞级信息

**适用范围**：关键文件（入口、核心服务、复杂组件）

**职责**：
- 声明输入/输出
- 说明在系统中的定位
- 包含更新触发器

---

## 文件头注释规范

根据文件类型选择对应格式：

| 文件类型 | 格式 |
|---------|------|
| 服务/逻辑 | `[INPUT]` / `[OUTPUT]` / `[POS]` |
| React 组件 | `[PROPS]` / `[EMITS]` / `[POS]` |
| 工具函数集 | `[PROVIDES]` / `[DEPENDS]` / `[POS]` |
| 类型定义 | `[DEFINES]` / `[USED_BY]` / `[POS]` |

### 示例：服务/逻辑文件

```typescript
/**
 * [INPUT]: (Credentials, UserRepo) - 凭证与用户数据访问接口
 * [OUTPUT]: (AuthToken, SessionContext) | Exception - 授权令牌或异常
 * [POS]: 认证核心服务，作为 API 层与 Data 层的逻辑粘合剂
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */
```

### 示例：React 组件

```typescript
/**
 * [PROPS]: { noteId, onSave, className? } - 笔记 ID、保存回调、可选样式
 * [EMITS]: onSave(content: string) - 内容变更时触发保存
 * [POS]: 编辑器核心组件，被 EditorPage 和 QuickNote 使用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */
```

### 示例：工具函数集

```typescript
/**
 * [PROVIDES]: formatDate, parseDate, isValidDate - 日期处理工具集
 * [DEPENDS]: dayjs - 底层日期库
 * [POS]: 全局工具函数，被多个模块复用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */
```

### 示例：类型定义文件

```typescript
/**
 * [DEFINES]: User, UserRole, UserPermission - 用户相关类型
 * [USED_BY]: auth/, user/, admin/ - 认证、用户、管理模块
 * [POS]: 核心领域类型，变更需谨慎评估影响范围
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */
```

---

## 模板

### 根目录 CLAUDE.md 模板

```markdown
# 项目名称

> 本文档是 AI Agent 的核心指南。遵循 [agents.md 规范](https://agents.md/)。

## 🔄 核心同步协议（强制）

1. **原子更新规则**：任何代码变更完成后，必须同步更新相关目录的 CLAUDE.md
2. **递归触发**：文件变更 → 更新文件 Header → 更新所属目录 CLAUDE.md → （若影响全局）更新根 CLAUDE.md
3. **分形自治**：任何子目录的 CLAUDE.md 都应让 AI 能独立理解该模块的上下文
4. **禁止历史包袱**：不做向后兼容，无用代码直接删除/重构，不保留废弃注释

## 📁 项目结构

| 目录 | 说明 | 详细规范 |
|------|------|----------|
| `apps/xxx/` | 应用描述 | → `apps/xxx/CLAUDE.md` |
| `packages/` | 共享包 | → `packages/CLAUDE.md` |

### 技术栈速查

| 层级 | 技术 |
|------|------|
| 前端 | React / Vue / ... |
| 后端 | NestJS / Express / ... |
| 数据库 | PostgreSQL / MongoDB / ... |

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

| 文件类型 | 格式 |
|---------|------|
| 服务/逻辑 | `[INPUT]` / `[OUTPUT]` / `[POS]` |
| React 组件 | `[PROPS]` / `[EMITS]` / `[POS]` |
| 工具函数集 | `[PROVIDES]` / `[DEPENDS]` / `[POS]` |
| 类型定义 | `[DEFINES]` / `[USED_BY]` / `[POS]` |

## 📂 目录规范

组件或模块目录结构：
- `index.tsx` - 入口
- `const.ts` - 类型/常量
- `helper.ts` - 纯函数逻辑
- `components/` - 子组件

## ⚡ 代码原则

1. **单一职责**：每个函数/组件只做一件事
2. **纯函数优先**：逻辑尽量实现为纯函数，便于测试
3. **提前返回**：early return 减少嵌套，提高可读性
4. **DRY 原则**：相同逻辑抽离复用，不重复自己

## 📛 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件/类型 | PascalCase | `PublishDialog` |
| 函数/变量 | camelCase | `handleSubmit` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY` |
```

### 子目录 CLAUDE.md 模板

```markdown
# [目录名称]

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

[一句话说明本目录在系统中的角色]

## 职责

[本目录负责什么，不负责什么]

## 约束

[技术约束、依赖规则、禁止事项]

## 成员清单

| 文件/目录 | 类型 | 说明 |
|-----------|------|------|
| `index.ts` | 入口 | 模块导出 |
| `service.ts` | 服务 | 核心业务逻辑 |
| `types.ts` | 类型 | 类型定义 |
| `components/` | 目录 | UI 组件 → 见 `components/CLAUDE.md` |

## 常见修改场景

| 场景 | 涉及文件 | 注意事项 |
|------|----------|----------|
| 新增 API | `service.ts`, `types.ts` | 需同步更新类型定义 |
| 修改 UI | `components/` | 遵循组件规范 |

## 依赖关系

```
本模块
├── 依赖 → packages/shared-api
├── 依赖 → ../common/
└── 被依赖 ← apps/pc/renderer
```
```

---

## 功能文档规范（可选）

对于较大的项目，建议采用「需求-技术-计划」三文档模式：

```
docs/features/
├── feature-name/
│   ├── prd.md      # 需求文档（用户确认后才能写技术文档）
│   ├── tech.md     # 技术文档（标注相关代码路径）
│   └── plan.md     # 执行计划（完成后删除）
```

### 工作流程

```
用户提需求 → AI 写 prd.md → 用户确认 → AI 写 tech.md → AI 写 plan.md → 按步骤编码 → 完成后删除 plan.md
```

### 双向标注

文档标注代码路径，代码标注文档路径：

```typescript
/**
 * [POS]: 云同步核心服务
 * [DOC]: docs/features/cloud-sync/tech.md
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及相关文档
 */
```

---

## 维护指南

### 文档结构标准

功能文档采用统一结构：

```markdown
# 功能名称

## 需求
[用户视角：要解决什么问题？期望的行为是什么？]

## 技术方案
[架构决策、核心数据结构、关键流程]

## 代码索引
[标注核心代码路径，便于定位]
```

### 文档精简原则

1. **删除过程记录**：不保留"先尝试 A，失败后改用 B"等探索过程
2. **删除冗余代码**：只保留伪代码或关键数据结构，不贴完整实现
3. **删除重复信息**：代码已经说明的，文档不重复
4. **保留决策依据**：为什么选择方案 A 而非 B

### 代码索引格式

```markdown
## 代码索引

| 模块 | 路径 | 说明 |
|------|------|------|
| 入口 | `apps/pc/src/main/xxx.ts` | 主进程入口 |
| 服务 | `apps/server/src/xxx/xxx.service.ts` | 核心业务逻辑 |
| 类型 | `packages/shared-api/src/types/xxx.ts` | 共享类型定义 |
```

### 伪代码规范

```typescript
// 数据结构示例
interface SyncState {
  status: 'idle' | 'syncing' | 'error'
  lastSyncAt: Date
  pendingChanges: Change[]
}

// 核心流程（伪代码）
async function syncWorkspace(workspaceId: string) {
  // 1. 获取本地变更
  const localChanges = await getLocalChanges(workspaceId)

  // 2. 拉取远程变更
  const remoteChanges = await fetchRemoteChanges(workspaceId)

  // 3. 解决冲突（Last-Write-Wins 策略）
  const merged = resolveConflicts(localChanges, remoteChanges)

  // 4. 应用变更
  await applyChanges(merged)
}
```

### 定期维护检查

每月检查：
- [ ] 已删除的功能，对应文档是否已删除？
- [ ] 重构后的代码，文档中的路径是否已更新？
- [ ] 废弃的技术方案，是否已从文档移除？

---

## AI 可理解性测试

进入任意子目录，AI 应该能通过该目录的 CLAUDE.md 回答：

1. 这个目录是做什么的？
2. 修改某功能应该改哪些文件？
3. 有什么技术约束需要遵守？

如果 AI 无法回答，说明文档需要补充。

---

## 参考资料

- [agents.md 规范](https://agents.md/)
- [《哥德尔、艾舍尔、巴赫》](https://book.douban.com/subject/1291204/) - 复调与自指的美学
