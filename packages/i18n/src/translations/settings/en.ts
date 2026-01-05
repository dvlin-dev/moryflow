const en = {
  // 标题和菜单
  settings: 'Settings',
  cancel: 'Cancel',
  saveSettings: 'Save Settings',
  loading: 'Loading...',
  general: 'General',
  appearance: 'Appearance',
  notifications: 'Notifications',
  privacy: 'Privacy',
  security: 'Security',
  advanced: 'Advanced',
  about: 'About',
  version: 'Version',
  checkUpdate: 'Check for Updates',
  reportBug: 'Report Bug',
  feedback: 'Feedback',
  profile: 'Profile',
  preferences: 'Preferences',

  // 页面标题和描述
  profileDescription: 'Manage your personal information',
  securityDescription: 'Change your password to secure your account',
  preferencesDescription: 'Customize your experience',
  verifyEmailTitle: 'Verify Email',
  verifyEmailDescription: 'Enter the verification code sent to {email}',

  // 个人资料
  username: 'Username',
  email: 'Email',
  // avatar related texts removed
  emailCannotModify: 'Email address cannot be modified',
  usernameSupports: 'Supports letters, numbers, underscores and hyphens',
  // avatar upload tip removed

  // 主题选项
  theme: 'Theme',
  themeDescription: 'Choose your preferred interface theme',
  light: 'Light',
  lightDescription: 'Bright interface, suitable for daytime use',
  dark: 'Dark',
  darkDescription: 'Eye-friendly dark interface, suitable for nighttime use',
  system: 'Follow System',
  systemDescription: 'Automatically switch, follow system settings',

  // 语言选项
  language: 'Language',
  languageDescription: 'Choose interface display language',
  english: 'English',
  simplifiedChinese: 'Simplified Chinese',
  languageFeatureInDevelopment: 'Note: Language switching feature is in development, coming soon',
  selectLanguage: 'Select Language',
  selectLanguageMessage: 'Choose your preferred language',
  languageChangeNote: 'Interface language will change immediately after selection',

  // 安全设置
  currentPassword: 'Current Password',
  newPassword: 'New Password',
  confirmPassword: 'Confirm New Password',
  verificationCode: 'Verification Code',
  sendVerificationCode: 'Send Verification Code',
  sendCode: 'Send Code',
  resendCode: 'Resend',
  resendTimer: 'Resend ({seconds}s)',
  backToModify: 'Back to modify',
  confirmModify: 'Confirm Modification',
  enterNewEmail: 'Enter new email',

  // 密码强度
  passwordStrengthWeak: 'Weak',
  passwordStrengthMedium: 'Medium',
  passwordStrengthStrong: 'Strong',
  passwordStrengthVeryStrong: 'Very Strong',

  // 操作按钮
  save: 'Save',
  saveChanges: 'Save Changes',
  saving: 'Saving...',
  applyChanges: 'Apply Changes',

  // 密码规则和提示
  passwordMinLength: 'Password must be at least {length} characters',
  passwordStrengthTips:
    '• Password length at least 6 characters\n• Recommended to include letters, numbers and special characters\n• Next step will send verification code to your email',
  verificationTips:
    "• Verification code is valid for 10 minutes\n• If you don't receive the code, please check spam folder\n• You need to log in again after changing password",

  // 用户名验证
  usernameMinLength: 'Username must be at least {min} characters (currently {current})',
  usernameOnlyAllowedChars: 'Username can only contain letters, numbers, underscores and hyphens',
  usernamePlaceholder: 'Please enter username ({min}-{max} characters)',

  // 密码输入提示
  enterCurrentPassword: 'Please enter current password',
  enterNewPassword: 'at least 6 characters',
  confirmNewPassword: 'Please enter new password again',
  enterVerificationCode: 'Please enter 6-digit verification code',

  // 成功和错误消息
  profileUpdateSuccess: 'Profile updated successfully',
  passwordChangeSuccess: 'Password changed successfully, please log in again',
  verificationCodeSent: 'Verification code sent to {email}',
  verificationCodeResent: 'Verification code resent',

  // 错误消息在 userTranslations 和 validationTranslations 中

  // 新增移动端设置项
  changePassword: 'Change Password',
  dataManagement: 'Data Management',

  // 补充缺失的keys
  selectThemeMode: 'Select Theme Mode',
  systemMode: 'System Mode',
  lightMode: 'Light Mode',
  darkMode: 'Dark Mode',
  databaseInfo: 'Database Info',
  storageType: 'Storage Type',
  databaseSize: 'Database Size',
  bufferZone: 'Buffer Zone',
  pendingWrites: '{{count}} pending writes',
  backToEdit: 'Back to Edit',
  confirmChanges: 'Confirm Changes',
  verificationCodeHints:
    "• Verification code is valid for 10 minutes\n• If you don't receive the code, please check spam folder\n• You need to log in again after changing password",
  passwordHints:
    '• Password length at least 6 characters\n• Recommended to include letters, numbers and special characters\n• Next step will send verification code to your email',
  status: 'Status',

  // 删除账户
  deleteAccount: 'Delete Account',
  deleteAccountTitle: 'Delete Account',
  deleteAccountWarning:
    'After deleting your account, all your data will be permanently erased. This action cannot be undone.',
  selectDeleteReason: 'Please select a reason for deleting your account',
  deleteReasonNotUseful: 'No longer need this product',
  deleteReasonFoundAlternative: 'Found a better alternative',
  deleteReasonTooExpensive: 'Too expensive',
  deleteReasonTooComplex: 'Too complex to use',
  deleteReasonBugsIssues: 'Too many bugs and issues',
  deleteReasonOther: 'Other reason',
  deleteFeedbackPlaceholder: 'Tell us more (optional, max 500 characters)',
  deleteConfirmationHint: 'Please enter your email to confirm',
  confirmDeleteAccount: 'Confirm Delete Account',
  deleting: 'Deleting...',
  deleteAccountSuccess: 'Account deleted successfully',
  deleteAccountError: 'Failed to delete account',

  // PC 重置设置
  resetSettings: 'Reset Settings',
  resetSettingsDescription:
    'Clear all configuration data and restore to initial state. Vault files will not be affected. Restart required.',
  resetSettingsConfirm:
    'Are you sure you want to reset settings?\n\nThis will delete all configuration data (Vault files will not be affected) and take effect after restart.',
  resetSettingsSuccess: 'Reset complete, please restart the app',
  resetSettingsFailed: 'Reset failed, please try again later',
  resetSettingsNotSupported: 'This operation is not supported in the current environment',
  resetButton: 'Reset',

  // 主题模式描述
  lightModeDescription: 'Best for bright environments',
  darkModeDescription: 'Best for nighttime or low-light environments',
  systemModeDescription: 'Automatically sync with OS',

  // ========== PC 设置导航 ==========
  // 导航标签
  account: 'Account',
  accountDescription: 'Login & Membership',
  generalDescription: 'Appearance & Preferences',
  providers: 'AI Providers',
  providersDescription: 'API Keys & Models',
  mcp: 'MCP',
  mcpDescription: 'Tool Extensions',
  cloudSync: 'Cloud Sync',
  cloudSyncDescription: 'Multi-device Sync',
  aboutDescription: 'Version Info',

  // ========== 模型配置 ==========
  defaultModelLabel: 'Default Model (Optional)',
  defaultModelFormatHint:
    "Format: provider_id/model_id. If empty, the first enabled provider's default model will be used.",
  defaultModelConfigDescription:
    'Please configure providers and models in "AI Providers" page, then set the global default model here.',

  // ========== AI 服务商 ==========
  // SDK 类型
  sdkTypeOpenAICompatible: 'OpenAI Compatible',

  // 服务商列表
  membershipModel: 'Membership Model',
  customProviderSection: 'Custom Providers',
  addCustomProvider: 'Add Custom Provider',

  // 服务商详情
  selectProviderPlaceholder: 'Please select a provider from the left',
  providerConfigLoading: 'Loading provider config...',
  documentation: 'Documentation',
  enterApiKey: 'Enter API Key',
  testButton: 'Test',
  testing: 'Testing...',
  baseUrlHint: 'Leave empty to use default endpoint',
  customProviderNameLabel: 'Provider Name',
  customProviderPlaceholder: 'Custom Provider',
  deleteProvider: 'Delete Provider',

  // 模型列表
  modelsSection: 'Models',
  modelsCount: '{{count}} models',
  searchModels: 'Search models...',
  noMatchingModels: 'No matching models found',
  enabledModels: 'Enabled Models',
  disabledModels: 'Disabled Models',
  noModelsConfigured: 'No models configured',
  addCustomModel: 'Add Custom Model',
  modelName: 'Model Name',
  modelId: 'Model ID',
  contextLength: 'Context Length',
  outputLength: 'Output Length',
  customBadge: 'Custom',
  reasoningBadge: 'Reasoning',
  multimodalBadge: 'Multimodal',
  toolsBadge: 'Tools',
  delete: 'Delete',
  configureModel: 'Configure Model',
  apiAddress: 'API Address',
  apiAddressOptional: 'API Address (Optional)',
  sdkType: 'SDK Type',

  // API 测试结果
  testSuccess: 'Connection successful',
  testFailed: 'Connection failed',

  // ========== MCP 配置 ==========
  mcpStdioSection: 'Stdio Servers',
  mcpHttpSection: 'HTTP Servers',
  mcpStdioEmpty: 'No stdio servers configured',
  mcpHttpEmpty: 'No HTTP servers configured',
  addStdioServer: 'Add Stdio Server',
  addHttpServer: 'Add HTTP Server',
  serverName: 'Name',
  serverCommand: 'Command',
  serverArgs: 'Arguments',
  serverCwd: 'Working Directory',
  serverUrl: 'URL',
  serverEnabled: 'Enabled',
  serverAutoApprove: 'Auto Approve',
  envVariables: 'Environment Variables',
  httpHeaders: 'HTTP Headers',
  addEnvVariable: 'Add Variable',
  addHeader: 'Add Header',

  // ========== 云同步 ==========
  cloudSyncTitle: 'Cloud Sync',
  cloudSyncSubtitle: 'Sync your notes across devices',
  cloudSyncNeedLogin: 'Login Required',
  cloudSyncNeedLoginDescription: 'Log in to your account to use cloud sync',
  cloudSyncNeedVault: 'Open a Vault First',
  cloudSyncNeedVaultDescription: 'Open a vault to configure cloud sync',
  cloudSyncEnabled: 'Cloud sync enabled',
  cloudSyncDisabled: 'Cloud sync disabled',
  cloudSyncEnableFailed: 'Failed to enable cloud sync, please try again',
  cloudSyncSyncing: 'Syncing...',
  cloudSyncSynced: 'Synced',
  cloudSyncFailed: 'Sync failed',
  cloudSyncNotEnabled: 'Not enabled',
  cloudSyncOffline: 'Offline',
  cloudSyncWorkspace: 'Workspace: {{name}}',
  cloudSyncPendingFiles: '{{count}} files pending sync',
  cloudSyncLastSync: 'Last: {{time}}',
  cloudSyncNeverSynced: 'Never synced',
  cloudSyncPaused: 'Cloud sync paused',
  cloudSyncTriggered: 'Sync triggered',
  operationFailed: 'Operation failed, please try again',
  syncSection: 'Sync',
  syncNow: 'Sync Now',
  enableCloudSync: 'Enable Cloud Sync',
  smartIndex: 'Smart Index',
  smartIndexDescription: 'Build semantic index for Markdown files to enable smart search',
  enableSmartIndex: 'Enable Smart Index',
  smartIndexAIDescription: 'Use AI for semantic search',
  indexedFiles: 'Indexed Files',
  usage: 'Usage',
  storageSpace: 'Storage',
  usedSpace: 'Used Space',
  percentUsedPlan: '{{percent}}% used · {{plan}} plan',
  currentPlan: 'Current plan: {{plan}} · Max file size {{size}}',
  deviceInfo: 'Device Info',
  deviceName: 'Device Name',
  deviceId: 'Device ID',
  filesCount: '{{count}} files',

  // ========== 关于页面 ==========
  versionInfo: 'Version Info',
  currentVersion: 'Current Version',
  unknown: 'Unknown',
  appVersion: 'Version',
  checkForUpdates: 'Check for Updates',
  changelog: 'Changelog',
  licenses: 'Open Source Licenses',
  termsOfService: 'Terms of Service',
  privacyPolicy: 'Privacy Policy',
  copyright: '© {{year}} Moryflow. All rights reserved.',

  // ========== MCP 预设描述 ==========
  mcpFetchWebContent: 'Fetch web content',
  mcpBraveSearch: 'Use Brave search engine',
  mcpLibraryDocs: 'Get latest library docs',
  mcpBrowserAutomation: 'Browser automation testing',
  mcpWebCrawl: 'Web crawling and data extraction',
  reconnectAll: 'Reconnect all servers',
  manageServer: 'Manage this server',
  envVariablesLabel: 'Environment Variables',
  httpHeadersLabel: 'Custom Headers',

  // ========== 模型输入类型 ==========
  modalityText: 'Text',
  modalityImage: 'Image',
  modalityAudio: 'Audio',
  modalityVideo: 'Video',

  // ========== 模型能力 ==========
  capabilityAttachment: 'Multimodal Input',
  capabilityAttachmentDesc: 'Supports images, files and attachments',
  capabilityReasoning: 'Reasoning Mode',
  capabilityReasoningDesc: 'Supports deep thinking/reasoning',
  capabilityTemperature: 'Temperature Control',
  capabilityTemperatureDesc: 'Adjust generation randomness',
  capabilityToolCall: 'Tool Calling',
  capabilityToolCallDesc: 'Supports Function Calling',

  // ========== 模型搜索和添加 ==========
  searchModelPlaceholder: 'Search models, e.g. gpt-4o, claude-3...',
  modelIdExample: 'e.g., gpt-4o-2024-11-20',
  modelNameExample: 'e.g., GPT-4o (2024-11)',
  ollamaModelExample: 'e.g., qwen2.5:7b',

  // ========== 购买 ==========
  createPaymentLinkFailed: 'Failed to create payment link, please try later',

  // ========== 支付弹窗 ==========
  completePayment: 'Complete Payment',
  paymentOpenedInBrowser: 'Payment page opened in browser, please complete payment there',
  waitingForPayment: 'Waiting for payment...',
  paymentSuccessWillRedirect: 'You will be redirected back after successful payment',
  reopenPaymentPage: 'Reopen payment page',

  // ========== 删除账户补充 ==========
  detailedFeedbackOptional: 'Detailed feedback (optional)',
  emailMismatch: 'Email mismatch',

  // ========== 订阅 ==========
  starterPlan: 'Starter',
  basicPlan: 'Basic',
  proPlan: 'Pro',
  loadProductsFailed: 'Failed to load products, please try again later',
  subscriptionSuccess: 'Subscription successful, benefits are now active',
  recommended: 'Recommended',
  perMonth: '/month',
  perYear: '/year',
  monthlyCredits: '{{credits}} credits/month',
  currentPlanBadge: 'Current Plan',
  subscribeNow: 'Subscribe Now',
  upgradeMembership: 'Upgrade Membership',
  choosePlanDescription: 'Choose the plan that works for you, unlock more features',
  monthly: 'Monthly',
  yearly: 'Yearly',
  savePercent: 'Save {{percent}}%',
  subscriptionNote: 'Save 2 months with yearly billing. Credits stay the same. Cancel anytime.',

  // ========== MCP 配置补充 ==========
  loadingConfig: 'Loading configuration...',

  // ========== Sandbox Settings ==========
  sandboxSettings: 'Sandbox',
  sandboxSettingsDescription: 'Control Agent file system access',
  sandboxMode: 'Sandbox Mode',
  sandboxModeNormal: 'Normal',
  sandboxModeNormalDescription: 'Agent can only access files within your Vault',
  sandboxModeUnrestricted: 'Unrestricted',
  sandboxModeUnrestrictedDescription: 'Agent can access all files on your system',
  sandboxAuthorizedPaths: 'Authorized Paths',
  sandboxAuthorizedPathsDescription: 'Paths that Agent has been granted access to',
  sandboxNoAuthorizedPaths: 'No authorized paths',
  sandboxRemovePath: 'Remove',
  sandboxClearAllPaths: 'Clear All',
  sandboxClearAllConfirm: 'Are you sure you want to clear all authorized paths?',
} as const;

export default en;
