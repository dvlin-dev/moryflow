# MoryFlow 服务端部署指南

本文档提供 MoryFlow 服务端的完整部署流程，包括 Docker 部署、生产环境配置和常见问题排查。

## 目录

- [前置要求](#前置要求)
- [环境准备](#环境准备)
- [部署方式](#部署方式)
  - [方式一：Docker 部署（推荐）](#方式一docker-部署推荐)
  - [方式二：Docker Compose 部署](#方式二docker-compose-部署)
  - [方式三：传统部署](#方式三传统部署)
- [数据库迁移](#数据库迁移)
- [健康检查](#健康检查)
- [监控与日志](#监控与日志)
- [常见问题](#常见问题)

---

## 前置要求

### 系统要求

- **操作系统**: Linux/macOS/Windows (推荐 Linux)
- **CPU**: 2 核心或更多
- **内存**: 4GB 或更多（推荐 8GB）
- **磁盘**: 20GB 或更多可用空间

### 软件依赖

- **Docker**: 20.10+ 或更高版本
- **Docker Compose**: 2.0+ 或更高版本（如使用 Docker Compose 部署）
- **Node.js**: 18.x 或更高版本（如使用传统部署）
- **pnpm**: 9.0.0+ （如使用传统部署）

### 必需服务

- **PostgreSQL**: 14+ (带 pgvector 扩展)
- **Redis**: 6.0+
- **向量数据库**: PostgreSQL + pgvector

---

## 环境准备

### 1. 创建环境配置文件

从示例文件创建环境配置:

```bash
cp server/.env.example server/.env
```

### 2. 配置环境变量

编辑 `server/.env` 文件，配置以下关键参数:

#### 数据库配置

```env
# 主数据库
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_DATABASE=moryflow
DB_PASSWORD=your_secure_password_here

# Prisma 连接字符串
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/moryflow?schema=public
```

#### 向量数据库配置

```env
VECTOR_DB_HOST=localhost
VECTOR_DB_PORT=5533
VECTOR_DB_USERNAME=postgres
VECTOR_DB_DATABASE=moryflow-vector
VECTOR_DB_PASSWORD=your_secure_password_here

VECTOR_DATABASE_URL=postgresql://postgres:your_password@localhost:5533/moryflow-vector?schema=public
```

#### Redis 配置

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here
REDIS_RECONNECT=true
```

#### OpenAI 配置

```env
OPENAI_TYPE=OPENAI
OPENAI_API_MODEL=gpt-4.1-nano
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=

# 嵌入模型
EMBEDDING_API_KEY=your_embedding_api_key_here
EMBEDDING_BASE_URL=
EMBEDDING_MODEL=text-embedding-v3
```

#### 应用配置

```env
# 应用端口
APP_PORT=13000

# 日志级别: error, warn, info, debug
LOG_LEVEL=info

# JWT 密钥（生产环境必须修改）
JWT_SECRET=generate_a_secure_random_string_here
```

### 3. 生成安全密钥

生成强随机密钥用于 JWT:

```bash
# 方式 1: 使用 openssl
openssl rand -base64 32

# 方式 2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

将生成的密钥替换 `.env` 文件中的 `JWT_SECRET` 值。

---

## 部署方式

### 方式一：Docker 部署（推荐）

Docker 部署提供最佳的一致性和隔离性，适合生产环境。

#### 步骤 1: 构建镜像

**重要**: 必须从项目根目录构建，因为这是一个 monorepo 项目。

```bash
# 切换到项目根目录
cd /path/to/moryflow

# 构建镜像
docker build \
  --platform linux/amd64 \
  -t moryflow-server:latest \
  -f server/Dockerfile.app \
  .
```

**参数说明**:
- `--platform linux/amd64`: 指定目标平台（如需要 ARM 架构，使用 `linux/arm64`）
- `-t moryflow-server:latest`: 镜像标签
- `-f server/Dockerfile.app`: Dockerfile 位置
- `.`: 构建上下文（根目录）

#### 步骤 2: 准备数据库

确保 PostgreSQL 和 Redis 服务已启动并可访问。

```bash
# 如使用 Docker 启动数据库服务
cd server
docker-compose up -d db redis pgvector-db
```

#### 步骤 3: 运行容器

```bash
docker run -d \
  --name moryflow-server \
  --env-file server/.env \
  -p 13000:13000 \
  --restart unless-stopped \
  moryflow-server:latest
```

**参数说明**:
- `-d`: 后台运行
- `--name moryflow-server`: 容器名称
- `--env-file server/.env`: 加载环境变量
- `-p 13000:13000`: 端口映射
- `--restart unless-stopped`: 自动重启策略

#### 步骤 4: 查看日志

```bash
# 实时查看日志
docker logs -f moryflow-server

# 查看最近 100 行日志
docker logs --tail 100 moryflow-server
```

---

### 方式二：Docker Compose 部署

Docker Compose 部署适合一键启动所有服务（数据库 + 应用）。

#### 步骤 1: 配置 Docker Compose

检查 `server/docker-compose.yml` 配置:

```yaml
version: '3.1'

services:
  # PostgreSQL 主数据库
  db:
    image: postgres:17
    restart: always
    environment:
      POSTGRES_DB: ${DB_DATABASE}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "${DB_PORT}:5432"
    volumes:
      - pg-data:/var/lib/postgresql/data

  # Redis 缓存
  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "${REDIS_PORT}:6379"

  # 向量数据库
  pgvector-db:
    image: pgvector/pgvector:pg17
    restart: always
    environment:
      POSTGRES_USER: ${VECTOR_DB_USERNAME}
      POSTGRES_DB: ${VECTOR_DB_DATABASE}
      POSTGRES_PASSWORD: ${VECTOR_DB_PASSWORD}
    ports:
      - "${VECTOR_DB_PORT}:5432"
    volumes:
      - pg-vector-data:/var/lib/postgresql/data
```

#### 步骤 2: 启动所有服务

```bash
cd server
docker-compose up -d
```

#### 步骤 3: 启动应用服务器

如果需要将应用也加入 Docker Compose:

```bash
# 在 docker-compose.yml 中添加应用服务
# 然后执行
docker-compose up -d app
```

---

### 方式三：传统部署

传统部署直接在主机上运行，适合开发环境或特殊需求场景。

#### 步骤 1: 安装依赖

```bash
# 在项目根目录安装所有依赖
pnpm install
```

#### 步骤 2: 构建共享包

```bash
# 构建所有共享包
pnpm --filter "./packages/**" build
```

#### 步骤 3: 生成 Prisma 客户端

```bash
cd server

# 生成主数据库客户端
pnpm prisma:generate

# 生成向量数据库客户端
pnpm prisma:generate:vector
```

#### 步骤 4: 推送数据库 Schema

```bash
# 推送主数据库 schema
pnpm prisma:db:push

# 推送向量数据库 schema
pnpm prisma:db:push:vector
```

#### 步骤 5: 构建应用

```bash
pnpm run build
```

#### 步骤 6: 启动服务

```bash
# 生产模式启动
pnpm run start:prod

# 或使用 PM2 管理进程
pm2 start npm --name "moryflow-server" -- run start:prod
```

---

## 数据库迁移

### 初始化数据库

首次部署时需要推送数据库 schema:

```bash
cd server

# 推送主数据库
npx prisma db push --schema=prisma/schema.prisma

# 推送向量数据库
npx prisma db push --schema=prisma/vector.schema.prisma
```

### 数据库重置（⚠️ 危险操作）

**警告**: 此操作会删除所有数据，仅在开发/测试环境使用。

```bash
# 重置主数据库
npx prisma migrate reset --schema=prisma/schema.prisma --force

# 重置向量数据库
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="yes" \
npx prisma migrate reset --schema=prisma/vector.schema.prisma --skip-seed --force
```

### 生产环境数据库变更

生产环境应使用迁移文件管理 schema 变更:

```bash
# 创建迁移（开发环境）
npx prisma migrate dev --schema=prisma/schema.prisma

# 应用迁移（生产环境）
npx prisma migrate deploy --schema=prisma/schema.prisma
```

---

## 健康检查

### 服务健康检查

```bash
# 使用内置健康检查脚本
cd server
node scripts/health-check.js
```

### API 端点检查

```bash
# 检查服务是否运行
curl http://localhost:13000/

# 检查 Prometheus 指标
curl http://localhost:13000/metrics
```

### Docker 容器健康检查

在 Dockerfile 中配置健康检查:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node scripts/health-check.js || exit 1
```

---

## 监控与日志

### 应用日志

日志位置取决于配置，默认输出到 stdout/stderr。

#### 查看 Docker 日志

```bash
# 实时日志
docker logs -f moryflow-server

# 按时间过滤
docker logs --since 1h moryflow-server

# 导出日志
docker logs moryflow-server > server.log
```

#### 日志级别配置

在 `.env` 中设置:

```env
LOG_LEVEL=info  # error, warn, info, debug
```

### Prometheus 监控

应用暴露 `/metrics` 端点供 Prometheus 采集:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'moryflow-server'
    static_configs:
      - targets: ['localhost:13000']
    metrics_path: '/metrics'
```

### 性能监控

关键指标:
- **请求延迟**: API 响应时间
- **错误率**: HTTP 4xx/5xx 错误比例
- **数据库连接池**: 活跃连接数
- **Redis 连接**: 缓存命中率
- **内存使用**: 应用内存占用

---

## 常见问题

### 1. 构建失败: pnpm-lock.yaml not found

**原因**: 在 `server` 目录运行 `docker build`，无法访问根目录的 `pnpm-lock.yaml`。

**解决方案**:

```bash
# 错误方式（在 server 目录）
cd server
docker build -t moryflow-server -f Dockerfile.app .

# 正确方式（在根目录）
cd /path/to/moryflow
docker build -t moryflow-server -f server/Dockerfile.app .
```

### 2. 容器启动失败: DATABASE_URL 未定义

**原因**: 环境变量未正确传递。

**解决方案**:

```bash
# 检查 .env 文件存在
ls -la server/.env

# 使用 --env-file 显式加载
docker run --env-file server/.env moryflow-server
```

### 3. Prisma 客户端生成失败

**原因**: Prisma schema 格式错误或数据库连接失败。

**解决方案**:

```bash
# 检查 schema 格式
npx prisma format --schema=prisma/schema.prisma

# 测试数据库连接
npx prisma db pull --schema=prisma/schema.prisma
```

### 4. 端口冲突

**原因**: 端口 13000 已被占用。

**解决方案**:

```bash
# 查看端口占用
lsof -i :13000

# 更换端口（修改 .env）
APP_PORT=13001

# 或停止冲突服务
kill -9 $(lsof -ti:13000)
```

### 5. Redis 连接失败

**原因**: Redis 服务未启动或密码错误。

**解决方案**:

```bash
# 检查 Redis 运行状态
docker ps | grep redis

# 测试 Redis 连接
redis-cli -h localhost -p 6379 -a your_password ping

# 启动 Redis
docker-compose up -d redis
```

### 6. 向量数据库扩展缺失

**原因**: PostgreSQL 未安装 pgvector 扩展。

**解决方案**:

```bash
# 使用官方 pgvector 镜像
docker run -d \
  --name pgvector-db \
  -e POSTGRES_PASSWORD=password \
  -p 5433:5432 \
  pgvector/pgvector:pg17

# 或手动安装扩展
psql -U postgres -d moryflow-vector -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 7. 内存不足导致构建失败

**原因**: Docker 分配内存不足。

**解决方案**:

```bash
# 增加 Docker 内存限制（Docker Desktop）
# Settings > Resources > Memory > 8GB

# 或使用多阶段构建减少内存占用
# 已在 Dockerfile.app 中实现
```

---

## 安全建议

### 1. 环境变量安全

- ✅ 生产环境必须修改所有默认密码
- ✅ 使用强随机密钥（32 字节或更长）
- ✅ 永不提交 `.env` 文件到版本控制
- ✅ 使用密钥管理服务（如 AWS Secrets Manager）

### 2. 网络安全

- ✅ 使用 HTTPS/TLS 加密传输
- ✅ 配置防火墙限制端口访问
- ✅ 使用 Docker 网络隔离服务
- ✅ 启用 CORS 白名单

### 3. 数据库安全

- ✅ 使用强密码
- ✅ 限制数据库远程访问
- ✅ 定期备份数据
- ✅ 启用 SSL 连接

### 4. 容器安全

- ✅ 使用非 root 用户运行容器
- ✅ 定期更新基础镜像
- ✅ 扫描镜像漏洞（如 Trivy）
- ✅ 限制容器资源使用

---

## 生产环境清单

部署前检查:

- [ ] 所有环境变量已配置并验证
- [ ] 数据库已初始化并完成迁移
- [ ] Redis 服务正常运行
- [ ] JWT 密钥已修改为强随机值
- [ ] 日志级别设置为 `info` 或 `warn`
- [ ] 健康检查端点可访问
- [ ] 监控和告警已配置
- [ ] 数据库备份策略已实施
- [ ] SSL/TLS 证书已配置（如需要）
- [ ] 防火墙规则已配置
- [ ] 文档已更新到最新版本

---

## 技术支持

- **文档**: [README.md](./README.md)
- **代码库**: [GitHub Repository](https://github.com/your-repo/moryflow)
- **问题反馈**: [GitHub Issues](https://github.com/your-repo/moryflow/issues)

---

## 更新日志

- **2025-01-17**: 初始版本，支持 Docker 和传统部署
- 更多更新请查看 [CHANGELOG.md](./CHANGELOG.md)

---

**注意**: 本文档适用于 MoryFlow Server v0.0.1。不同版本的部署流程可能有所差异，请参考对应版本的文档。
