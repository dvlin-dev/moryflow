# PC 端国际化

## 需求

为 PC 端实现国际化：
- 复用 `@moryflow/shared-i18n` 包
- API 与 Mobile 端一致
- 语言偏好持久化

## 技术方案

### 架构

```
apps/pc/src/renderer/lib/i18n/
├── index.ts              # 统一导出
├── language-detector.ts  # PC 专用语言检测器（localStorage）
├── init.ts               # 初始化模块
└── provider.tsx          # React Provider
```

### 语言检测逻辑

```typescript
detect():
  # 1. 从 localStorage 读取用户偏好
  stored = localStorage.get('moryflow_language')
  if isValid(stored): return stored

  # 2. 从浏览器/系统语言检测
  browserLang = navigator.language
  mapped = mapSystemLanguage(browserLang)  # zh-Hans-CN → zh-CN
  if mapped: return mapped

  # 3. 回退到英文
  return 'en'
```

### 支持的语言

| 代码 | 语言 |
|------|------|
| `en` | English |
| `zh-CN` | 简体中文 |
| `ja` | 日本語 |
| `de` | Deutsch |
| `ar` | العربية |

### 与 Mobile 的差异

| 方面 | Mobile | PC |
|------|--------|-----|
| 语言检测 | expo-localization | navigator.language |
| 偏好存储 | SecureStore | localStorage |
| 初始化 | 异步 | 同步 |
| 回退语言 | zh-CN | en |

### 使用方式

```tsx
// 组件中使用
import { useTranslation } from '@/lib/i18n'

function LoginForm() {
  const { t } = useTranslation('auth')
  return <button>{t('signIn')}</button>
}

// 切换语言
import { useLanguage } from '@/lib/i18n'

function LanguageSwitcher() {
  const { currentLanguage, changeLanguage, languages } = useLanguage()
  // ...
}
```

### 集成步骤

1. 安装依赖：`pnpm -C apps/pc add @moryflow/shared-i18n`
2. 创建 i18n 目录及文件
3. 包装 App 组件：`<I18nProvider><App /></I18nProvider>`

## 代码索引

| 模块 | 路径 |
|------|------|
| 统一导出 | `apps/pc/src/renderer/lib/i18n/index.ts` |
| 语言检测器 | `apps/pc/src/renderer/lib/i18n/language-detector.ts` |
| 初始化 | `apps/pc/src/renderer/lib/i18n/init.ts` |
| Provider | `apps/pc/src/renderer/lib/i18n/provider.tsx` |
| 共享包 | `packages/shared-i18n/` |
