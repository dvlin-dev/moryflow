# GitHub Secrets 配置模板

将以下 Secrets 添加到仓库: Settings → Secrets and variables → Actions → New repository secret

## 必需的 Secrets

### R2_ACCOUNT_ID
```
你的 Cloudflare Account ID
```
获取方式: Cloudflare Dashboard → 右侧边栏 → Account ID

---

### R2_ACCESS_KEY_ID
```
你的 R2 API Access Key ID
```
获取方式: Cloudflare Dashboard → R2 → Overview → Manage R2 API Tokens → Create API token

---

### R2_SECRET_ACCESS_KEY
```
你的 R2 API Secret Access Key
```
获取方式: 创建 API Token 时显示（只显示一次，请妥善保存）

---

## API Token 创建步骤

1. 登录 Cloudflare Dashboard
2. 进入 R2 → Overview
3. 点击 "Manage R2 API Tokens"
4. 点击 "Create API token"
5. 填写:
   - Token name: `moryflow-release`
   - Permissions: `Object Read & Write`
   - Specify bucket: `moryflow-releases`
6. 点击 "Create API Token"
7. 复制并保存显示的两个值:
   - Access Key ID → `R2_ACCESS_KEY_ID`
   - Secret Access Key → `R2_SECRET_ACCESS_KEY`

## R2 Bucket 创建

```bash
# 安装 wrangler
npm install -g wrangler

# 登录
wrangler login

# 创建 bucket
wrangler r2 bucket create moryflow-releases

# 验证
wrangler r2 bucket list
```

## 自定义域名配置

1. Cloudflare Dashboard → R2 → moryflow-releases → Settings
2. Public access → Custom Domains → Add domain
3. 输入: `2c15b2378d6a15c79459ded5a908974a.r2.cloudflarestorage.com/moryflow-releases`
4. 等待 SSL 证书自动配置完成
