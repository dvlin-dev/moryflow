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
    '清除所有配置数据并恢复到初始状态，不会删除工作区中的文件。应用将自动重启。',
  resetSettingsConfirm:
    '确定要重置软件设置吗？\n\n此操作将删除所有配置数据（不影响工作区中的文件），应用将自动重启。',
  resetSettingsSuccess: '已重置，正在重启...',
  resetSettingsFailed: '重置失败，稍后再试',
  resetSettingsNotSupported: '当前环境暂不支持此操作',
  resetButton: '重置软件',

  // 主题模式描述
  lightModeDescription: '适合较亮环境',
  darkModeDescription: '夜晚或弱光环境最佳',
  systemModeDescription: '自动与 OS 同步',
  closeBehavior: '关闭窗口时',
  closeBehaviorDescription: '选择点击窗口关闭按钮后的行为。',
  closeBehaviorHide: '隐藏到菜单栏',
  closeBehaviorHideDescription: '保持 Moryflow 在菜单栏中继续运行。',
  closeBehaviorQuit: '退出应用',
  closeBehaviorQuitDescription: '完全退出 Moryflow。',
  closeBehaviorUpdateFailed: '更新关闭行为失败',
  launchAtLogin: '登录时启动',
  launchAtLoginDescription: '登录系统后自动启动 Moryflow。',
  launchAtLoginUpdateFailed: '更新登录启动设置失败',
  runtimeSettingsLoadFailed: '加载运行时设置失败',
  updateChannel: '更新通道',
  updateChannelDescription: '选择当前设备跟随稳定版还是 Beta 预览版。',
  updateChannelStable: '稳定版',
  updateChannelStableDescription: '适合日常使用，只接收正式发布版本。',
  updateChannelBeta: 'Beta',
  updateChannelBetaDescription: '更早收到预览版本，但可能存在不稳定情况。',
  updateChannelUpdateFailed: '更新发布通道失败',
  automaticUpdateChecks: '自动检查更新',
  automaticUpdateChecksDescription: '应用启动后在后台检查新版本。',
  autoCheckUpdateFailed: '更新自动检查设置失败',
  manualUpdatePolicyDescription: '下载和安装都需要你确认，Moryflow 不会强制安装更新。',

  // ========== PC 设置导航 ==========
  // 导航标签
  account: '账户',
  accountDescription: '登录与会员',
  generalDescription: '外观与偏好',
  personalization: '个性化',
  personalizationDescription: '自定义指令',
  providers: 'AI 服务商',
  providersDescription: 'API 密钥与模型',
  mcp: 'MCP',
  mcpDescription: '工具扩展',
  cloudSync: '云同步',
  cloudSyncDescription: '多设备同步',
  telegram: 'Telegram',
  telegramDescription: 'Bot API 渠道',
  aboutDescription: '版本信息',

  // ========== 模型配置 ==========
  defaultModelLabel: '默认模型（可选）',
  defaultModelFormatHint: '格式：服务商ID/模型ID。留空时会自动使用第一个启用的服务商的默认模型。',
  defaultModelConfigDescription:
    '请在「AI 服务商」页面配置服务商和模型，然后在此处设置全局默认模型。',

  // ========== Personalization ==========
  customInstructionsLabel: '自定义指令',
  customInstructionsHint: '填写你的偏好，包括写作风格、输出格式和协作习惯。',
  customInstructionsPlaceholder: '例如：回答尽量简洁。用户可见文案使用英文，技术解释使用中文。',

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
  cloudSyncSubtitle: '可选的跨设备文件同步，不开启也不影响 Memory',
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
  cloudSyncConflictCopyReady: '冲突副本已保留',
  cloudSyncFailed: '同步失败',
  cloudSyncNotEnabled: '未启用',
  cloudSyncOffline: '离线',
  cloudSyncUnavailable: '移动端暂不支持',
  cloudSyncRecoveryDescription: '继续同步即可安全完成上一次更改。',
  cloudSyncOfflineDescription: '当前无法连接云端，网络恢复后可再次尝试。',
  cloudSyncSetupDescription: '如需跨设备同步此工作区文件，请启用云同步。',
  cloudSyncMobileUnavailableDescription:
    'Workspace Profile 重写完成前，移动端暂不提供 Cloud Sync。请使用桌面端管理同步。',
  cloudSyncConflictCopyDescription: '系统已保留冲突副本，原内容不会丢失。',
  cloudSyncWorkspace: '工作区: {{name}}',
  cloudSyncPendingFiles: '{{count}} 个文件待同步',
  cloudSyncLastSync: '上次: {{time}}',
  cloudSyncNeverSynced: '从未同步',
  cloudSyncAvailableOnDesktop: '请在桌面端使用',
  cloudSyncPaused: '云同步已暂停',
  cloudSyncTriggered: '同步已触发',
  cloudSyncResumeRecovery: '继续恢复',
  cloudSyncTryAgain: '重试',
  cloudSyncOpenConflictCopy: '打开冲突副本',
  cloudSyncOpenFirstConflictCopy: '打开第一个冲突副本',
  syncSettings: '同步设置',
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
  latestVersion: '最新版本',
  appUpdates: '应用更新',
  lastCheckedAt: '上次检查',
  neverChecked: '从未检查',
  upToDate: '当前已是最新版本',
  newVersionAvailable: '发现新版本',
  updateDownloading: '正在下载更新',
  updateReadyToInstall: '已准备安装',
  unknown: '未知',
  appVersion: '版本',
  checkForUpdates: '检查更新',
  downloadUpdate: '下载更新',
  restartToInstall: '重启安装',
  skipThisVersion: '跳过此版本',
  releaseNotes: '发行说明',
  downloadFromBrowser: '浏览器下载',
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
  starterPlanTagline: '适合轻度个人使用',
  basicPlanTagline: '适合稳定创作节奏',
  proPlanTagline: '适合重度创作与团队协作',
  loadProductsFailed: '加载产品列表失败，请稍后重试',
  subscriptionSuccess: '订阅成功，会员权益已生效',
  recommended: '推荐',
  perMonth: '/月',
  perYear: '/年',
  monthlyCredits: '每月 {{credits}} 积分',
  currentPlanBadge: '当前计划',
  currentPlanHelper: '你当前正在使用的计划',
  currentPlanCta: '当前工作区已包含',
  subscriptionSummaryEyebrow: '工作区计划',
  subscriptionSummaryTitle: '为你的工作区准备的简单定价',
  subscriptionSummaryDescription: '按积分、同步能力和支持级别选择合适方案。',
  subscribeNow: '立即订阅',
  upgradeMembership: '升级会员',
  choosePlanDescription: '选择适合你的会员计划，解锁更多功能',
  monthly: '月付',
  yearly: '年付',
  savePercent: '省 {{percent}}%',
  annualBillingHighlight: '按年支付，相当于赠送 2 个月',
  equivalentMonthly: '折合每月 ${{price}}',
  allPaidPlansInclude: '所有付费计划都包含',
  subscriptionNote: '年付可节省 2 个月费用，积分额度不变。订阅随时可取消。',

  // ========== MCP 配置补充 ==========
  loadingConfig: '正在加载配置…',

  // ========== Sandbox Settings ==========
  sandboxSettings: '沙盒',
  sandboxSettingsDescription: '控制 Agent 文件系统访问权限',
  sandboxMode: '沙盒模式',
  sandboxModeNormal: '普通',
  sandboxModeNormalDescription: 'Agent 只能访问当前工作区内的文件',
  sandboxModeUnrestricted: '无限制',
  sandboxModeUnrestrictedDescription: 'Agent 可以访问系统上的所有文件',
  sandboxAuthorizedPaths: '已授权路径',
  sandboxAuthorizedPathsDescription: 'Agent 可访问的工作区外路径',
  sandboxAddPath: '添加路径',
  sandboxPathPlaceholder: '/absolute/path/to/folder',
  sandboxPathMustBeAbsolute: '请输入绝对路径',
  sandboxNoAuthorizedPaths: '暂无已授权路径',
  sandboxRemovePath: '移除',
  sandboxClearAllPaths: '清除全部',
  sandboxClearAllConfirm: '确定要清除所有已授权路径吗？',

  // ========== 积分包 ==========
  buyCredits: '购买积分',
  creditPackPopular: '热门',
  creditPackCredits: '{{credits}} 积分',
  creditPackBuyNow: '立即购买',
  creditPackExpiry: '积分自购买起 365 天后过期。',
  creditPackUsageOrder: '使用顺序：每日免费额度 → 订阅积分 → 购买积分。',
  creditPackPaymentSuccess: '支付完成，积分已到账',

  // ========== Beta Notice ==========
  betaNoticePrefix: 'Purchasing is not available during beta. Join our ',
  betaNoticeLinkText: 'Discord',
  betaNoticeSuffix: ' for redemption codes!',
  community: 'Community',
  joinDiscord: 'Join Discord',
  communityDescription: 'Get support, share feedback, and connect with other users.',

  // ========== MCP 组件 ==========
  // mcp-list
  mcpServersTitle: 'MCP 服务器',
  mcpAdd: '添加',
  mcpUntitled: '未命名',
  mcpTypeStdio: 'Stdio',
  mcpTypeHttp: 'HTTP',
  mcpNoServersYet: '暂无服务器',

  // mcp-details
  mcpUntitledServer: '未命名服务器',
  mcpEnabled: '已启用',
  mcpTest: '测试',
  mcpDelete: '删除',
  mcpTypeLabel: '类型',
  mcpTypeStdioOption: '命令行 (Stdio)',
  mcpTypeHttpOption: 'HTTP',
  mcpStdioDescription: '运行由 Moryflow 安装的 MCP 托管包',
  mcpHttpDescription: '连接远程 HTTP MCP 服务器',
  mcpNameLabel: '名称',
  mcpBinNameLabel: '二进制名称（可选）',
  mcpNpmPackageLabel: 'NPM 包',
  mcpArgumentsLabel: '参数（空格分隔）',
  mcpEnvVarsLabel: '环境变量',
  mcpUrlLabel: 'URL',
  mcpAuthHeaderLabel: '授权头（可选）',
  mcpCustomHeadersLabel: '自定义请求头',

  // mcp-env-editor
  mcpEnvNoEntries: '暂无条目，添加一条开始使用。',

  // mcp-empty-state
  mcpNoServersTitle: '暂无 MCP 服务器',
  mcpNoServersDescription: 'MCP 允许 AI 调用外部工具，如搜索和网页抓取。',
  mcpAddServer: '添加服务器',
  mcpOrPreset: '或从预设开始：',
  mcpRequiresEnvVars: '* 需要环境变量',

  // mcp-tool-list
  mcpToolsCount: '工具 ({{count}})',
  mcpToolNamesUnavailable: '工具名称不可用，请尝试重新验证。',

  // mcp-verified-tools
  mcpVerifiedToolsCount: '已验证工具 ({{count}})',

  // mcp-test-result-dialog
  mcpTestSucceeded: '测试成功',
  mcpTestFailed: '测试失败',
  mcpTestConnected: '已连接到 MCP 服务器',
  mcpTestOk: '确定',

  // ========== Provider 组件 ==========
  // custom-provider-models
  providerModelsLabel: '模型',
  providerNoModelsYet: '暂无模型。添加一个以启用测试和模型选择。',
  providerSearchModels: '搜索模型...',
  providerDeleteModelConfirm: '确定删除模型"{{name}}"？',
  providerDeleteModelAriaLabel: '删除模型',
  providerNoMatchingModels: '没有找到匹配的模型',

  // membership-details
  membershipSignInPrompt: '登录以使用会员模型',
  membershipModelsTitle: '会员模型',
  membershipCreditsAvailable: '{{displayName}} · {{credits}} 积分可用',
  membershipInfoNote: '会员模型由平台提供，使用会消耗积分，无需 API 密钥。',
  membershipNoModelsYet: '暂无会员模型',
  membershipAvailableModels: '可用模型',
  membershipLockedModels: '更高等级解锁',
  membershipAvailableBadge: '可用',
  membershipCurrentCredits: '当前积分',
  membershipDailyCredits: '每日:',
  membershipSubscriptionCredits: '订阅:',
  membershipPurchasedCredits: '购买:',

  // ollama-panel
  ollamaModelLibraryLink: '模型库',
  ollamaConnectionStatus: '连接状态',
  ollamaConnected: '已连接 (v{{version}})',
  ollamaDisconnected: '已断开连接',
  ollamaServiceUrl: '服务地址（可选）',
  ollamaServiceUrlHint: '留空使用默认值',
  ollamaLocalModels: '本地模型',
  ollamaModelsCount: '{{count}} 个模型',
  ollamaDownloadModels: '下载模型',
  ollamaNoMatchingModels: '没有找到匹配的模型',
  ollamaNoLocalModels: '暂无本地模型',
  ollamaNoLocalModelsHint: '点击"下载模型"从模型库获取',
  ollamaCannotConnect: '无法连接到 Ollama',
  ollamaInstallHint: '请确保 Ollama 已安装并正在运行',
  ollamaDownloadLink: '下载 Ollama',
  ollamaLoading: '加载中...',

  // model-library-dialog
  modelLibraryTitle: '模型库',
  modelLibraryBrowseAll: '浏览全部',
  modelLibraryDownloads: '下载次数: {{count}}',
  modelLibraryNoMatching: '没有找到匹配的模型',
  modelLibraryManualInput: '或手动输入模型名称：',
  modelLibraryDownload: '下载',

  // add-model-dialog
  addModelTitle: '添加自定义模型',
  addModelDescription: '添加带有运行时限制和能力预设的模型。',
  addModelSearchLibrary: '搜索模型库',
  addModelSearchHint: '搜索 {{count}} 个模型并点击自动填充。',
  addModelOrFillManually: '或手动填写',
  addModelIdLabel: '模型 ID',
  addModelIdRequired: '模型 ID 为必填项',
  addModelIdHint: '用于 API 调用中的模型标识符',
  addModelNameLabel: '模型名称',
  addModelNameRequired: '模型名称为必填项',
  addModelNameHint: '在界面中显示',
  addModelIdExists: '模型 ID 已存在',
  addModelContextWindow: '上下文窗口',
  addModelMaxOutput: '最大输出',
  addModelTokens: '{{count}}K 个 token',
  addModelCapabilities: '模型能力',
  addModelDefaultThinkingLevel: '默认思考级别',
  addModelInputTypes: '支持的输入类型',
  addModelInputTypesHint: '选择此模型支持的输入类型。文本为必选。',
  addModelCancel: '取消',
  addModelSubmit: '添加',

  // edit-model-dialog
  editModelPresetTitle: '自定义预设模型',
  editModelCustomTitle: '编辑自定义模型',
  editModelDescription: '配置模型的运行时限制和能力。',
  editModelIdLabel: '模型 ID',
  editModelIdPresetHint: '预设模型 ID 不可修改',
  editModelIdCustomHint: '用于 API 调用中的模型标识符',
  editModelDisplayName: '显示名称',
  editModelNameRequired: '模型名称为必填项',
  editModelNameHint: '在界面中显示',
  editModelSave: '保存',
} as const satisfies Record<keyof typeof en, string>;

export default zhCN;
