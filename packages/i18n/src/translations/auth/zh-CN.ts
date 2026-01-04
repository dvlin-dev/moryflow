import en from './en'

const zhCN = {
  signIn: '登录',
  signUp: '注册',
  signOut: '退出登录',
  email: '邮箱',
  password: '密码',
  confirmPassword: '确认密码',
  forgotPassword: '忘记密码？',
  resetPassword: '重置密码',
  verificationCode: '验证码',
  sendCode: '发送验证码',
  resendCode: '重新发送验证码',
  rememberMe: '记住我',
  orContinueWith: '或使用',
  signInWithApple: '使用 Apple 继续',
  signInWithGoogle: '使用 Google 继续',
  signInWithGithub: '使用 GitHub 继续',
  signInWithEmail: '使用邮箱登录',
  signInWithCode: '使用验证码登录',
  codeSignIn: '验证码登录',
  // 页面标题和描述
  welcomeToMoryFlow: '欢迎使用 MoryFlow',
  signInDescription: '登录您的账户或创建新账户',
  verifyYourEmail: '验证您的邮箱',
  enterVerificationCode: '输入验证码',
  resetYourPassword: '重置您的密码',
  verificationDescription: '请输入我们发送到您邮箱的验证码以完成注册',
  verificationSignInDescription: '输入验证码以登录',
  forgotPasswordDescription: '输入您的邮箱地址，我们将向您发送验证码',
  resetPasswordDescription: '输入发送到您邮箱的验证码',
  // 操作提示
  noAccount: '还没有账户？',
  haveAccount: '已有账户？',
  emailValidation: '邮箱验证',
  sendVerificationCode: '发送验证码',
  sendResetCode: '发送重置验证码',
  passwordResetVerification: '密码重置验证',
  createPassword: '创建密码',
  enterPassword: '输入您的密码',
  createAccount: '创建账户',
  // 其他操作
  back: '返回',
  verify: '验证',
  sending: '发送中...',
  codeSentTo: '我们已向以下地址发送了验证码',
  noCodeReceived: '没有收到验证码？',
  resendTimer: '{{seconds}}秒后可重新发送',
  backToSignIn: '返回登录',
  enterYourEmail: '输入您的邮箱',
  forgotPasswordNote: '我们将向您的邮箱地址发送验证码',
  // 错误信息
  emailRequired: '请输入邮箱地址',
  emailInvalid: '请输入有效的邮箱地址',
  passwordRequired: '请输入密码',
  passwordTooShort: '密码至少需要 6 个字符',
  passwordMismatch: '两次输入的密码不一致',
  nicknameRequired: '请输入昵称',
  codeRequired: '请输入验证码',
  codeInvalid: '验证码无效',
  userNotFound: '用户不存在',
  incorrectPassword: '密码错误',
  accountLocked: '账户已被锁定',
  tooManyAttempts: '尝试次数过多，请稍后再试',
  sessionExpired: '会话已过期，请重新登录',
  // 成功消息
  signInSuccess: '登录成功',
  signOutSuccess: '退出登录成功',
  verificationCodeSent: '验证码已发送到您的邮箱',
  passwordResetSuccess: '密码重置成功',
  accountCreated: '账户创建成功',
  // 新增移动端特定文本
  signInToMoryFlow: '登录 MoryFlow',
  welcomeBack: '欢迎回来！请登录以继续',
  signInWithVerificationCode: '使用验证码登录',
  userNotFoundPrompt: '该邮箱尚未注册。是否要注册？',
  invalidCredentials: '密码错误',
  signInFailed: '登录失败',
  failedToSendCode: '发送验证码失败',
  // 新增缺失的keys
  emailPlaceholder: 'm@example.com',
  createAccountButton: '创建账户',
  alreadyHaveAccount: '已有账户？',
  enterSixDigitCode: '请输入6位验证码',
  verificationFailed: '验证失败',
  failedToResendCode: '重新发送验证码失败',
  // 密码强度
  passwordStrength: '密码强度',
  weak: '弱',
  medium: '中等',
  strong: '强',
  veryStrong: '非常强',
  didntReceiveCode: '没有收到验证码？重新发送',
  backTo: '返回{{mode}}',
  pleaseLogin: '请先登录',
  // 标题相关
  signUpTitle: '注册',
  forgotPasswordTitle: '忘记密码',
  verifyEmailTitle: '验证邮箱',
  signUpWelcome: '注册以开始使用 MoryFlow',
  forgotPasswordPageDescription: '输入您的邮箱，我们将向您发送验证码',
  verificationCodeSentTo: '输入发送到 {{email}} 的验证码',

  // 社交登录相关
  appleSignInUnavailable: 'Apple 登录在此设备上不可用',
  userCancelledLogin: '用户取消了登录',
  socialLoginFailed: '社交登录失败',
  socialSignInComingSoon: '{{provider}} 登录即将推出',
  socialLoginError: '登录失败，请重试',

  // 验证表单附加
  sendFailed: '发送失败',
  sendFailedRetry: '发送失败，请重试',
  canResendIn: '{{seconds}}s 后可重发',
  pleaseRetry: '请重试',

  // ========== PC 登录面板 ==========
  // 页面标题
  welcomeBackTitle: '欢迎回来',
  createAccountTitle: '创建账户',
  signInToCloudService: '登录以使用云端会员服务',
  signUpToMoryflow: '注册成为 Moryflow 会员',

  // 社交登录
  appleSignInComingSoon: '使用 Apple 登录（即将推出）',
  googleSignInComingSoon: '使用 Google 登录（即将推出）',
  orUseEmail: '或使用邮箱',

  // 表单字段
  nickname: '昵称',
  nicknamePlaceholder: '你的昵称',
  forgotPasswordComingSoon: '忘记密码？（即将推出）',

  // 切换登录/注册
  noAccountQuestion: '没有账户？',
  signUpNow: '立即注册',
  haveAccountQuestion: '已有账户？',
  backToSignInAction: '返回登录',

  // 协议同意
  agreeToTerms: '继续即表示你同意我们的',
  termsOfService: '服务条款',
  and: '和',
  privacyPolicyLink: '隐私政策',

  // 操作失败
  operationFailed: '操作失败，请重试',

  // ========== PC OTP 表单 ==========
  verifyEmail: '验证邮箱',
  otpSentToEmail: '我们已向以下邮箱发送了 6 位验证码：',
  verificationCodeLabel: '验证码',
  enterFullOtp: '请输入完整的 6 位验证码',
  otpError: '验证码错误',
  verifyFailed: '验证失败，请重试',
  noCodeQuestion: '没有收到验证码？',
  sendingOtp: '发送中...',
  resendOtp: '重新发送',
  resendInSeconds: '{{seconds}}s 后可重发',
  backAndResend: '返回重新发送',
  verifyButton: '验证',
  backButton: '返回',

  // ========== PC 用户资料 ==========
  noNicknameSet: '未设置昵称',
  emailVerified: '邮箱已验证',
  emailNotVerified: '邮箱未验证',
  logout: '登出',
  creditsBalance: '积分余额',
  dailyCredits: '每日积分',
  subscriptionCredits: '订阅积分',
  purchasedCredits: '购买积分',
  total: '总计',
  purchaseCredits: '购买积分',
  membershipBenefits: '会员权益',
  upgrade: '升级',
  dangerZone: '危险区域',
  deleteAccount: '删除账户',
  deleteAccountWarning: '删除后所有数据将被永久清除，无法恢复',
} as const satisfies Record<keyof typeof en, string>

export default zhCN
