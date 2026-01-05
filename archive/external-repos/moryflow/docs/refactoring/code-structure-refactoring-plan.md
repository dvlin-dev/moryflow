# 代码结构改造方案

> 基于 2025-01 新规范的全面代码审查与改造计划

## 概述

本文档基于最新的 AGENTS.md 规范，对项目全部应用进行代码审查，识别不符合规范的代码结构，并提供改造方案。

### 核心规范要点

1. **后端模块结构**：标准化的 NestJS 模块目录结构
2. **前端组件结构**：标准化的 React 组件目录结构
3. **Zod-First DTO**：所有类型从 Zod schemas 派生，禁止重复定义
4. **单一职责**：模块化、职责分离
5. **零兼容原则**：无用代码直接删除

---

## 一、后端 (apps/server) 改造清单

### 1.1 DTO 规范问题 - 高优先级

**问题**：大量 DTO 文件使用 TypeScript interface 而非 Zod schemas

**影响范围**：约 20+ 个模块的 DTO 文件

| 模块 | 文件 | 当前状态 | 需要改造 |
|------|------|----------|----------|
| `alert` | `alert.dto.ts` | interface 定义 | 迁移到 Zod |
| `license` | `dto/license.dto.ts` | interface 定义 | 迁移到 Zod |
| `speech` | `dto/speech.dto.ts` | interface 定义 | 迁移到 Zod |
| `search` | `dto/search.dto.ts` | interface 定义 | 迁移到 Zod |
| `site` | `site.dto.ts` | interface 定义 | 迁移到 Zod |
| `quota` | `dto/quota.dto.ts` | interface 定义 | 迁移到 Zod |
| `sync` | `dto/sync.dto.ts` | interface 定义 | 迁移到 Zod |
| `vectorize` | `dto/vectorize.dto.ts` | interface 定义 | 迁移到 Zod |
| `vault` | `dto/vault.dto.ts` | interface 定义 | 迁移到 Zod |
| `payment` | `dto/payment.dto.ts` | 混合使用 | 统一到 Zod |
| `admin` | `dto/admin.dto.ts` | interface 定义 | 迁移到 Zod |
| `admin-payment` | `dto/admin-payment.dto.ts` | interface 定义 | 迁移到 Zod |
| `admin-storage` | `dto/admin-storage.dto.ts` | interface 定义 | 迁移到 Zod |
| `agent-trace` | `dto/agent-trace.dto.ts` | interface 定义 | 迁移到 Zod |
| `activity-log` | `dto/activity-log.dto.ts` | interface 定义 | 迁移到 Zod |
| `pre-register` | `pre-register.dto.ts` | 位置不规范 | 移动到 dto/ |
| `user` | `dto/delete-account.dto.ts` | 需检查 | 迁移到 Zod |

**改造步骤**：

```typescript
// 改造前 (interface)
export interface CreateAlertRuleDto {
  name: string;
  type: AlertRuleType;
  condition: AlertRuleCondition;
}

// 改造后 (Zod-First)
import { z } from 'zod';
import { createZodDto } from '@wahyubucil/nestjs-zod-openapi';

export const CreateAlertRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.nativeEnum(AlertRuleType),
  condition: AlertRuleConditionSchema,
}).openapi('CreateAlertRuleRequest');

export type CreateAlertRuleInput = z.infer<typeof CreateAlertRuleSchema>;
export class CreateAlertRuleDto extends createZodDto(CreateAlertRuleSchema) {}
```

### 1.2 模块目录结构问题 - 中优先级

**问题**：部分模块缺少标准文件

| 模块 | 缺少的文件 | 说明 |
|------|------------|------|
| `alert` | `dto/` 目录 | DTO 直接放在模块根目录 |
| `pre-register` | `dto/` 目录 | DTO 直接放在模块根目录 |
| `site` | `dto/` 目录 | DTO 直接放在模块根目录 |
| 多个模块 | `*.constants.ts` | 常量散落各处 |
| 多个模块 | `*.errors.ts` | 自定义错误未分离 |

**标准结构**：

```
module-name/
├── dto/
│   ├── index.ts
│   └── module-name.schema.ts
├── module-name.module.ts
├── module-name.controller.ts
├── module-name.service.ts
├── module-name.constants.ts   # 常量/枚举
├── module-name.errors.ts      # 自定义错误
└── index.ts
```

### 1.3 types/ 目录滥用 - 中优先级

**问题**：`src/types/` 目录包含应该在各模块 DTO 中定义的类型

**文件**：
- `src/types/user.types.ts` - 包含 `interface UserDto`，违反规范
- `src/types/tier.types.ts` - 可保留（配置类型）
- `src/types/shared.types.ts` - 需评估是否应该在 DTO 中

**改造方案**：
- 将验证相关的类型移动到对应模块的 `dto/*.schema.ts`
- 仅保留真正的共享配置类型

---

## 二、桌面端 (apps/pc) 改造清单

### 2.1 散落的组件文件 - 高优先级

**问题**：部分组件直接放在 `components/` 根目录，未使用目录结构

**需要改造的文件**：

| 文件 | 改造方案 |
|------|----------|
| `components/MarkdownEditor.tsx` | 移动到 `components/markdown-editor/MarkdownEditor.tsx` |
| `components/login-form.tsx` | 移动到 `components/login-form/LoginForm.tsx` |
| `components/otp-form.tsx` | 移动到 `components/otp-form/OtpForm.tsx` |

**标准结构**：

```
components/
├── login-form/
│   ├── index.ts
│   ├── LoginForm.tsx
│   └── hooks/           # 可选
├── otp-form/
│   ├── index.ts
│   └── OtpForm.tsx
└── markdown-editor/
    ├── index.ts
    └── MarkdownEditor.tsx
```

### 2.2 组件目录结构规范化 - 中优先级

**需要检查的目录**：

| 目录 | 状态 | 需要改造 |
|------|------|----------|
| `chat-pane/` | 有 index.tsx | 检查是否有 const.ts |
| `settings-dialog/` | 有 index.tsx | 结构良好 |
| `vault-files/` | 有 index.tsx | 检查子组件结构 |
| `cloud-sync/` | 有 index.tsx | 检查结构 |
| `payment-dialog/` | 有 index.tsx | 检查结构 |

**改造原则**：
- 每个组件目录必须有 `index.ts` 导出
- 复杂组件应有 `const.ts` 分离常量
- 组件专属 hooks 放在 `hooks/` 子目录

### 2.3 主进程代码检查 - 低优先级

**src/main/** 目录整体结构良好，按功能模块化：

- `agent-runtime/` - Agent 运行时
- `chat/` - 聊天服务
- `cloud-sync/` - 云同步
- `vault/` - 知识库

**待检查**：
- 各模块内部是否有类型定义混乱
- 是否有过大的文件需要拆分

---

## 三、移动端 (apps/mobile) 改造清单

### 3.1 散落的组件文件 - 高优先级

**问题**：大量组件直接放在 `components/` 根目录

**需要改造的文件**：

| 文件 | 改造方案 |
|------|----------|
| `user-avatar.tsx` | 移动到 `user-avatar/UserAvatar.tsx` |
| `sign-in-form.tsx` | 移动到 `sign-in-form/SignInForm.tsx` |
| `sign-up-form.tsx` | 移动到 `sign-up-form/SignUpForm.tsx` |
| `forgot-password-form.tsx` | 移动到 `forgot-password-form/ForgotPasswordForm.tsx` |
| `verify-email-form.tsx` | 移动到 `verify-email-form/VerifyEmailForm.tsx` |
| `language-selector.tsx` | 移动到 `language-selector/LanguageSelector.tsx` |
| `theme-toggle.tsx` | 移动到 `theme-toggle/ThemeToggle.tsx` |
| `user-menu.tsx` | 移动到 `user-menu/UserMenu.tsx` |
| `social-connections.tsx` | 移动到 `social-connections/SocialConnections.tsx` |
| `password-strength-indicator.tsx` | 移动到 `password-strength-indicator/PasswordStrengthIndicator.tsx` |

### 3.2 认证相关组件整合 - 建议

**当前状态**：认证相关组件散落各处

**建议方案**：创建 `auth/` 目录整合认证组件

```
components/
├── auth/
│   ├── index.ts
│   ├── SignInForm/
│   ├── SignUpForm/
│   ├── ForgotPasswordForm/
│   ├── VerifyEmailForm/
│   └── SocialConnections/
├── user/
│   ├── UserAvatar/
│   └── UserMenu/
└── settings/
    ├── LanguageSelector/
    └── ThemeToggle/
```

### 3.3 现有目录结构检查 - 中优先级

| 目录 | 状态 | 改造需求 |
|------|------|----------|
| `chat/` | 结构良好 | 检查 index.ts 导出 |
| `vault/` | 有大文件 | FileList.tsx 可能需要拆分 |
| `editor/` | 需检查 | 确认结构规范 |
| `settings/` | 需检查 | 确认结构规范 |
| `navigation/` | 需检查 | 确认结构规范 |

---

## 四、后台管理 (apps/admin) 改造清单

### 4.1 types/ 目录问题 - 高优先级

**问题**：`src/types/` 包含大量类型定义，部分应该在 features 模块中

**文件**：
- `api.ts` - 5756 行，过大，需要拆分
- `payment.ts` - 2186 行
- `storage.ts` - 3451 行

**改造方案**：
- 将类型定义移动到对应的 `features/*/types.ts`
- `src/types/` 仅保留全局共享类型

### 4.2 features 模块结构 - 中优先级

**现有模块**：
- `chat/` - 聊天
- `auth/` - 认证
- `image-generation/` - 图片生成
- `payment/` - 支付
- `providers/` - 服务商
- `models/` - 模型
- `storage/` - 存储
- `alerts/` - 告警
- `dashboard/` - 仪表盘
- `agent-traces/` - Agent 追踪
- `sites/` - 站点
- `users/` - 用户
- `admin-logs/` - 管理日志

**标准结构**：

```
features/
├── feature-name/
│   ├── index.ts          # 导出
│   ├── api.ts            # API 调用
│   ├── hooks.ts          # React Query hooks
│   ├── types.ts          # 类型定义
│   ├── const.ts          # 常量
│   └── components/       # 组件目录
│       ├── index.ts
│       └── ComponentName.tsx
```

### 4.3 页面组件检查 - 低优先级

**pages/ 目录**：需要确认各页面是否过于臃肿，是否应该拆分到 features

---

## 五、共享包 (packages) 改造清单

### 5.1 shared-api - 中优先级

**问题**：需要确认类型定义是否与后端 DTO 保持同步

**改造方案**：
- 考虑从后端 Zod schemas 自动生成前端类型
- 或使用 OpenAPI 自动生成

### 5.2 agents-* 包 - 低优先级

**现状**：结构相对清晰

**需检查**：
- 导出是否规范
- 类型定义是否完整

---

## 六、改造优先级总结

### P0 - 立即改造

1. **后端 DTO 迁移到 Zod**
   - 工作量：大
   - 影响：运行时验证、OpenAPI 文档生成
   - 建议：逐模块改造，从新模块开始

### P1 - 近期改造

2. **前端散落组件整理**
   - PC: 3 个文件
   - Mobile: 10+ 个文件
   - 工作量：中
   - 影响：代码可维护性

3. **后端模块目录规范化**
   - 创建缺失的 dto/ 目录
   - 分离 constants、errors 文件
   - 工作量：中

### P2 - 中期改造

4. **Admin types 拆分**
   - 工作量：中
   - 影响：代码组织

5. **组件目录结构规范化**
   - 添加缺失的 index.ts、const.ts
   - 工作量：小

### P3 - 长期优化

6. **shared-api 类型同步机制**
7. **大文件拆分**

---

## 七、改造流程建议

### 阶段一：后端 DTO 改造 (2-3 周)

1. 安装依赖：`@wahyubucil/nestjs-zod-openapi`
2. 创建模板文件：`dto/template.schema.ts`
3. 逐模块改造，从简单模块开始
4. 更新 Controller 使用新 DTO
5. 验证 OpenAPI 文档生成

### 阶段二：前端组件整理 (1 周)

1. 创建新目录结构
2. 移动文件
3. 更新导入路径
4. 验证构建

### 阶段三：持续规范化

1. 新代码必须遵循规范
2. 代码评审时检查规范
3. 逐步改造存量代码

---

## 八、注意事项

1. **不做兼容**：按照规范，直接删除无用代码，不保留废弃注释
2. **逐步改造**：避免大规模重构导致的风险
3. **测试覆盖**：改造前确保有足够的测试覆盖
4. **文档同步**：改造后更新相关 AGENTS.md

---

## 附录：快速检查清单

### 后端模块检查

- [ ] 是否有 dto/ 目录
- [ ] DTO 是否使用 Zod schemas
- [ ] 是否有 constants.ts 分离常量
- [ ] 是否有 errors.ts 分离自定义错误
- [ ] types.ts 是否仅包含外部 API 类型

### 前端组件检查

- [ ] 组件是否在独立目录中
- [ ] 是否有 index.ts 导出
- [ ] 是否有 const.ts 分离常量
- [ ] 组件专属 hooks 是否在 hooks/ 目录
