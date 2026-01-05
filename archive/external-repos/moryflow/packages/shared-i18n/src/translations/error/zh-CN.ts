import en from './en'

const zhCN = {
  generic: '发生错误',
  network: '网络错误',
  server: '服务器错误',
  client: '客户端错误',
  validation: '验证错误',
  authentication: '身份验证错误',
  authorization: '授权错误',
  notFound: '未找到',
  conflict: '冲突错误',
  rateLimit: '请求频率超限',
  maintenance: '服务维护中',
  unknown: '未知错误',
  // UI 错误边界增加
  appErrorDescription: '抱歉，应用程序遇到了意外错误。我们已经记录了这个问题。',
  devErrorDetails: '错误详情（开发模式）:',
  viewStackTrace: '查看堆栈跟踪',
  viewComponentStack: '查看组件堆栈',
  resolutionIntro: '您可以尝试以下操作来解决这个问题：',
  resolutionActionRetry: '点击“重试”按钮继续使用应用',
  resolutionActionRefresh: '刷新页面重新加载应用',
  resolutionActionGoHome: '返回首页重新开始',
  resolutionActionContact: '如果问题持续存在，请联系技术支持',

  // OSS 服务错误
  ossSecretNotConfigured: '未配置 EXPO_PUBLIC_OSS_SECRET',
  uploadFailed: '上传失败',
  transferFailed: '转存失败',
} as const satisfies Record<keyof typeof en, string>

export default zhCN
