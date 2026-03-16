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
    'Clear all configuration data and restore to initial state. Workspace files will not be affected. Restart required.',
  resetSettingsConfirm:
    'Are you sure you want to reset settings?\n\nThis will delete all configuration data (workspace files will not be affected) and take effect after restart.',
  resetSettingsSuccess: 'Reset complete, please restart the app',
  resetSettingsFailed: 'Reset failed, please try again later',
  resetSettingsNotSupported: 'This operation is not supported in the current environment',
  resetButton: 'Reset',

  // 主题模式描述
  lightModeDescription: 'Best for bright environments',
  darkModeDescription: 'Best for nighttime or low-light environments',
  systemModeDescription: 'Automatically sync with OS',
  closeBehavior: 'When Closing Window',
  closeBehaviorDescription: 'Choose what happens when you click the window close button.',
  closeBehaviorHide: 'Hide to menu bar',
  closeBehaviorHideDescription: 'Keep Moryflow running in the menu bar.',
  closeBehaviorQuit: 'Quit app',
  closeBehaviorQuitDescription: 'Completely quit Moryflow.',
  closeBehaviorUpdateFailed: 'Failed to update close behavior',
  launchAtLogin: 'Launch at Login',
  launchAtLoginDescription: 'Start Moryflow automatically when you sign in.',
  launchAtLoginUpdateFailed: 'Failed to update launch-at-login setting',
  runtimeSettingsLoadFailed: 'Failed to load app runtime settings',
  updateChannel: 'Update Channel',
  updateChannelDescription: 'Choose whether this device follows stable releases or beta previews.',
  updateChannelStable: 'Stable',
  updateChannelStableDescription: 'Recommended for daily use with fully released builds.',
  updateChannelBeta: 'Beta',
  updateChannelBetaDescription: 'Get preview builds earlier and expect occasional instability.',
  updateChannelUpdateFailed: 'Failed to update release channel',
  automaticUpdateChecks: 'Automatic Update Checks',
  automaticUpdateChecksDescription: 'Check for new versions in the background after startup.',
  autoCheckUpdateFailed: 'Failed to update automatic update checks',
  manualUpdatePolicyDescription:
    'Downloads and installation always require your confirmation. Moryflow will never force-install an update.',

  // ========== PC 设置导航 ==========
  // 导航标签
  account: 'Account',
  accountDescription: 'Login & Membership',
  generalDescription: 'Appearance & Preferences',
  personalization: 'Personalization',
  personalizationDescription: 'Custom Instructions',
  providers: 'AI Providers',
  providersDescription: 'API Keys & Models',
  mcp: 'MCP',
  mcpDescription: 'Tool Extensions',
  cloudSync: 'Cloud Sync',
  cloudSyncDescription: 'Multi-device Sync',
  telegram: 'Telegram',
  telegramDescription: 'Bot API Channel',
  aboutDescription: 'Version Info',

  // ========== 模型配置 ==========
  defaultModelLabel: 'Default Model (Optional)',
  defaultModelFormatHint:
    "Format: provider_id/model_id. If empty, the first enabled provider's default model will be used.",
  defaultModelConfigDescription:
    'Please configure providers and models in "AI Providers" page, then set the global default model here.',

  // ========== Personalization ==========
  customInstructionsLabel: 'Custom Instructions',
  customInstructionsHint:
    'Describe your preferred writing style, output format, and collaboration habits.',
  customInstructionsPlaceholder:
    'Example: Keep responses concise. Use English for UI copy and Chinese for technical explanations.',

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
  cloudSyncSubtitle: 'Optional file sync across devices. Memory works without it.',
  cloudSyncNeedLogin: 'Login Required',
  cloudSyncNeedLoginDescription: 'Log in to your account to use cloud sync',
  cloudSyncNeedVault: 'Open a Workspace First',
  cloudSyncNeedVaultDescription: 'Open a workspace to configure cloud sync',
  cloudSyncEnabled: 'Cloud sync enabled',
  cloudSyncDisabled: 'Cloud sync disabled',
  cloudSyncEnableFailed: 'Failed to enable cloud sync, please try again',
  cloudSyncSyncing: 'Syncing...',
  cloudSyncNeedsAttention: 'Needs attention',
  cloudSyncSynced: 'Synced',
  cloudSyncConflictCopyReady: 'Conflict copy ready',
  cloudSyncFailed: 'Sync failed',
  cloudSyncNotEnabled: 'Not enabled',
  cloudSyncOffline: 'Offline',
  cloudSyncUnavailable: 'Unavailable on mobile',
  cloudSyncRecoveryDescription: 'Resume sync to safely finish the last changes.',
  cloudSyncOfflineDescription: 'We could not reach the cloud. Try again when you are back online.',
  cloudSyncSetupDescription:
    'Enable sync if you want this workspace to stay in sync across devices.',
  cloudSyncMobileUnavailableDescription:
    'Cloud Sync is temporarily unavailable on mobile while the workspace-profile rewrite is being finalized. Use desktop to manage sync.',
  cloudSyncConflictCopyDescription: 'A conflict copy was kept so nothing was lost.',
  cloudSyncWorkspace: 'Workspace: {{name}}',
  cloudSyncPendingFiles: '{{count}} files pending sync',
  cloudSyncLastSync: 'Last: {{time}}',
  cloudSyncNeverSynced: 'Never synced',
  cloudSyncAvailableOnDesktop: 'Available on Desktop',
  cloudSyncPaused: 'Cloud sync paused',
  cloudSyncTriggered: 'Sync triggered',
  cloudSyncResumeRecovery: 'Resume Recovery',
  cloudSyncTryAgain: 'Try Again',
  cloudSyncOpenConflictCopy: 'Open Conflict Copy',
  cloudSyncOpenFirstConflictCopy: 'Open First Conflict Copy',
  syncSettings: 'Sync Settings',
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
  latestVersion: 'Latest Version',
  appUpdates: 'App Updates',
  lastCheckedAt: 'Last Checked',
  neverChecked: 'Never',
  upToDate: 'You are up to date',
  newVersionAvailable: 'New version available',
  updateDownloading: 'Downloading update',
  updateReadyToInstall: 'Ready to install',
  unknown: 'Unknown',
  appVersion: 'Version',
  checkForUpdates: 'Check for Updates',
  downloadUpdate: 'Download Update',
  restartToInstall: 'Restart to Install',
  skipThisVersion: 'Skip This Version',
  releaseNotes: 'Release Notes',
  downloadFromBrowser: 'Download in Browser',
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
  starterPlanTagline: 'For light personal use',
  basicPlanTagline: 'Best for growing creators',
  proPlanTagline: 'For power users and teams',
  loadProductsFailed: 'Failed to load products, please try again later',
  subscriptionSuccess: 'Subscription successful, benefits are now active',
  recommended: 'Recommended',
  perMonth: '/month',
  perYear: '/year',
  monthlyCredits: '{{credits}} credits/month',
  currentPlanBadge: 'Current Plan',
  currentPlanHelper: 'Your active plan',
  currentPlanCta: 'Included in your workspace',
  subscriptionSummaryEyebrow: 'Workspace plans',
  subscriptionSummaryTitle: 'Simple pricing for your workspace',
  subscriptionSummaryDescription: 'Choose a plan based on credits, sync, and support.',
  subscribeNow: 'Subscribe Now',
  upgradeMembership: 'Upgrade Membership',
  choosePlanDescription: 'Choose the plan that works for you, unlock more features',
  monthly: 'Monthly',
  yearly: 'Yearly',
  savePercent: 'Save {{percent}}%',
  annualBillingHighlight: '2 months free with annual billing',
  equivalentMonthly: 'Equivalent to ${{price}}/month',
  allPaidPlansInclude: 'All paid plans include',
  subscriptionNote: 'Save 2 months with yearly billing. Credits stay the same. Cancel anytime.',

  // ========== MCP 配置补充 ==========
  loadingConfig: 'Loading configuration...',

  // ========== Sandbox Settings ==========
  sandboxSettings: 'Sandbox',
  sandboxSettingsDescription: 'Control Agent file system access',
  sandboxMode: 'Sandbox Mode',
  sandboxModeNormal: 'Normal',
  sandboxModeNormalDescription: 'Agent can only access files within your workspace',
  sandboxModeUnrestricted: 'Unrestricted',
  sandboxModeUnrestrictedDescription: 'Agent can access all files on your system',
  sandboxAuthorizedPaths: 'Authorized Paths',
  sandboxAuthorizedPathsDescription: 'Paths outside your workspace that Agent is allowed to access',
  sandboxAddPath: 'Add Path',
  sandboxPathPlaceholder: '/absolute/path/to/folder',
  sandboxPathMustBeAbsolute: 'Please enter an absolute path',
  sandboxNoAuthorizedPaths: 'No authorized paths',
  sandboxRemovePath: 'Remove',
  sandboxClearAllPaths: 'Clear All',
  sandboxClearAllConfirm: 'Are you sure you want to clear all authorized paths?',

  // ========== Credit Packs ==========
  buyCredits: 'Buy Credits',
  creditPackPopular: 'Popular',
  creditPackCredits: '{{credits}} credits',
  creditPackBuyNow: 'Buy Now',
  creditPackExpiry: 'Credits expire 365 days after purchase.',
  creditPackUsageOrder: 'Usage order: daily free → subscription → purchased credits.',
  creditPackPaymentSuccess: 'Payment completed, credits added',

  // ========== Beta Notice ==========
  betaNoticePrefix: 'Purchasing is not available during beta. Join our ',
  betaNoticeLinkText: 'Discord',
  betaNoticeSuffix: ' for redemption codes!',
  community: 'Community',
  joinDiscord: 'Join Discord',
  communityDescription: 'Get support, share feedback, and connect with other users.',
} as const;

export default en;
