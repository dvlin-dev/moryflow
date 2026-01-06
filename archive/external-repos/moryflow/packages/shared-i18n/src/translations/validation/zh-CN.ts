import en from './en'

const zhCN = {
  required: '此字段为必填项',
  email: '请输入有效的邮箱地址',
  url: '请输入有效的 URL',
  number: '请输入有效的数字',
  integer: '请输入有效的整数',
  min: '值必须至少为 {{min}}',
  max: '值不能超过 {{max}}',
  minLength: '至少需要 {{min}} 个字符',
  maxLength: '不能超过 {{max}} 个字符',
  pattern: '格式无效',
  unique: '此值已存在',
  confirmed: '值不匹配',

  // 补充缺失的keys
  emailRequired: '请输入邮箱地址',
  emailInvalid: '请输入有效的邮箱地址',
  passwordMinLength: '密码至少需要 {{min}} 个字符',
  passwordMismatch: '两次输入的密码不一致',
  usernameMinLengthError: '用户名至少需要{{min}}个字符（当前{{current}}个）',

  // ========== MCP/Provider 验证 ==========
  enterName: '填写名称',
  enterCommand: '填写命令',
  invalidUrlFormat: 'URL 格式不对',
  emailMismatch: '邮箱不匹配',
} as const satisfies Record<keyof typeof en, string>

export default zhCN
