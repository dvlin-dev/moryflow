# templates/auth-service

> 独立部署的 Auth 服务模板（可用于新业务线快速复用）

## 定位

为任意项目提供一套可直接运行的 Auth Service，封装 `@aiget/auth-server` 与 `@aiget/identity-db`，产出统一的 `/api/v1/auth/*` 入口。

## 职责

- 组装 Auth Facade 路由与 JWT 校验
- 连接独立的 Identity 数据库
- 支持 Google/Apple 登录（可选）
- 提供最小健康检查 `/health`

## 约束

- 必须设置 `BETTER_AUTH_SECRET` 与 `IDENTITY_DATABASE_URL`
- 生产环境必须配置 `TRUSTED_ORIGINS` 与 `COOKIE_DOMAIN`
- 不包含业务线私有逻辑，仅提供通用认证能力

## 目录结构

| 路径                              | 说明                           |
| --------------------------------- | ------------------------------ |
| `src/main.ts`                     | 启动入口（CORS/版本/路由前缀） |
| `src/app.module.ts`               | 应用模块组合                   |
| `src/auth/auth.module.ts`         | Auth 模块与 Better Auth 实例   |
| `src/prisma/prisma.module.ts`     | Identity Prisma 客户端         |
| `src/health/health.controller.ts` | 健康检查                       |
| `.env.example`                    | 环境变量示例                   |
| `docker-compose.yml`              | 本地 Postgres 示例             |

## 运行方式（摘要）

- 本仓库内：复制到 `apps/*/server` 或加入 workspace
- 外部项目：复制模板 + 替换依赖版本
- 参考 `README.md` 获取完整步骤与配置说明
