# 预注册邮箱验证

## 需求

改进注册流程：只有验证通过的邮箱才创建账号。

```
用户填写(邮箱+昵称+密码) → 发送验证码 → 输入验证码 → 创建账号并登录
```

## 技术方案

### 架构

```
Client (PC/Mobile)
    │
    │ POST /api/pre-register/send-otp
    │ POST /api/pre-register/verify
    ▼
PreRegisterController
    │
    ▼
PreRegisterService
    ├── Redis (OTP + 加密密码)
    ├── EmailService (发送验证码)
    └── Better Auth (signUpEmail)
```

### Redis Key 设计

| Key | Value | TTL |
|-----|-------|-----|
| `pre-register:otp:{email}` | `{ otp, name, password(encrypted), attempts }` | 5 分钟 |
| `pre-register:rate:{email}` | 发送次数 | 1 小时 |

### 核心流程（伪代码）

```
# 发送验证码
sendOtp(email, name, password):
  if userExists(email):
    throw CONFLICT
  if isDisposableEmail(email):
    throw BAD_REQUEST
  if sendCount >= 5:
    throw RATE_LIMITED

  otp = randomDigits(6)
  encryptedPassword = aes256(password)
  redis.set(otpKey, { otp, name, encryptedPassword, attempts: 0 }, ttl=300)
  emailService.sendOTP(email, otp)

# 验证并注册
verify(email, otp):
  data = redis.get(otpKey)
  if not data:
    throw EXPIRED
  if data.attempts >= 3:
    throw TOO_MANY_ATTEMPTS

  if data.otp != otp:
    data.attempts += 1
    redis.set(otpKey, data)
    throw INVALID_CODE

  password = decrypt(data.password)
  result = auth.signUpEmail({ email, password, name })
  user.emailVerified = true
  redis.del(otpKey)
  return { token, user }
```

### 安全措施

| 措施 | 说明 |
|------|------|
| 密码加密 | AES-256-GCM |
| 暴力破解防护 | 最多 3 次验证尝试 |
| 频率限制 | 每小时最多 5 次发送 |
| 临时邮箱拦截 | isDisposableEmail() |
| 时序攻击防护 | 邮件发送不 await |

### 环境变量

```bash
PRE_REGISTER_ENCRYPTION_KEY=<32字节hex>
```

## 代码索引

| 模块 | 路径 |
|------|------|
| 模块定义 | `apps/server/src/pre-register/pre-register.module.ts` |
| 控制器 | `apps/server/src/pre-register/pre-register.controller.ts` |
| 服务 | `apps/server/src/pre-register/pre-register.service.ts` |
| DTO | `apps/server/src/pre-register/pre-register.dto.ts` |
| 加密工具 | `apps/server/src/pre-register/pre-register.crypto.ts` |
| PC 登录面板 | `apps/pc/src/renderer/components/login-panel/` |
| Mobile 注册表单 | `apps/mobile/components/auth/sign-up-form.tsx` |
