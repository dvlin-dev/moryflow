import en from './en';

const zhCN = {
  // 标题和菜单
  settings: '设置',
  cancel: '取消',
  saveSettings: '保存设置',
  loading: '加载中...',
  general: '通用',
  appearance: '外观',
  notifications: '通知',
  privacy: '隐私',
  security: '安全',
  advanced: '高级',
  about: '关于',
  version: '版本',
  checkUpdate: '检查更新',
  reportBug: '报告问题',
  feedback: '反馈',
  profile: '个人资料',
  preferences: '偏好设置',

  // 页面标题和描述
  profileDescription: '管理您的个人信息',
  securityDescription: '修改密码以保护您的账户安全',
  preferencesDescription: '自定义您的使用体验',
  verifyEmailTitle: '验证邮箱',
  verifyEmailDescription: '输入发送到 {email} 的验证码',

  // 个人资料
  username: '用户名',
  email: '邮箱',
  // 头像相关文案已移除
  emailCannotModify: '邮箱地址暂不支持修改',
  usernameSupports: '支持字母、数字、下划线和连字符',
  // 头像上传提示已移除

  // 主题选项
  theme: '主题',
  themeDescription: '选择您喜欢的界面主题',
  light: '浅色',
  lightDescription: '明亮的界面，适合日间使用',
  dark: '深色',
  darkDescription: '护眼的深色界面，适合夜间使用',
  system: '跟随系统',
  systemDescription: '自动切换，跟随系统设置',

  // 语言选项
  language: '语言',
  languageDescription: '选择界面显示语言',
  english: 'English',
  simplifiedChinese: '简体中文',
  languageFeatureInDevelopment: '注意：语言切换功能正在开发中，即将推出',
  selectLanguage: '选择语言',
  selectLanguageMessage: '请选择您偏好的语言',
  languageChangeNote: '选择后界面语言将立即更改',

  // 安全设置
  currentPassword: '当前密码',
  newPassword: '新密码',
  confirmPassword: '确认新密码',
  verificationCode: '验证码',
  sendVerificationCode: '发送验证码',
  sendCode: '发送验证码',
  resendCode: '重新发送',
  resendTimer: '重新发送 ({seconds}s)',
  backToModify: '返回修改',
  confirmModify: '确认修改',
  enterNewEmail: '请输入新的邮箱地址',

  // 密码强度
  passwordStrengthWeak: '弱',
  passwordStrengthMedium: '中等',
  passwordStrengthStrong: '强',
  passwordStrengthVeryStrong: '非常强',

  // 操作按钮
  save: '保存',
  saveChanges: '保存修改',
  saving: '保存中...',
  applyChanges: '应用更改',

  // 密码规则和提示
  passwordMinLength: '密码至少需要 {length} 个字符',
  passwordStrengthTips:
    '• 密码长度至少6位\n• 建议包含字母、数字和特殊字符\n• 下一步将发送验证码到您的邮箱',
  verificationTips:
    '• 验证码有效期为10分钟\n• 如未收到验证码，请检查垃圾邮件\n• 修改密码后需要重新登录',

  // 用户名验证
  usernameMinLength: '用户名至少需要{min}个字符（当前{current}个）',
  usernameOnlyAllowedChars: '用户名只能包含字母、数字、下划线和连字符',
  usernamePlaceholder: '请输入用户名（{min}-{max}个字符）',

  // 密码输入提示
  enterCurrentPassword: '请输入当前密码',
  enterNewPassword: '请输入新密码（至少6位）',
  confirmNewPassword: '请再次输入新密码',
  enterVerificationCode: '请输入6位验证码',

  // 成功和错误消息
  profileUpdateSuccess: '个人资料更新成功',
  passwordChangeSuccess: '密码修改成功，请重新登录',
  verificationCodeSent: '验证码已发送至 {email}',
  verificationCodeResent: '验证码已重新发送',

  // 错误消息在 userTranslations 和 validationTranslations 中

  // 新增移动端设置项
  changePassword: '修改密码',
  dataManagement: '数据管理',

  // 补充缺失的keys
  selectThemeMode: '选择主题模式',
  systemMode: '系统模式',
  lightMode: '日间模式',
  darkMode: '夜间模式',
  databaseInfo: '数据库信息',
  storageType: '存储类型',
  databaseSize: '数据库大小',
  bufferZone: '缓冲区',
  pendingWrites: '{{count}} 个待写入',
  backToEdit: '返回修改',
  confirmChanges: '确认修改',
  verificationCodeHints:
    '• 验证码有效期为10分钟\n• 如未收到验证码，请检查垃圾邮件\n• 修改密码后需要重新登录',
  passwordHints:
    '• 密码长度至少6位\n• 建议包含字母、数字和特殊字符\n• 下一步将发送验证码到您的邮箱',
  status: '状态',

  // 删除账户
  deleteAccount: '删除账户',
  deleteAccountTitle: '删除账户',
  deleteAccountWarning: '删除账户后，您的所有数据将被永久清除，此操作无法撤销。',
  selectDeleteReason: '请选择删除账户的原因',
  deleteReasonNotUseful: '不再需要这个产品',
  deleteReasonFoundAlternative: '找到了更好的替代品',
  deleteReasonTooExpensive: '价格太贵',
  deleteReasonTooComplex: '使用太复杂',
  deleteReasonBugsIssues: '问题和故障太多',
  deleteReasonOther: '其他原因',
  deleteFeedbackPlaceholder: '请告诉我们更多（可选，最多500字）',
  deleteConfirmationHint: '请输入您的邮箱以确认',
  confirmDeleteAccount: '确认删除账户',
  deleting: '删除中...',
  deleteAccountSuccess: '账户已删除',
  deleteAccountError: '删除账户失败',

  // PC 重置设置
  resetSettings: '重置软件设置',
  resetSettingsDescription:
    '清除所有配置数据并恢复到初始状态，不会删除 Vault 中的文件。重启后生效。',
  resetSettingsConfirm:
    '确定要重置软件设置吗？\n\n此操作将删除所有配置数据（不影响 Vault 中的文件），重启后生效。',
  resetSettingsSuccess: '已重置，请重启应用',
  resetSettingsFailed: '重置失败，稍后再试',
  resetSettingsNotSupported: '当前环境暂不支持此操作',
  resetButton: '重置软件',

  // 主题模式描述
  lightModeDescription: '适合较亮环境',
  darkModeDescription: '夜晚或弱光环境最佳',
  systemModeDescription: '自动与 OS 同步',

  // ========== PC 设置导航 ==========
  // 导航标签
  account: '账户',
  accountDescription: '登录与会员',
  generalDescription: '外观与偏好',
  systemPrompt: '系统提示词',
  systemPromptDescription: '提示词与参数',
  providers: 'AI 服务商',
  providersDescription: 'API 密钥与模型',
  mcp: 'MCP',
  mcpDescription: '工具扩展',
  cloudSync: '云同步',
  cloudSyncDescription: '多设备同步',
  aboutDescription: '版本信息',

  // ========== 模型配置 ==========
  defaultModelLabel: '默认模型（可选）',
  defaultModelFormatHint: '格式：服务商ID/模型ID。留空时会自动使用第一个启用的服务商的默认模型。',
  defaultModelConfigDescription:
    '请在「AI 服务商」页面配置服务商和模型，然后在此处设置全局默认模型。',

  // ========== System Prompt ==========
  systemPromptModeLabel: '模式',
  systemPromptModeHint: '默认模式下隐藏提示词与参数。',
  systemPromptModeDefault: '使用默认',
  systemPromptModeCustom: '自定义',
  systemPromptDefaultHint: '正在使用内置提示词与模型默认参数。',
  systemPromptTemplateLabel: '系统提示词',
  systemPromptTemplatePlaceholder: '请输入系统提示词...',
  systemPromptTemplateHint: '自定义内容会直接替换默认提示词。',
  systemPromptResetTemplate: '恢复默认模板',
  systemPromptAdvancedLabel: '高级（可选）',
  systemPromptAdvancedHint: '仅在需要调整模型行为时使用。',
  systemPromptParamsLabel: '模型参数',
  systemPromptParamsHint: '仅在开启覆盖时生效。',
  systemPromptUseDefaultLabel: '使用模型默认值',
  systemPromptUseDefaultHint: '正在使用模型默认值。',
  systemPromptTemperatureLabel: 'Temperature',
  systemPromptTopPLabel: 'Top P',
  systemPromptMaxTokensLabel: 'Max Tokens',

  // ========== AI 服务商 ==========
  // SDK 类型
  sdkTypeOpenAICompatible: 'OpenAI 兼容',

  // 服务商列表
  membershipModel: '会员模型',
  customProviderSection: '自定义服务商',
  addCustomProvider: '添加自定义服务商',

  // 服务商详情
  selectProviderPlaceholder: '请从左侧选择一个服务商',
  providerConfigLoading: '服务商配置加载中...',
  documentation: '文档',
  enterApiKey: '填写 API Key',
  testButton: '测试',
  testing: '测试中...',
  baseUrlHint: '留空使用默认地址',
  customProviderNameLabel: '服务商名称',
  customProviderPlaceholder: '自定义服务商',
  deleteProvider: '删除服务商',

  // 模型列表
  modelsSection: '模型',
  modelsCount: '{{count}} 个模型',
  searchModels: '搜索模型...',
  noMatchingModels: '没有找到匹配的模型',
  enabledModels: '已启用模型',
  disabledModels: '已禁用模型',
  noModelsConfigured: '暂无模型配置',
  addCustomModel: '添加自定义模型',
  modelName: '模型名称',
  modelId: '模型 ID',
  contextLength: '上下文长度',
  outputLength: '输出长度',
  customBadge: '自定义',
  reasoningBadge: '推理',
  multimodalBadge: '多模态',
  toolsBadge: '工具',
  delete: '删除',
  configureModel: '配置模型',
  apiAddress: 'API 地址',
  apiAddressOptional: 'API 地址（可选）',
  sdkType: 'SDK 类型',

  // API 测试结果
  testSuccess: '连接成功',
  testFailed: '连接失败',

  // ========== MCP 配置 ==========
  mcpStdioSection: 'Stdio 服务器',
  mcpHttpSection: 'HTTP 服务器',
  mcpStdioEmpty: '暂无 Stdio 服务器配置',
  mcpHttpEmpty: '暂无 HTTP 服务器配置',
  addStdioServer: '添加 Stdio 服务器',
  addHttpServer: '添加 HTTP 服务器',
  serverName: '名称',
  serverCommand: '命令',
  serverArgs: '参数',
  serverCwd: '工作目录',
  serverUrl: 'URL',
  serverEnabled: '启用',
  serverAutoApprove: '自动批准',
  envVariables: '环境变量',
  httpHeaders: 'HTTP 请求头',
  addEnvVariable: '添加变量',
  addHeader: '添加请求头',

  // ========== 云同步 ==========
  cloudSyncTitle: '云同步',
  cloudSyncSubtitle: '在多设备间同步你的笔记',
  cloudSyncNeedLogin: '需要登录',
  cloudSyncNeedLoginDescription: '登录账户后即可使用云同步功能',
  cloudSyncNeedVault: '请先打开工作区',
  cloudSyncNeedVaultDescription: '打开一个工作区后即可配置云同步',
  cloudSyncEnabled: '云同步已启用',
  cloudSyncDisabled: '云同步功能未启用',
  cloudSyncEnableFailed: '云同步启用失败，请稍后重试',
  cloudSyncSyncing: '同步中...',
  cloudSyncNeedsAttention: '需要注意',
  cloudSyncSynced: '已同步',
  cloudSyncFailed: '同步失败',
  cloudSyncNotEnabled: '未启用',
  cloudSyncOffline: '离线',
  cloudSyncWorkspace: '工作区: {{name}}',
  cloudSyncPendingFiles: '{{count}} 个文件待同步',
  cloudSyncLastSync: '上次: {{time}}',
  cloudSyncNeverSynced: '从未同步',
  cloudSyncPaused: '云同步已暂停',
  cloudSyncTriggered: '同步已触发',
  operationFailed: '操作失败，请稍后重试',
  syncSection: '同步',
  syncNow: '立即同步',
  enableCloudSync: '启用云同步',
  smartIndex: '智能索引',
  smartIndexDescription: '对 Markdown 文件建立语义索引，支持智能搜索',
  enableSmartIndex: '启用智能索引',
  smartIndexAIDescription: '使用 AI 进行语义搜索',
  indexedFiles: '已索引文件',
  usage: '用量',
  storageSpace: '存储空间',
  usedSpace: '已用空间',
  percentUsedPlan: '{{percent}}% 已使用 · {{plan}} 方案',
  currentPlan: '当前套餐: {{plan}} · 单文件最大 {{size}}',
  deviceInfo: '设备信息',
  deviceName: '设备名称',
  deviceId: '设备 ID',
  filesCount: '{{count}} 个文件',

  // ========== 关于页面 ==========
  versionInfo: '版本信息',
  currentVersion: '当前版本',
  unknown: '未知',
  appVersion: '版本',
  checkForUpdates: '检查更新',
  changelog: '更新日志',
  licenses: '开源许可',
  termsOfService: '服务条款',
  privacyPolicy: '隐私政策',
  copyright: '© {{year}} Moryflow. 保留所有权利。',

  // ========== MCP 预设描述 ==========
  mcpFetchWebContent: '抓取网页内容',
  mcpBraveSearch: '使用 Brave 搜索引擎',
  mcpLibraryDocs: '获取最新的库文档',
  mcpBrowserAutomation: '浏览器自动化测试',
  mcpWebCrawl: '网页爬取和数据提取',
  reconnectAll: '重新连接所有服务器',
  manageServer: '管理此服务器',
  envVariablesLabel: '环境变量',
  httpHeadersLabel: '自定义请求头',

  // ========== 模型输入类型 ==========
  modalityText: '文本',
  modalityImage: '图片',
  modalityAudio: '音频',
  modalityVideo: '视频',

  // ========== 模型能力 ==========
  capabilityAttachment: '多模态输入',
  capabilityAttachmentDesc: '支持图片、文件等附件',
  capabilityReasoning: '推理模式',
  capabilityReasoningDesc: '支持深度思考/推理',
  capabilityTemperature: '温度调节',
  capabilityTemperatureDesc: '支持调节生成随机性',
  capabilityToolCall: '工具调用',
  capabilityToolCallDesc: '支持 Function Calling',

  // ========== 模型搜索和添加 ==========
  searchModelPlaceholder: '搜索模型，如 gpt-4o、claude-3...',
  modelIdExample: '例如: gpt-4o-2024-11-20',
  modelNameExample: '例如: GPT-4o (2024-11)',
  ollamaModelExample: '例如：qwen2.5:7b',

  // ========== 购买 ==========
  createPaymentLinkFailed: '创建支付链接失败，请稍后重试',

  // ========== 支付弹窗 ==========
  completePayment: '完成支付',
  paymentOpenedInBrowser: '支付页面已在浏览器中打开，请在浏览器中完成支付',
  waitingForPayment: '等待支付完成...',
  paymentSuccessWillRedirect: '支付成功后会自动跳回应用',
  reopenPaymentPage: '重新打开支付页面',

  // ========== 删除账户补充 ==========
  detailedFeedbackOptional: '详细反馈（可选）',
  emailMismatch: '邮箱不匹配',

  // ========== 订阅 ==========
  starterPlan: '入门版',
  basicPlan: '基础版',
  proPlan: '专业版',
  loadProductsFailed: '加载产品列表失败，请稍后重试',
  subscriptionSuccess: '订阅成功，会员权益已生效',
  recommended: '推荐',
  perMonth: '/月',
  perYear: '/年',
  monthlyCredits: '每月 {{credits}} 积分',
  currentPlanBadge: '当前计划',
  subscribeNow: '立即订阅',
  upgradeMembership: '升级会员',
  choosePlanDescription: '选择适合你的会员计划，解锁更多功能',
  monthly: '月付',
  yearly: '年付',
  savePercent: '省 {{percent}}%',
  subscriptionNote: '年付可节省 2 个月费用，积分额度不变。订阅随时可取消。',

  // ========== MCP 配置补充 ==========
  loadingConfig: '正在加载配置…',

  // ========== Sandbox Settings ==========
  sandboxSettings: '沙盒',
  sandboxSettingsDescription: '控制 Agent 文件系统访问权限',
  sandboxMode: '沙盒模式',
  sandboxModeNormal: '普通',
  sandboxModeNormalDescription: 'Agent 只能访问 Vault 内的文件',
  sandboxModeUnrestricted: '无限制',
  sandboxModeUnrestrictedDescription: 'Agent 可以访问系统上的所有文件',
  sandboxAuthorizedPaths: '已授权路径',
  sandboxAuthorizedPathsDescription: 'Agent 已被授权访问的路径',
  sandboxNoAuthorizedPaths: '暂无已授权路径',
  sandboxRemovePath: '移除',
  sandboxClearAllPaths: '清除全部',
  sandboxClearAllConfirm: '确定要清除所有已授权路径吗？',
} as const satisfies Record<keyof typeof en, string>;

export default zhCN;
