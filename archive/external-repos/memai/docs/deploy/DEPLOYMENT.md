# Dokploy 部署指南

## 概述

Memory 由三个服务组成：

| 服务 | Dockerfile | 端口 | 描述 |
|------|------------|------|------|
| Server | `Dockerfile` | 3000 | NestJS API 后端 |
| Console | `Dockerfile.console` | 80 | 用户控制台前端 |
| Admin | `Dockerfile.admin` | 80 | 管理后台前端 |

## 前置要求

- Dokploy 已安装并运行
- PostgreSQL 数据库
- Redis（用于 BullMQ 队列）
- S3 兼容存储（用于截图存储）

## 部署步骤

### 1. 创建项目

在 Dokploy 中创建新项目 `memory`。

### 2. 部署 Server

1. 添加新服务，选择 **Application**
2. 配置源码：
   - **Source**: GitHub/GitLab
   - **Repository**: 你的仓库地址
   - **Branch**: `main`
   - **Build Path**: `.`
   - **Dockerfile**: `Dockerfile`

3. 配置环境变量：

```env
# 数据库
DATABASE_URL=postgresql://user:password@host:5432/memory?schema=public

# Redis
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Better Auth
BETTER_AUTH_SECRET=your-32-char-secret
BETTER_AUTH_URL=https://api.memory.dev

# S3 存储
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=memory
S3_ENDPOINT=https://s3.region.amazonaws.com
S3_REGION=us-east-1

# Resend 邮件
RESEND_API_KEY=re_xxxxx

# Creem 支付
CREEM_API_KEY=your-creem-key
CREEM_WEBHOOK_SECRET=your-webhook-secret
```

4. 配置域名：`api.memory.dev`

5. 启用 HTTPS

### 3. 部署 Console

1. 添加新服务，选择 **Application**
2. 配置源码：
   - **Source**: GitHub/GitLab
   - **Repository**: 你的仓库地址
   - **Branch**: `main`
   - **Build Path**: `.`
   - **Dockerfile**: `Dockerfile.console`

3. 配置构建参数（Build Args）：

```env
VITE_API_URL=https://api.memory.dev
```

4. 配置域名：`console.memory.dev`

5. 启用 HTTPS

### 4. 部署 Admin

1. 添加新服务，选择 **Application**
2. 配置源码：
   - **Source**: GitHub/GitLab
   - **Repository**: 你的仓库地址
   - **Branch**: `main`
   - **Build Path**: `.`
   - **Dockerfile**: `Dockerfile.admin`

3. 配置构建参数（Build Args）：

```env
VITE_API_URL=https://api.memory.dev
```

4. 配置域名：`admin.memory.dev`

5. 启用 HTTPS

## 域名配置示例

```
api.memory.dev     -> Server (端口 3000)
console.memory.dev -> Console (端口 80)
admin.memory.dev   -> Admin (端口 80)
```

## 健康检查

所有服务都暴露 `/health` 端点：

```bash
# Server
curl https://api.memory.dev/health

# Console
curl https://console.memory.dev/health

# Admin
curl https://admin.memory.dev/health
```

## 数据库迁移

Server 启动时会自动运行 `prisma db push`。

如需手动迁移：

```bash
# 进入 Server 容器
dokploy exec <server-service-id> -- prisma db push
```

## 本地 Docker 构建测试

```bash
# 构建 Server
docker build -t memory-server -f Dockerfile .

# 构建 Console
docker build -t memory-console -f Dockerfile.console \
  --build-arg VITE_API_URL=http://localhost:3000 .

# 构建 Admin
docker build -t memory-admin -f Dockerfile.admin \
  --build-arg VITE_API_URL=http://localhost:3000 .
```

## 故障排查

### 前端无法连接 API

1. 检查 `VITE_API_URL` 构建参数是否正确
2. 检查 Server 是否正常运行
3. 检查 CORS 配置（Server 默认允许所有来源）

### 数据库连接失败

1. 检查 `DATABASE_URL` 格式是否正确
2. 确保 PostgreSQL 允许来自 Dokploy 网络的连接
3. 检查数据库用户权限

### Playwright 截图失败

1. 确保使用 `node:22-slim` 基础镜像（非 Alpine）
2. 检查 Chromium 依赖是否完整安装
3. 查看容器日志中的错误信息
