import en from './en'

const zhCN = {
  profile: '个人资料',
  settings: '设置',
  account: '账户',
  preferences: '偏好设置',
  notifications: '通知',
  privacy: '隐私',
  security: '安全',
  language: '语言',
  theme: '主题',
  name: '姓名',
  bio: '个人简介',
  // 头像相关文案已移除
  changePassword: '修改密码',
  twoFactorAuth: '双重身份验证',
  deleteAccount: '删除账户',
  exportData: '导出数据',
  // 错误信息
  updateFailed: '更新资料失败',
  uploadFailed: '文件上传失败',
  deleteFailed: '删除账户失败',
  usernameRequired: '用户名不能为空',
  usernameTooShort: '用户名至少需要3个字符',
  usernameTooLong: '用户名不能超过20个字符',
  usernameInvalidFormat: '用户名只能包含字母、数字、下划线和连字符',
  currentPasswordRequired: '请输入当前密码',
  newPasswordRequired: '请输入新密码',
  confirmPasswordRequired: '请确认新密码',
  passwordTooShort: '密码至少需要6个字符',
  passwordMismatch: '两次输入的密码不一致',
  verificationCodeRequired: '请输入验证码',
  verificationCodeInvalidLength: '验证码必须为6位数字',
  verificationCodeSendFailed: '验证码发送失败，请重试',
  passwordChangeFailed: '密码修改失败，请重试',
  emailUnavailable: '邮箱地址不可用',
  emailInvalid: '请输入有效的邮箱地址',
  // 成功消息
  profileUpdated: '资料更新成功',
  passwordChanged: '密码修改成功',
  accountDeleted: '账户删除成功',
  dataExported: '数据导出成功',
  // 新增移动端用户相关
  defaultUsername: '用户',
  noEmail: '暂无邮箱',

  // 补充缺失的keys
  usernameInputPlaceholder: '请输入用户名（{{min}}-{{max}}个字符）',
  usernameMinLengthError: '用户名至少需要{{min}}个字符（当前{{current}}个）',
  usernameFormatHint: '支持字母、数字、下划线和连字符',
  emailNotEditable: '邮箱地址暂不支持修改',
  username: '用户名',
} as const satisfies Record<keyof typeof en, string>

export default zhCN
