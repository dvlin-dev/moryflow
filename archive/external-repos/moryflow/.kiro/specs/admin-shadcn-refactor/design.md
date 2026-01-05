# 设计文档

## 概述

本设计文档描述了 moryflow-membership/admin 管理后台使用 shadcn/ui 进行重构的技术方案。重构将采用 shadcn/ui 组件库替换现有自定义组件，使用 dashboard-01 和 login-04 block 模板作为基础布局，同时完善 AI 提供商和模型管理功能。

## 重构准则

本次重构遵循以下核心准则：

### 最佳实践优先

- **无历史包袱**: 不做向后兼容，直接采用最干净的最佳实践方案
- **彻底重构**: 遇到代码不合理或非最优解的地方，直接重构而非打补丁
- **删除无用代码**: 不标记废弃，直接删除无用代码，保持代码库干净
- **完整实现**: 功能必须完整实现，不允许"半成品"或"低配版本"

### 代码组织原则

- **单一职责**: 每个文件只负责一个明确的职责
- **模块化**: 按功能模块组织代码，避免大文件
- **类型安全**: 严格的 TypeScript 类型定义，禁止 `any` 类型
- **易读易懂**: 代码结构清晰，命名语义化，必要时添加注释

### 文件组织规范

```
features/{feature}/
├── index.ts              # 模块导出入口
├── types.ts              # 类型定义
├── api.ts                # API 调用函数
├── hooks/                # React Hooks
│   ├── use-{feature}.ts
│   └── use-{feature}-mutations.ts
├── components/           # UI 组件
│   ├── {feature}-list.tsx
│   ├── {feature}-form.tsx
│   └── {feature}-dialog.tsx
└── utils.ts              # 工具函数（如有）
```

### 组件设计规范

- **Props 类型**: 每个组件必须定义明确的 Props 接口
- **组件拆分**: 超过 150 行的组件必须拆分为子组件
- **状态提升**: 共享状态提升到最近的公共父组件或使用 Zustand
- **副作用隔离**: 副作用逻辑封装在自定义 Hook 中

## 架构

### 整体架构

```
moryflow-membership/admin/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui 组件（新增）
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   ├── layout/                # 布局组件
│   │   │   ├── app-sidebar.tsx    # 侧边栏
│   │   │   ├── nav-main.tsx       # 主导航
│   │   │   └── nav-user.tsx       # 用户菜单
│   │   └── shared/                # 共享业务组件
│   │       ├── tier-badge.tsx     # 等级徽章
│   │       ├── data-table.tsx     # 数据表格
│   │       └── page-header.tsx    # 页面标题
│   ├── features/
│   │   ├── auth/                  # 认证模块
│   │   ├── dashboard/             # 仪表盘模块
│   │   ├── users/                 # 用户管理模块
│   │   ├── providers/             # 提供商管理模块
│   │   ├── models/                # 模型管理模块
│   │   └── admin-logs/            # 操作日志模块
│   ├── lib/
│   │   ├── api-client.ts          # API 客户端
│   │   └── utils.ts               # 工具函数
│   ├── stores/
│   │   └── auth.ts                # 认证状态
│   ├── pages/                     # 页面组件
│   ├── App.tsx                    # 应用入口
│   └── main.tsx                   # 渲染入口
```

### 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 7.x | 构建工具 |
| shadcn/ui | latest | UI 组件库 |
| Tailwind CSS | 4.x | 样式方案 |
| TanStack Query | 5.x | 数据获取与缓存 |
| React Router | 7.x | 路由管理 |
| Zustand | 5.x | 状态管理 |
| React Hook Form | 7.x | 表单处理 |
| Zod | 4.x | 数据验证 |
| Sonner | 2.x | Toast 通知 |
| Recharts | 2.x | 图表 |

## 组件与接口

### shadcn/ui 组件集成

#### 组件目录结构

```typescript
// src/components/ui/index.ts - 统一导出
export * from './button'
export * from './card'
export * from './dialog'
export * from './form'
export * from './input'
export * from './label'
export * from './select'
export * from './table'
export * from './sidebar'
export * from './skeleton'
export * from './badge'
export * from './switch'
export * from './separator'
export * from './dropdown-menu'
export * from './avatar'
export * from './tooltip'
export * from './calendar'
export * from './popover'
export * from './command'
export * from './sheet'
export * from './breadcrumb'
export * from './pagination'
export * from './tabs'
export * from './textarea'
export * from './checkbox'
export * from './radio-group'
export * from './alert'
export * from './alert-dialog'
export * from './scroll-area'
export * from './collapsible'
export * from './chart'
```

#### 现有组件处理策略

**直接删除的组件**（由 shadcn/ui 完全替代）:
- `Button.tsx` → 删除，使用 `ui/button.tsx`
- `Card.tsx` → 删除，使用 `ui/card.tsx`
- `Dialog.tsx` → 删除，使用 `ui/dialog.tsx`
- `Form.tsx` → 删除，使用 `ui/form.tsx` + `ui/input.tsx`
- `Pagination.tsx` → 删除，使用 `ui/pagination.tsx`
- `Layout.tsx` → 删除，使用 dashboard-01 模板重构
- `index.ts` → 删除，不再需要统一导出

**重构保留的组件**（使用 shadcn 原语重写）:
- `DataTable.tsx` → 移至 `shared/data-table.tsx`，使用 shadcn table 重写
- `TierBadge.tsx` → 移至 `shared/tier-badge.tsx`，使用 shadcn badge 重写
- `PageHeader.tsx` → 移至 `shared/page-header.tsx`，使用 shadcn 组件重写

**最终 components 目录结构**:
```
src/components/
├── ui/                    # shadcn/ui 组件（自动生成）
├── layout/                # 布局组件
│   ├── app-sidebar.tsx
│   ├── nav-main.tsx
│   └── nav-user.tsx
└── shared/                # 共享业务组件
    ├── data-table.tsx
    ├── tier-badge.tsx
    └── page-header.tsx
```

### 布局组件

#### AppSidebar 组件

```typescript
// src/components/layout/app-sidebar.tsx
interface AppSidebarProps {
  user: {
    id: string
    email: string
    name?: string
    avatar?: string
  }
}

// 导航项配置
const navItems = [
  { title: '仪表盘', url: '/', icon: LayoutDashboard },
  { title: '用户管理', url: '/users', icon: Users },
  { title: '提供商', url: '/providers', icon: Server },
  { title: '模型', url: '/models', icon: Bot },
  { title: '操作日志', url: '/logs', icon: FileText },
]
```

### API 接口

#### 提供商管理 API

```typescript
// GET /admin/providers - 获取提供商列表
interface Provider {
  id: string
  name: string           // 提供商名称 (OpenAI, Anthropic, etc.)
  apiEndpoint: string    // API 端点
  apiKeyHash: string     // API Key 哈希（不返回原始 Key）
  isEnabled: boolean     // 是否启用
  createdAt: string
  updatedAt: string
}

// POST /admin/providers - 创建提供商
interface CreateProviderRequest {
  name: string
  apiEndpoint: string
  apiKey: string
}

// PATCH /admin/providers/:id - 更新提供商
interface UpdateProviderRequest {
  name?: string
  apiEndpoint?: string
  apiKey?: string
  isEnabled?: boolean
}

// DELETE /admin/providers/:id - 删除提供商
```

#### 模型管理 API

```typescript
// GET /admin/models - 获取模型列表
interface Model {
  id: string
  name: string              // 模型名称 (gpt-4, claude-3, etc.)
  providerId: string        // 关联的提供商 ID
  providerName: string      // 提供商名称
  minTier: 'free' | 'basic' | 'pro' | 'license'  // 最低等级要求
  inputPricePerToken: number   // 输入 token 价格
  outputPricePerToken: number  // 输出 token 价格
  isEnabled: boolean        // 是否启用
  createdAt: string
  updatedAt: string
}

// POST /admin/models - 创建模型
interface CreateModelRequest {
  name: string
  providerId: string
  minTier: string
  inputPricePerToken: number
  outputPricePerToken: number
}

// PATCH /admin/models/:id - 更新模型
interface UpdateModelRequest {
  name?: string
  providerId?: string
  minTier?: string
  inputPricePerToken?: number
  outputPricePerToken?: number
  isEnabled?: boolean
}

// DELETE /admin/models/:id - 删除模型
```

## 数据模型

### Zod 验证模式

```typescript
// src/lib/validations/auth.ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少 6 个字符'),
})

// src/lib/validations/user.ts
export const setTierSchema = z.object({
  tier: z.enum(['free', 'basic', 'pro', 'license'], {
    required_error: '请选择用户等级',
  }),
})

export const grantCreditsSchema = z.object({
  type: z.enum(['subscription', 'purchased'], {
    required_error: '请选择积分类型',
  }),
  amount: z.number().min(1, '积分数量至少为 1'),
  expiresAt: z.date().optional(),
  reason: z.string().optional(),
})

// src/lib/validations/provider.ts
export const providerSchema = z.object({
  name: z.string().min(1, '请输入提供商名称'),
  apiEndpoint: z.string().url('请输入有效的 API 端点'),
  apiKey: z.string().min(1, '请输入 API Key'),
})

// src/lib/validations/model.ts
export const modelSchema = z.object({
  name: z.string().min(1, '请输入模型名称'),
  providerId: z.string().min(1, '请选择提供商'),
  minTier: z.enum(['free', 'basic', 'pro', 'license']),
  inputPricePerToken: z.number().min(0, '价格不能为负数'),
  outputPricePerToken: z.number().min(0, '价格不能为负数'),
})
```

### 状态管理

```typescript
// src/stores/auth.ts
interface AuthState {
  token: string | null
  userId: string | null
  isAuthenticated: boolean
  setAuth: (token: string, userId: string) => void
  logout: () => void
}
```

## 正确性属性

*属性是系统在所有有效执行中应保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性反思

在分析验收标准后，识别出以下可合并或冗余的属性：

1. 搜索和筛选属性可以合并为通用的"列表过滤属性"
2. 多个 API 调用测试可以合并为"API 请求正确性属性"
3. 多个状态切换测试可以合并为"状态切换一致性属性"
4. 表单验证相关的属性可以合并为"表单验证属性"

### 属性 1: 认证状态一致性

*对于任意*认证操作（登录/退出），认证状态应与操作结果保持一致：登录成功后 isAuthenticated 为 true，退出后为 false
**验证: 需求 2.2, 4.3**

### 属性 2: 列表过滤正确性

*对于任意*列表数据和筛选条件，过滤后的结果应仅包含满足所有筛选条件的项目
**验证: 需求 5.2, 5.3, 9.2, 9.3**

### 属性 3: 健康状态显示正确性

*对于任意*健康状态数据（healthy/degraded/unhealthy），UI 应显示对应的颜色指示器（绿色/黄色/红色）
**验证: 需求 3.2**

### 属性 4: 数据渲染完整性

*对于任意*数据对象（用户/提供商/模型/日志），渲染后的 UI 应包含所有必要字段
**验证: 需求 5.1, 6.1, 7.1, 8.1, 9.1**

### 属性 5: 表单验证正确性

*对于任意*表单输入，Zod 验证应正确识别无效输入并返回对应的错误消息
**验证: 需求 10.1, 10.4**

### 属性 6: API 错误处理一致性

*对于任意* API 错误响应，系统应显示错误 toast 通知
**验证: 需求 2.3, 10.2**

### 属性 7: API 成功反馈一致性

*对于任意*成功的变更操作，系统应显示成功 toast 并使相关缓存失效
**验证: 需求 10.3, 12.2**

### 属性 8: 导航高亮正确性

*对于任意*路由路径，侧边栏中对应的导航项应处于高亮状态
**验证: 需求 4.2**

### 属性 9: 状态切换一致性

*对于任意*实体（提供商/模型）的状态切换操作，切换后的状态应与操作意图一致
**验证: 需求 7.4, 8.4**

### 属性 10: 等级变更正确性

*对于任意*用户等级变更操作，变更后用户的等级应与提交的等级一致
**验证: 需求 6.4**

### 属性 11: 积分发放正确性

*对于任意*积分发放操作，发放后用户的积分余额应增加相应数量
**验证: 需求 6.5**

## 错误处理

### API 错误处理

```typescript
// src/lib/api-client.ts
class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      // 清除认证状态，重定向到登录页
      useAuthStore.getState().logout()
      throw new ApiError(401, 'UNAUTHORIZED', '登录已过期，请重新登录')
    }
    
    const error = await response.json().catch(() => ({}))
    throw new ApiError(
      response.status,
      error.code || 'UNKNOWN_ERROR',
      error.message || '请求失败'
    )
  }
  
  return response.json()
}
```

### 表单错误处理

```typescript
// 使用 React Hook Form + Zod 的错误处理
const form = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
})

// 表单提交错误处理
const onSubmit = async (data: LoginFormData) => {
  try {
    await loginMutation.mutateAsync(data)
    toast.success('登录成功')
  } catch (error) {
    if (error instanceof ApiError) {
      toast.error(error.message)
    } else {
      toast.error('登录失败，请稍后重试')
    }
  }
}
```

## 测试策略

### 单元测试

使用 Vitest 进行单元测试：

- **Zod 验证模式测试**: 验证各种输入的验证结果
- **工具函数测试**: 验证格式化、转换等工具函数
- **状态管理测试**: 验证 Zustand store 的状态变更

### 属性测试

使用 fast-check 进行属性测试：

```typescript
// 配置: 每个属性测试运行至少 100 次迭代
import fc from 'fast-check'

// 属性测试示例
describe('列表过滤正确性', () => {
  it('过滤后的结果应仅包含满足筛选条件的项目', () => {
    fc.assert(
      fc.property(
        fc.array(userArbitrary),
        fc.constantFrom('free', 'basic', 'pro', 'license'),
        (users, tier) => {
          const filtered = filterUsersByTier(users, tier)
          return filtered.every(user => user.tier === tier)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### 组件测试

使用 React Testing Library 进行组件测试：

- **渲染测试**: 验证组件正确渲染
- **交互测试**: 验证用户交互行为
- **状态测试**: 验证组件状态变化

### 测试文件组织

```
src/
├── lib/
│   ├── validations/
│   │   ├── auth.ts
│   │   └── auth.test.ts
│   └── utils.ts
│       └── utils.test.ts
├── features/
│   ├── users/
│   │   ├── hooks/
│   │   │   └── use-users.test.ts
│   │   └── components/
│   │       └── user-list.test.tsx
```

## 页面设计

### 登录页面 (login-04 模板)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    Moryflow 管理后台                      │
│                    请输入管理员账号登录                    │
│                                                         │
│                 ┌─────────────────────┐                 │
│                 │ 管理员邮箱           │                 │
│                 │ admin@example.com   │                 │
│                 └─────────────────────┘                 │
│                                                         │
│                 ┌─────────────────────┐                 │
│                 │ 密码                 │                 │
│                 │ ••••••••            │                 │
│                 └─────────────────────┘                 │
│                                                         │
│                 ┌─────────────────────┐                 │
│                 │       登 录          │                 │
│                 └─────────────────────┘                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 仪表盘页面 (dashboard-01 模板)

```
┌──────────────────┬──────────────────────────────────────┐
│                  │                                      │
│  Moryflow        │  系统概览                             │
│                  │                                      │
│  ┌────────────┐  │  ┌────────┐ ┌────────┐ ┌────────┐   │
│  │ 仪表盘     │  │  │总用户数 │ │积分消耗 │ │API调用 │   │
│  │ 用户管理   │  │  │  1,234 │ │ 56,789 │ │ 12,345 │   │
│  │ 提供商     │  │  └────────┘ └────────┘ └────────┘   │
│  │ 模型       │  │                                      │
│  │ 操作日志   │  │  系统健康状态                         │
│  └────────────┘  │  ┌────────────────────────────────┐  │
│                  │  │ 数据库: ● 正常  KV: ● 正常      │  │
│  ┌────────────┐  │  └────────────────────────────────┘  │
│  │ admin@...  │  │                                      │
│  │ 退出       │  │  用户等级分布                         │
│  └────────────┘  │  ┌────────────────────────────────┐  │
│                  │  │ [图表]                          │  │
│                  │  └────────────────────────────────┘  │
└──────────────────┴──────────────────────────────────────┘
```

### 用户管理页面

```
┌──────────────────┬──────────────────────────────────────┐
│                  │                                      │
│  侧边栏          │  用户管理                             │
│                  │                                      │
│                  │  ┌──────────────┐ ┌────────────┐     │
│                  │  │ 搜索用户...   │ │ 等级筛选 ▼ │     │
│                  │  └──────────────┘ └────────────┘     │
│                  │                                      │
│                  │  ┌────────────────────────────────┐  │
│                  │  │ 邮箱    │ 等级  │ 积分  │ 操作 │  │
│                  │  ├────────────────────────────────┤  │
│                  │  │ a@b.com │ Pro   │ 1000  │ 查看 │  │
│                  │  │ c@d.com │ Free  │ 100   │ 查看 │  │
│                  │  └────────────────────────────────┘  │
│                  │                                      │
│                  │  ◀ 1 2 3 ... 10 ▶                    │
│                  │                                      │
└──────────────────┴──────────────────────────────────────┘
```

### 提供商管理页面

```
┌──────────────────┬──────────────────────────────────────┐
│                  │                                      │
│  侧边栏          │  AI 提供商管理        [+ 添加提供商]  │
│                  │                                      │
│                  │  ┌────────────────────────────────┐  │
│                  │  │ ┌──────────────────────────┐   │  │
│                  │  │ │ OpenAI                   │   │  │
│                  │  │ │ https://api.openai.com   │   │  │
│                  │  │ │ 状态: ● 启用    [编辑]   │   │  │
│                  │  │ └──────────────────────────┘   │  │
│                  │  │                                │  │
│                  │  │ ┌──────────────────────────┐   │  │
│                  │  │ │ Anthropic                │   │  │
│                  │  │ │ https://api.anthropic.com│   │  │
│                  │  │ │ 状态: ○ 禁用    [编辑]   │   │  │
│                  │  │ └──────────────────────────┘   │  │
│                  │  └────────────────────────────────┘  │
│                  │                                      │
└──────────────────┴──────────────────────────────────────┘
```

### 模型管理页面

```
┌──────────────────┬──────────────────────────────────────┐
│                  │                                      │
│  侧边栏          │  AI 模型管理            [+ 添加模型]  │
│                  │                                      │
│                  │  ┌────────────────────────────────┐  │
│                  │  │ 名称     │提供商│等级 │价格│状态│  │
│                  │  ├────────────────────────────────┤  │
│                  │  │ gpt-4    │OpenAI│Pro  │0.03│ ● │  │
│                  │  │ gpt-3.5  │OpenAI│Free │0.01│ ● │  │
│                  │  │ claude-3 │Anthr.│Pro  │0.02│ ○ │  │
│                  │  └────────────────────────────────┘  │
│                  │                                      │
│                  │  ◀ 1 2 3 ▶                           │
│                  │                                      │
└──────────────────┴──────────────────────────────────────┘
```
