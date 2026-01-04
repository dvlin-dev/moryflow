/**
 * 认证相关的验证工具函数
 */

/** 密码配置 */
export const PASSWORD_CONFIG = {
  MIN_LENGTH: 6,
  MAX_LENGTH: 100,
}

/** 邮箱验证正则 */
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i

/**
 * 验证邮箱格式
 */
export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

/**
 * 验证密码强度
 * @returns 验证结果，如果无效返回错误代码用于 i18n
 */
export function validatePassword(password: string): {
  valid: boolean
  errorKey?: 'passwordTooShort' | 'passwordTooLong'
} {
  if (password.length < PASSWORD_CONFIG.MIN_LENGTH) {
    return { valid: false, errorKey: 'passwordTooShort' }
  }
  if (password.length > PASSWORD_CONFIG.MAX_LENGTH) {
    return { valid: false, errorKey: 'passwordTooLong' }
  }
  return { valid: true }
}

/**
 * 生成随机用户名
 */
export function generateUsername(email: string): string {
  const emailName = email.substring(0, email.indexOf('@'))
  const hash = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(5, '0')
  const username = emailName.length > 14 ? emailName.substring(0, 14) : emailName
  return `${username}_${hash}`
}
