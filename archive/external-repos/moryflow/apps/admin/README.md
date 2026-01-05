# Moryflow 管理后台

Moryflow 会员系统的前端管理后台，用于管理用户、查看系统状态和操作日志。

## 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite 7
- **路由**: React Router v7
- **状态管理**: Zustand
- **数据获取**: TanStack Query
- **表单处理**: React Hook Form + Zod
- **样式**: Tailwind CSS 4
- **UI 组件**: 自定义组件（符合 Arc + Notion 设计风格）

## 功能特性

### 1. 系统概览（Dashboard）

- 系统健康状态监控（数据库、KV 存储）
- 用户统计（总用户数、付费用户数、等级分布）
- 积分消耗和 API 调用统计
- 自动刷新（健康状态每 30 秒更新）

### 2. 用户管理

- 用户列表（支持分页和筛选）
- 用户详情查看
- 设置用户等级（free/basic/pro/license）
- 发放积分（订阅积分/购买积分）
- 查看 API Keys

### 3. 操作日志

- 查看所有管理员操作记录
- 按时间、操作人、操作类型筛选
- 查看操作详情（JSON 格式）

## 开发指南

### 安装依赖

在项目根目录运行：

```bash
pnpm install
```

### 本地开发

#### 1. 启动后端服务

在项目根目录运行：

```bash
pnpm dev
```

后端服务会在 `http://localhost:8787` 启动。

#### 2. 启动前端开发服务器

在根目录运行：

```bash
pnpm dev:admin
```

或者在 `admin/` 目录下运行：

```bash
cd admin
pnpm dev
```

前端开发服务器会在 `http://localhost:5173` 启动。

### 环境变量

开发环境和生产环境使用不同的 API 地址：

- **开发环境** (`.env.development`): `http://localhost:8787`
- **生产环境** (`.env.production`): `https://server.moryflow.com`

### 构建

构建生产版本：

```bash
cd admin
pnpm build
```

构建产物会生成在 `admin/dist/` 目录。

### 预览生产构建

```bash
cd admin
pnpm preview
```

## 项目结构

```
admin/
├── src/
│   ├── components/       # 共享组件
│   │   └── Layout.tsx    # 布局组件（导航栏等）
│   ├── pages/            # 页面组件
│   │   ├── LoginPage.tsx         # 登录页面
│   │   ├── DashboardPage.tsx     # 系统概览
│   │   ├── UsersPage.tsx         # 用户列表
│   │   ├── UserDetailPage.tsx    # 用户详情
│   │   └── LogsPage.tsx          # 操作日志
│   ├── stores/           # 状态管理
│   │   └── auth.ts       # 认证状态
│   ├── lib/              # 工具函数
│   │   ├── utils.ts      # 通用工具
│   │   └── api-client.ts # API 客户端
│   ├── types/            # 类型定义
│   │   └── api.ts        # API 类型
│   ├── styles/           # 全局样式
│   │   └── globals.css   # 全局 CSS（Tailwind）
│   ├── App.tsx           # 应用入口
│   └── main.tsx          # React 入口
├── public/               # 静态资源
├── .env.development      # 开发环境配置
├── .env.production       # 生产环境配置
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TypeScript 配置
└── package.json
```

## 认证说明

### 当前实现（简化版）

当前使用简化的认证方式：

1. 用户在登录页面输入用户 ID
2. 系统生成临时 token
3. Token 存储在 localStorage
4. 所有 API 请求携带 token

### 未来改进

生产环境应该实现完整的认证系统：

1. 与后端 Better Auth 集成
2. 邮箱密码登录
3. 管理员权限验证
4. Token 自动刷新
5. 安全的会话管理

## 设计规范

遵循 **Arc + Notion** 融合的设计风格：

### 核心原则

- 简约克制、层次分明、交互流畅
- 黑白灰主色调，彩色用于强调
- 圆润边角，充足留白
- 微妙阴影，自然动效

### 具体实现

- 圆角: 按钮 6px，卡片 8px，面板 12px
- 间距: 充足的内边距和外边距
- 阴影: 微妙的 box-shadow，hover 时加深
- 动效: 使用 transition-colors 实现平滑过渡

## API 接口

管理后台调用以下后端 API：

### 认证

- 当前使用简化认证（临时实现）

### 用户管理

- `GET /admin/users` - 获取用户列表
- `GET /admin/users/:id` - 获取用户详情
- `POST /admin/users/:id/tier` - 设置用户等级
- `POST /admin/users/:id/credits` - 发放积分

### 系统监控

- `GET /admin/stats` - 获取系统统计
- `GET /health` - 健康检查

### 操作日志

- `GET /admin/logs` - 获取操作日志

## 部署

### Cloudflare Pages（推荐）

1. 连接 GitHub 仓库
2. 配置构建设置：
   - **构建命令**: `cd admin && pnpm build`
   - **构建输出目录**: `admin/dist`
   - **环境变量**: `VITE_API_URL=https://server.moryflow.com`

3. 自动部署

### 其他平台

也可以部署到 Vercel、Netlify 等平台，配置类似。

## 常见问题

### Q: 登录后无法访问 API

**A**: 检查后端服务是否运行，以及环境变量 `VITE_API_URL` 是否正确。

### Q: 样式不生效

**A**: 确保 Tailwind CSS 配置正确，并且 `globals.css` 已导入。

### Q: 类型错误

**A**: 运行 `pnpm run type-check` 检查类型问题。

## 开发计划

- [ ] 完整的 Better Auth 集成
- [ ] 多语言支持（i18n）
- [ ] 暗色模式
- [ ] 数据导出功能（CSV/Excel）
- [ ] 实时通知（WebSocket）
- [ ] 权限细化（多个管理员，不同权限）

## 许可证

私有项目
