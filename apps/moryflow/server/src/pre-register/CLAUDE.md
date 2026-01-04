# PreRegister 模块

> 预注册验证模块，实现"先验证邮箱后创建账号"的注册流程

## 功能概述

用户注册时，先发送 OTP 验证码到邮箱，验证成功后才创建账号并自动登录。
相比传统的"先注册后验证"流程，可以避免未验证账号的产生。

## 文件结构

| 文件 | 说明 |
|------|------|
| `pre-register.dto.ts` | Zod 验证 schemas（SendOtp / Verify） |
| `pre-register.crypto.ts` | AES-256-GCM 加密/解密工具 |
| `pre-register.service.ts` | 核心业务逻辑 |
| `pre-register.controller.ts` | HTTP 路由（/api/pre-register/*） |
| `pre-register.module.ts` | NestJS 模块定义 |
| `index.ts` | 模块导出入口 |

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/pre-register/send-otp` | 发送预注册验证码 |
| POST | `/api/pre-register/verify` | 验证 OTP 并完成注册 |

## 数据流

```
用户填写 (email + name + password)
    ↓
POST /api/pre-register/send-otp
    ↓
Redis 存储: { otp, name, encryptedPassword, attempts }  TTL=5min
    ↓
发送 OTP 邮件
    ↓
POST /api/pre-register/verify
    ↓
验证 OTP → 解密密码 → Better Auth signUpEmail() → 标记邮箱已验证
    ↓
返回 { token, user }
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `PRE_REGISTER_ENCRYPTION_KEY` | 64 位 hex 字符串（32 字节），用于加密 Redis 中的密码 |

生成方式：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 依赖模块

- `RedisService` - OTP 存储与频率限制
- `EmailService` - 发送验证码邮件
- `PrismaService` - 用户查询与更新
- `AuthService` - Better Auth 集成

## 安全措施

1. **密码加密**：用户密码使用 AES-256-GCM 加密后存入 Redis
2. **OTP 过期**：验证码 5 分钟过期
3. **频率限制**：每小时最多发送 5 次验证码
4. **尝试限制**：每个 OTP 最多验证 3 次
5. **临时邮箱过滤**：拒绝一次性邮箱注册
